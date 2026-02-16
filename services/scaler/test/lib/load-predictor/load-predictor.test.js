'use strict'

const assert = require('node:assert')
const { test } = require('node:test')
const { LoadPredictor } = require('../../../lib/load-predictor/index')
const { AlgorithmStore } = require('../../../lib/load-predictor/store')
const { valkeyConnectionString, cleanValkeyData } = require('../../helper')

const valkeyUrl = new URL(valkeyConnectionString)
const valkeyConfig = { host: valkeyUrl.hostname, port: parseInt(valkeyUrl.port), keyPrefix: 'scaler:' }

const globalConfig = {
  reconnectTimeoutMs: 5000,
  horizontalTrendThreshold: 0.2,
  pendingScaleUpExpiryMs: 60000,
  initTimeout: {
    windowSize: 5,
    stepRate: 0.1,
    upFactor: 1.5,
    downFactor: 1.0
  }
}

function makeDefaultAppConfig () {
  return {
    pods: { min: 1, max: 12 },
    horizonMultiplier: 1.2,
    processingInitTimeoutMs: 10,
    processingCooldownMs: 100,
    instancesWindowMs: 180000,
    initTimeoutMs: 20000,
    cooldowns: {
      scaleUpAfterScaleUpMs: 3000,
      scaleUpAfterScaleDownMs: 3000,
      scaleDownAfterScaleUpMs: 30000,
      scaleDownAfterScaleDownMs: 10000
    },
    elu: {
      windowMs: 60000,
      sampleInterval: 1000,
      redistributionMs: 30000,
      alphaUp: 0.2,
      alphaDown: 0.1,
      betaUp: 0.2,
      betaDown: 0.1,
      threshold: 0.75
    },
    heap: {
      windowMs: 60000,
      sampleInterval: 1000,
      redistributionMs: 30000,
      alphaUp: 0.2,
      alphaDown: 0.1,
      betaUp: 0.2,
      betaDown: 0.1,
      threshold: 250
    }
  }
}

function createApi (initialTarget = 1, appConfig = null) {
  const calls = []
  const targets = new Map()
  return {
    calls,
    scale (appId, targetPodsCount) {
      calls.push({ appId, targetPodsCount })
      targets.set(appId, targetPodsCount)
    },
    async getCurrentPodsTarget (appId) {
      return targets.get(appId) ?? initialTarget
    },
    async getApplicationConfig (appId) {
      return appConfig ?? makeDefaultAppConfig()
    }
  }
}

function waitForCalls (api, count, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const check = () => {
      if (api.calls.length >= count) {
        resolve([...api.calls])
        return
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error(
          `Expected ${count} scale calls but got ${api.calls.length} within ${timeoutMs}ms`
        ))
        return
      }
      setTimeout(check, 50)
    }
    check()
  })
}

function makeSamples (count, eluValue, heapValue, eluThreshold = 0.75, heapThreshold = 250, workerId = 'worker-0') {
  const now = Date.now()
  const base = Math.floor(now / 1000) * 1000
  const eluTuples = []
  const heapTuples = []
  for (let i = count; i >= 1; i--) {
    const timestamp = base - i * 1000
    eluTuples.push([timestamp, eluValue])
    heapTuples.push([timestamp, heapValue])
  }
  return {
    elu: {
      options: { threshold: eluThreshold },
      workers: { [workerId]: { values: eluTuples } }
    },
    heap: {
      options: { threshold: heapThreshold },
      workers: { [workerId]: { values: heapTuples } }
    }
  }
}

test('LoadPredictor', async (t) => {
  const verifyStore = new AlgorithmStore(valkeyConfig)

  t.beforeEach(async () => {
    await cleanValkeyData()
  })

  t.after(async () => {
    await cleanValkeyData()
    await verifyStore.close()
  })

  await t.test('initialize clears configs', async () => {
    const api = createApi()
    const predictor = new LoadPredictor(globalConfig, makeDefaultAppConfig(), api, valkeyConfig)
    try {
      // Set some config first
      await verifyStore.setAppConfig('app-1', { pods: { min: 3, max: 10 } })

      await predictor.initialize()

      // Config should be cleared
      assert.strictEqual(await verifyStore.getAppConfig('app-1'), null)

      // targetPodsCount and initTimeout are lazily initialized, not set by initialize
      assert.strictEqual(await verifyStore.getTargetPodsCount('app-1'), null)
      assert.strictEqual(await verifyStore.getInitTimeout('app-1'), null)
    } finally {
      await predictor.close()
    }
  })

  await t.test('initialize preserves targetPodsCount and initTimeout', async () => {
    const api = createApi()
    const predictor = new LoadPredictor(globalConfig, makeDefaultAppConfig(), api, valkeyConfig)
    try {
      await verifyStore.setTargetPodsCount('app-1', 5)
      await verifyStore.setInitTimeout('app-1', 15000)

      await predictor.initialize()

      // Both are preserved - they are not cleared by initialize
      assert.strictEqual(await verifyStore.getTargetPodsCount('app-1'), 5)
      assert.strictEqual(await verifyStore.getInitTimeout('app-1'), 15000)
    } finally {
      await predictor.close()
    }
  })

  await t.test('onConnect registers instances scoped per app', async () => {
    const api = createApi()
    const predictor = new LoadPredictor(globalConfig, makeDefaultAppConfig(), api, valkeyConfig)
    try {
      await predictor.initialize()
      await predictor.initialize()

      await predictor.onConnect('app-1', 'img-v1', 'pod-a1', 'inst-a1', 1000)
      await predictor.onConnect('app-2', 'img-v1', 'pod-b1', 'inst-b1', 2000)

      const inst1 = await verifyStore.getInstance('app-1', 'inst-a1')
      const inst2 = await verifyStore.getInstance('app-2', 'inst-b1')

      assert.ok(inst1)
      assert.strictEqual(inst1.podId, 'pod-a1')
      assert.strictEqual(inst1.startTime, 1000)

      assert.ok(inst2)
      assert.strictEqual(inst2.podId, 'pod-b1')
      assert.strictEqual(inst2.startTime, 2000)

      // Cross-app isolation
      assert.strictEqual(await verifyStore.getInstance('app-1', 'inst-b1'), null)
      assert.strictEqual(await verifyStore.getInstance('app-2', 'inst-a1'), null)
    } finally {
      await predictor.close()
    }
  })

  await t.test('onDisconnect terminates only the target app instance', async () => {
    const api = createApi()
    const predictor = new LoadPredictor(globalConfig, makeDefaultAppConfig(), api, valkeyConfig)
    try {
      await predictor.onConnect('app-1', 'img-v1', 'pod-a1', 'inst-a1', 1000)
      await predictor.onConnect('app-2', 'img-v1', 'pod-b1', 'inst-b1', 2000)

      await predictor.onDisconnect('app-1', 'inst-a1', 5000)

      const inst1 = await verifyStore.getInstance('app-1', 'inst-a1')
      const inst2 = await verifyStore.getInstance('app-2', 'inst-b1')

      assert.strictEqual(inst1.endTime, 5000 + globalConfig.reconnectTimeoutMs)
      assert.strictEqual(inst2.endTime, 0)
    } finally {
      await predictor.close()
    }
  })

  await t.test('saveInstanceMetrics registers services per app', async () => {
    const api = createApi()
    const predictor = new LoadPredictor(globalConfig, makeDefaultAppConfig(), api, valkeyConfig)
    try {
      await predictor.initialize()
      await predictor.onConnect('app-1', 'img-v1', 'pod-1', 'inst-1', Date.now() - 60000)

      const samples = makeSamples(3, 0.5, 100)
      await predictor.saveInstanceMetrics({
        applicationId: 'app-1',
        podId: 'pod-1',
        instanceId: 'inst-1',
        imageId: 'img-v1',
        services: {
          'svc-a': samples,
          'svc-b': samples
        },
        batchStartedAt: Date.now()
      })

      const services = await verifyStore.getServices('app-1', 'img-v1')
      assert.ok(services.includes('svc-a'))
      assert.ok(services.includes('svc-b'))
      assert.strictEqual(services.length, 2)

      // app-2 should have no services
      const services2 = await verifyStore.getServices('app-2', 'img-v1')
      assert.strictEqual(services2.length, 0)
    } finally {
      await predictor.close()
    }
  })

  await t.test('updateApplicationConfig stores config in Valkey', async () => {
    const api = createApi()
    const predictor = new LoadPredictor(globalConfig, makeDefaultAppConfig(), api, valkeyConfig)
    try {
      await predictor.initialize()
      await predictor.updateApplicationConfig('app-1', {
        pods: { min: 2, max: 8 }
      })

      const config = await verifyStore.getAppConfig('app-1')
      assert.deepStrictEqual(config.pods, { min: 2, max: 8 })
      assert.strictEqual(config.horizonMultiplier, 1.2)

      // app-2 should have no config
      const config2 = await verifyStore.getAppConfig('app-2')
      assert.strictEqual(config2, null)
    } finally {
      await predictor.close()
    }
  })

  await t.test('updateServiceConfig stores per-service overrides', async () => {
    const api = createApi()
    const predictor = new LoadPredictor(globalConfig, makeDefaultAppConfig(), api, valkeyConfig)
    try {
      await predictor.updateServiceConfig('app-1', 'svc-a', {
        elu: { threshold: 0.85 }
      })

      const config = await verifyStore.getServiceConfig('app-1', 'svc-a')
      assert.deepStrictEqual(config, { elu: { threshold: 0.85 } })

      // Other service should have no override
      const config2 = await verifyStore.getServiceConfig('app-1', 'svc-b')
      assert.strictEqual(config2, null)
    } finally {
      await predictor.close()
    }
  })

  await t.test('multi-service pipeline takes max target across services', async () => {
    const api = createApi()
    const predictor = new LoadPredictor(globalConfig, makeDefaultAppConfig(), api, valkeyConfig)
    try {
      await predictor.initialize()

      const now = Date.now()
      await predictor.onConnect('app-1', 'img-v1', 'pod-1', 'inst-1', now - 60000)

      // svc-high: ELU 0.9 (above threshold 0.75) should trigger scale-up
      // svc-low: ELU 0.2 (below threshold) should not trigger scale-up
      const highLoadSamples = makeSamples(5, 0.9, 100)
      const lowLoadSamples = makeSamples(5, 0.2, 50)

      await predictor.saveInstanceMetrics({
        applicationId: 'app-1',
        podId: 'pod-1',
        instanceId: 'inst-1',
        imageId: 'img-v1',
        services: {
          'svc-high': highLoadSamples,
          'svc-low': lowLoadSamples
        },
        batchStartedAt: Date.now()
      })
      await predictor.checkScaling('app-1')

      const calls = await waitForCalls(api, 1)
      assert.strictEqual(calls[0].appId, 'app-1')
      assert.ok(
        calls[0].targetPodsCount > 1,
        `Expected target > 1 but got ${calls[0].targetPodsCount}`
      )
    } finally {
      await predictor.close()
    }
  })

  await t.test('multi-app pipeline processes apps independently', async () => {
    const api = createApi()
    const predictor = new LoadPredictor(globalConfig, makeDefaultAppConfig(), api, valkeyConfig)
    try {
      await predictor.initialize()
      await predictor.initialize()

      const now = Date.now()
      await predictor.onConnect('app-1', 'img-v1', 'pod-a1', 'inst-a1', now - 60000)
      await predictor.onConnect('app-2', 'img-v1', 'pod-b1', 'inst-b1', now - 60000)

      // app-1: high ELU -> should scale up
      const highLoadSamples = makeSamples(5, 0.9, 100)
      // app-2: low ELU -> should stay at 1
      const lowLoadSamples = makeSamples(5, 0.2, 50)

      await predictor.saveInstanceMetrics({
        applicationId: 'app-1',
        podId: 'pod-a1',
        instanceId: 'inst-a1',
        imageId: 'img-v1',
        services: { 'svc-1': highLoadSamples },
        batchStartedAt: Date.now()
      })
      await predictor.checkScaling('app-1')

      await predictor.saveInstanceMetrics({
        applicationId: 'app-2',
        podId: 'pod-b1',
        instanceId: 'inst-b1',
        imageId: 'img-v1',
        services: { 'svc-1': lowLoadSamples },
        batchStartedAt: Date.now()
      })
      await predictor.checkScaling('app-2')

      // Wait for app-1 scale call
      const calls = await waitForCalls(api, 1)
      assert.strictEqual(calls[0].appId, 'app-1')
      assert.ok(calls[0].targetPodsCount > 1)

      // Wait for app-2 pipeline to finish
      await new Promise(resolve => setTimeout(resolve, 500))

      // app-2 target should remain at 1 (no scale call)
      assert.strictEqual(await verifyStore.getTargetPodsCount('app-2'), 1)
      assert.strictEqual(api.calls.length, 1, 'Only app-1 should have triggered a scale call')
    } finally {
      await predictor.close()
    }
  })

  await t.test('per-app cooldown timers are independent', async () => {
    const api = createApi()
    const predictor = new LoadPredictor(globalConfig, makeDefaultAppConfig(), api, valkeyConfig)
    try {
      await predictor.initialize()
      await predictor.initialize()

      const now = Date.now()
      await predictor.onConnect('app-1', 'img-v1', 'pod-a1', 'inst-a1', now - 60000)
      await predictor.onConnect('app-2', 'img-v1', 'pod-b1', 'inst-b1', now - 60000)

      // Both apps have high ELU -> both should scale up independently
      const highLoadSamples1 = makeSamples(5, 0.9, 100)
      const highLoadSamples2 = makeSamples(5, 0.9, 100)

      await predictor.saveInstanceMetrics({
        applicationId: 'app-1',
        podId: 'pod-a1',
        instanceId: 'inst-a1',
        imageId: 'img-v1',
        services: { 'svc-1': highLoadSamples1 },
        batchStartedAt: Date.now()
      })
      await predictor.checkScaling('app-1')

      await predictor.saveInstanceMetrics({
        applicationId: 'app-2',
        podId: 'pod-b1',
        instanceId: 'inst-b1',
        imageId: 'img-v1',
        services: { 'svc-1': highLoadSamples2 },
        batchStartedAt: Date.now()
      })
      await predictor.checkScaling('app-2')

      // Both apps should trigger scale calls
      const calls = await waitForCalls(api, 2)
      const app1Call = calls.find(c => c.appId === 'app-1')
      const app2Call = calls.find(c => c.appId === 'app-2')

      assert.ok(app1Call, 'app-1 should have triggered a scale call')
      assert.ok(app2Call, 'app-2 should have triggered a scale call')
      assert.ok(app1Call.targetPodsCount > 1)
      assert.ok(app2Call.targetPodsCount > 1)
    } finally {
      await predictor.close()
    }
  })
})
