'use strict'

const assert = require('node:assert')
const { test } = require('node:test')
const {
  getApplicationConfig,
  getServiceConfig,
  saveApplicationConfig,
  saveServiceConfig
} = require('../../../lib/load-predictor/configs')

function createMockStore (appConfigs = {}, serviceConfigs = {}) {
  const calls = {
    getAppConfig: [],
    getServiceConfig: [],
    setAppConfig: [],
    setServiceConfig: []
  }

  return {
    calls,
    async getAppConfig (appId) {
      calls.getAppConfig.push({ appId })
      return appConfigs[appId] || null
    },
    async getServiceConfig (appId, serviceId) {
      calls.getServiceConfig.push({ appId, serviceId })
      const key = `${appId}:${serviceId}`
      return serviceConfigs[key] || null
    },
    async setAppConfig (appId, config) {
      calls.setAppConfig.push({ appId, config })
      appConfigs[appId] = config
    },
    async setServiceConfig (appId, serviceId, config) {
      calls.setServiceConfig.push({ appId, serviceId, config })
      const key = `${appId}:${serviceId}`
      serviceConfigs[key] = config
    }
  }
}

const defaultAppConfig = {
  pods: { min: 1, max: 12 },
  horizonMultiplier: 1.2,
  processingInitTimeoutMs: 100,
  processingCooldownMs: 10000,
  instancesWindowMs: 180000,
  minInitTimeoutMs: 10000,
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

test('getApplicationConfig', async (t) => {
  await t.test('should return null when nothing stored', async () => {
    const store = createMockStore()

    const result = await getApplicationConfig(store, 'no-config-app')

    assert.strictEqual(result, null)
    assert.strictEqual(store.calls.getAppConfig.length, 1)
    assert.strictEqual(store.calls.getAppConfig[0].appId, 'no-config-app')
  })

  await t.test('should return stored config directly', async () => {
    const storedConfig = { ...defaultAppConfig, horizonMultiplier: 2.0 }
    const store = createMockStore({ 'app-1': storedConfig })

    const result = await getApplicationConfig(store, 'app-1')

    assert.strictEqual(result, storedConfig)
    assert.strictEqual(result.horizonMultiplier, 2.0)
  })

  await t.test('should resolve independently per app', async () => {
    const configA = { ...defaultAppConfig, horizonMultiplier: 3.0 }
    const configB = { ...defaultAppConfig, horizonMultiplier: 0.5 }
    const store = createMockStore({ 'app-a': configA, 'app-b': configB })

    const resultA = await getApplicationConfig(store, 'app-a')
    const resultB = await getApplicationConfig(store, 'app-b')

    assert.strictEqual(resultA.horizonMultiplier, 3.0)
    assert.strictEqual(resultB.horizonMultiplier, 0.5)
  })
})

test('getServiceConfig', async (t) => {
  await t.test('should return appConfig when no override exists', async () => {
    const store = createMockStore()

    const result = await getServiceConfig(store, 'svc-app', 'svc-1', defaultAppConfig)

    assert.strictEqual(result, defaultAppConfig)
    assert.strictEqual(store.calls.getServiceConfig.length, 1)
    assert.deepStrictEqual(store.calls.getServiceConfig[0], { appId: 'svc-app', serviceId: 'svc-1' })
  })

  await t.test('should merge elu override', async () => {
    const store = createMockStore({}, {
      'svc-app:svc-1': { elu: { threshold: 0.85 } }
    })

    const result = await getServiceConfig(store, 'svc-app', 'svc-1', defaultAppConfig)

    assert.strictEqual(result.elu.threshold, 0.85)
    assert.strictEqual(result.elu.windowMs, defaultAppConfig.elu.windowMs)
    assert.deepStrictEqual(result.heap, defaultAppConfig.heap)
  })

  await t.test('should merge heap override', async () => {
    const store = createMockStore({}, {
      'heap-app:svc-1': { heap: { threshold: 300 } }
    })

    const result = await getServiceConfig(store, 'heap-app', 'svc-1', defaultAppConfig)

    assert.strictEqual(result.heap.threshold, 300)
    assert.strictEqual(result.heap.windowMs, defaultAppConfig.heap.windowMs)
    assert.deepStrictEqual(result.elu, defaultAppConfig.elu)
  })

  await t.test('should merge both elu and heap overrides', async () => {
    const store = createMockStore({}, {
      'both-app:svc-1': {
        elu: { alphaUp: 0.5 },
        heap: { alphaDown: 0.3 }
      }
    })

    const result = await getServiceConfig(store, 'both-app', 'svc-1', defaultAppConfig)

    assert.strictEqual(result.elu.alphaUp, 0.5)
    assert.strictEqual(result.elu.alphaDown, defaultAppConfig.elu.alphaDown)
    assert.strictEqual(result.heap.alphaDown, 0.3)
    assert.strictEqual(result.heap.alphaUp, defaultAppConfig.heap.alphaUp)
  })

  await t.test('should not mutate appConfig', async () => {
    const store = createMockStore({}, {
      'no-mutate:svc-1': { elu: { threshold: 0.9 } }
    })

    const originalElu = { ...defaultAppConfig.elu }
    await getServiceConfig(store, 'no-mutate', 'svc-1', defaultAppConfig)

    assert.deepStrictEqual(defaultAppConfig.elu, originalElu)
  })

  await t.test('should resolve independently per service', async () => {
    const store = createMockStore({}, {
      'multi-svc:svc-a': { elu: { threshold: 0.6 } },
      'multi-svc:svc-b': { elu: { threshold: 0.9 } }
    })

    const resultA = await getServiceConfig(store, 'multi-svc', 'svc-a', defaultAppConfig)
    const resultB = await getServiceConfig(store, 'multi-svc', 'svc-b', defaultAppConfig)

    assert.strictEqual(resultA.elu.threshold, 0.6)
    assert.strictEqual(resultB.elu.threshold, 0.9)
  })
})

test('saveApplicationConfig', async (t) => {
  await t.test('should store merged config', async () => {
    const store = createMockStore({ 'app-1': { ...defaultAppConfig } })
    const override = { pods: { min: 2, max: 8 } }

    await saveApplicationConfig(store, 'app-1', override)

    assert.strictEqual(store.calls.setAppConfig.length, 1)
    assert.strictEqual(store.calls.setAppConfig[0].appId, 'app-1')
    assert.deepStrictEqual(store.calls.setAppConfig[0].config.pods, { min: 2, max: 8 })
    assert.strictEqual(store.calls.setAppConfig[0].config.horizonMultiplier, defaultAppConfig.horizonMultiplier)
  })

  await t.test('should be retrievable via getApplicationConfig', async () => {
    const store = createMockStore({ 'app-1': { ...defaultAppConfig } })

    await saveApplicationConfig(store, 'app-1', { horizonMultiplier: 2.5 })
    const result = await getApplicationConfig(store, 'app-1')

    assert.strictEqual(result.horizonMultiplier, 2.5)
    assert.deepStrictEqual(result.pods, defaultAppConfig.pods)
  })

  await t.test('should merge on top of previously saved config', async () => {
    const store = createMockStore({ 'app-1': { ...defaultAppConfig } })

    await saveApplicationConfig(store, 'app-1', { horizonMultiplier: 2.5 })
    await saveApplicationConfig(store, 'app-1', { pods: { min: 3, max: 6 } })

    const result = await getApplicationConfig(store, 'app-1')
    assert.strictEqual(result.horizonMultiplier, 2.5)
    assert.deepStrictEqual(result.pods, { min: 3, max: 6 })
  })

  await t.test('should save independently per app', async () => {
    const store = createMockStore({
      'app-a': { ...defaultAppConfig },
      'app-b': { ...defaultAppConfig }
    })

    await saveApplicationConfig(store, 'app-a', { horizonMultiplier: 3.0 })
    await saveApplicationConfig(store, 'app-b', { horizonMultiplier: 0.5 })

    const resultA = await getApplicationConfig(store, 'app-a')
    const resultB = await getApplicationConfig(store, 'app-b')
    assert.strictEqual(resultA.horizonMultiplier, 3.0)
    assert.strictEqual(resultB.horizonMultiplier, 0.5)
  })
})

test('saveServiceConfig', async (t) => {
  await t.test('should delegate to store.setServiceConfig', async () => {
    const store = createMockStore()
    const config = { elu: { threshold: 0.85 } }

    await saveServiceConfig(store, 'app-1', 'svc-1', config)

    assert.strictEqual(store.calls.setServiceConfig.length, 1)
    assert.strictEqual(store.calls.setServiceConfig[0].appId, 'app-1')
    assert.strictEqual(store.calls.setServiceConfig[0].serviceId, 'svc-1')
    assert.deepStrictEqual(store.calls.setServiceConfig[0].config, config)
  })

  await t.test('should be retrievable via getServiceConfig', async () => {
    const store = createMockStore()
    const config = { elu: { threshold: 0.9 } }

    await saveServiceConfig(store, 'app-1', 'svc-1', config)
    const result = await getServiceConfig(store, 'app-1', 'svc-1', defaultAppConfig)

    assert.strictEqual(result.elu.threshold, 0.9)
  })

  await t.test('should save independently per service', async () => {
    const store = createMockStore()

    await saveServiceConfig(store, 'app-1', 'svc-a', { elu: { alphaUp: 0.5 } })
    await saveServiceConfig(store, 'app-1', 'svc-b', { heap: { alphaDown: 0.3 } })

    assert.strictEqual(store.calls.setServiceConfig.length, 2)
    assert.strictEqual(store.calls.setServiceConfig[0].serviceId, 'svc-a')
    assert.strictEqual(store.calls.setServiceConfig[1].serviceId, 'svc-b')
  })
})
