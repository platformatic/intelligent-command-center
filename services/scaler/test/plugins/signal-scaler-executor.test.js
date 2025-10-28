'use strict'

const { test } = require('node:test')
const { strict: assert } = require('node:assert')
const { buildServer } = require('../helper')
const { randomUUID } = require('crypto')

function createTestController (applicationId, replicas = 2) {
  const deploymentId = randomUUID()
  return {
    applicationId,
    deploymentId,
    k8SControllerId: 'test-controller-' + Date.now(),
    namespace: 'default',
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    replicas
  }
}

test('signal-scaler-executor should be registered correctly', async (t) => {
  const app = await buildServer(t)

  assert.ok(app.signalScalerExecutor, 'signalScalerExecutor should be decorated on app')
  assert.strictEqual(typeof app.signalScalerExecutor.processSignals, 'function')
  assert.strictEqual(typeof app.signalScalerExecutor.checkScalingForApplication, 'function')
  assert.strictEqual(typeof app.signalScalerExecutor.checkScalingForAllApplications, 'function')
  assert.strictEqual(typeof app.signalScalerExecutor.getCurrentPodCount, 'function')
  assert.strictEqual(typeof app.signalScalerExecutor.getScaleConfig, 'function')
  assert.strictEqual(typeof app.signalScalerExecutor.executeScaling, 'function')
})

test('getCurrentPodCount should return replica count', async (t) => {
  const app = await buildServer(t)

  const applicationId = randomUUID()
  const controllerData = createTestController(applicationId, 3)

  await app.platformatic.entities.controller.save({
    input: controllerData
  })

  const podCount = await app.signalScalerExecutor.getCurrentPodCount(applicationId)
  assert.strictEqual(podCount, 3)
})

test('getCurrentPodCount should throw error when no controller found', async (t) => {
  const app = await buildServer(t)

  await assert.rejects(
    async () => {
      await app.signalScalerExecutor.getCurrentPodCount(randomUUID())
    },
    /No controller found for application/
  )
})

test('getScaleConfig should return config when available', async (t) => {
  const app = await buildServer(t)

  const applicationId = randomUUID()
  await app.platformatic.entities.applicationScaleConfig.save({
    input: {
      applicationId,
      minPods: 2,
      maxPods: 8
    }
  })

  const config = await app.signalScalerExecutor.getScaleConfig(applicationId)
  assert.strictEqual(config.minPods, 2)
  assert.strictEqual(config.maxPods, 8)
})

test('getScaleConfig should return undefined when no config found', async (t) => {
  const app = await buildServer(t)

  const config = await app.signalScalerExecutor.getScaleConfig(randomUUID())
  assert.strictEqual(config.minPods, undefined)
  assert.strictEqual(config.maxPods, undefined)
})

test('processSignals should store signal event and make scaling decision', async (t) => {
  const app = await buildServer(t)

  // Mock as leader for this test
  app.isScalerLeader = () => true

  const applicationId = randomUUID()
  const serviceId = randomUUID()
  const podId = 'test-pod-1'
  const controllerData = createTestController(applicationId, 2)

  await app.platformatic.entities.controller.save({
    input: controllerData
  })

  const signals = [
    { type: 'cpu', value: 0.8, timestamp: Date.now(), description: 'CPU signal' },
    { type: 'memory', value: 0.7, timestamp: Date.now(), description: 'Memory signal' }
  ]

  const result = await app.signalScalerExecutor.processSignals({
    applicationId,
    serviceId,
    podId,
    signals,
    elu: 0.7,
    heapUsed: 111,
    heapTotal: 222
  })

  assert.ok(result.scalingDecision)
  assert.ok(typeof result.scalingDecision.nfinal === 'number')
  assert.ok(typeof result.scalingDecision.reason === 'string')

  const alerts = await app.platformatic.entities.alert.find({
    where: {
      applicationId: { eq: applicationId },
      podId: { eq: podId }
    }
  })

  assert.strictEqual(alerts.length, 1, 'Should create exactly one alert per batch')
  assert.strictEqual(alerts[0].applicationId, applicationId)
  assert.strictEqual(alerts[0].serviceId, serviceId)
  assert.strictEqual(alerts[0].podId, podId)
  assert.ok(alerts[0].signals, 'Alert should have signals')

  const storedSignals = typeof alerts[0].signals === 'string' ? JSON.parse(alerts[0].signals) : alerts[0].signals
  assert.strictEqual(storedSignals.length, 2, 'Alert should contain all signals from the batch')
  assert.ok(storedSignals.some(s => s.type === 'cpu'), 'Should contain cpu signal')
  assert.ok(storedSignals.some(s => s.type === 'memory'), 'Should contain memory signal')
})

test('check Scaling For Application should handle errors gracefully', async (t) => {
  const app = await buildServer(t)

  const result = await app.signalScalerExecutor.checkScalingForApplication(randomUUID())

  assert.strictEqual(result.success, false)
  assert.ok(result.error)
})

test('checkScalingForAllApplications should return success', async (t) => {
  const app = await buildServer(t)

  const result = await app.signalScalerExecutor.checkScalingForAllApplications()

  assert.ok(result.success)
  assert.ok(Array.isArray(result.results))
})

test('concurrent processSignals should queue algorithm execution', async (t) => {
  const app = await buildServer(t)

  // Mock as leader for this test
  app.isScalerLeader = () => true

  const applicationId = randomUUID()
  const serviceId = randomUUID()
  const podId = 'test-pod-1'
  const controllerData = createTestController(applicationId, 2)

  await app.platformatic.entities.controller.save({
    input: controllerData
  })

  const signals1 = [
    { type: 'cpu', value: 0.8, timestamp: Date.now() }
  ]

  const signals2 = [
    { type: 'cpu', value: 0.9, timestamp: Date.now() + 1000 }
  ]

  const results = await Promise.all([
    app.signalScalerExecutor.processSignals({
      applicationId,
      serviceId,
      podId,
      signals: signals1,
      elu: 0.7,
      heapUsed: 111,
      heapTotal: 222
    }),
    app.signalScalerExecutor.processSignals({
      applicationId,
      serviceId,
      podId,
      signals: signals2,
      elu: 0.8,
      heapUsed: 121,
      heapTotal: 222
    })
  ])

  assert.ok(results[0].scalingDecision || results[1].scalingDecision, 'At least one should have scaling decision')

  const alerts = await app.platformatic.entities.alert.find({
    where: {
      applicationId: { eq: applicationId }
    }
  })

  assert.strictEqual(alerts.length, 2, 'Should create two alerts for two batches')
})

test('runScalingAlgorithm should not run concurrently for same application', async (t) => {
  const app = await buildServer(t)

  const applicationId = randomUUID()
  const controllerData = createTestController(applicationId, 2)

  await app.platformatic.entities.controller.save({
    input: controllerData
  })

  // Acquire the lock manually to simulate another process holding it
  const lockKey = `reactive:lock:${applicationId}`
  await app.store.valkey.set(lockKey, 'test-lock', 'EX', 60)

  const result = await app.signalScalerExecutor.runScalingAlgorithm(applicationId)

  assert.strictEqual(result, null, 'Should return null when lock is already held')

  // Clean up the lock
  await app.store.valkey.del(lockKey)
})

test('runScalingAlgorithm uses atomic locking correctly', async (t) => {
  const app = await buildServer(t)

  const applicationId = randomUUID()
  const podId = 'test-pod-1'
  const controllerData = createTestController(applicationId, 2)

  await app.platformatic.entities.controller.save({
    input: controllerData
  })

  await app.signalScalerExecutor.algorithm.storeSignalEvent(
    applicationId,
    podId,
    { cpu: 0.5 },
    Date.now()
  )

  let algorithmCallCount = 0
  const originalCalculateScalingDecision = app.signalScalerExecutor.algorithm.calculateScalingDecision.bind(app.signalScalerExecutor.algorithm)

  app.signalScalerExecutor.algorithm.calculateScalingDecision = async (...args) => {
    algorithmCallCount++
    return originalCalculateScalingDecision(...args)
  }

  // Run algorithm twice concurrently
  const [result1, result2] = await Promise.all([
    app.signalScalerExecutor.runScalingAlgorithm(applicationId),
    app.signalScalerExecutor.runScalingAlgorithm(applicationId)
  ])

  // One should acquire lock and succeed, one should return null and set pending flag
  const successCount = [result1, result2].filter(r => r !== null).length
  assert.strictEqual(successCount, 1, 'Only one concurrent call should successfully acquire the lock')

  // The lock holder should reprocess when it sees the pending flag set by the second call
  assert.ok(algorithmCallCount >= 1, 'Algorithm should be called at least once')
  assert.ok(algorithmCallCount <= 2, 'Algorithm should reprocess at most once when pending flag is set')
})
