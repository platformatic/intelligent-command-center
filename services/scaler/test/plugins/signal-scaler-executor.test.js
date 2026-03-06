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

function createMetricsSamples (count, eluValue, heapValue, eluThreshold = 0.75, heapThreshold = 250, workerId = 'worker-0') {
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
      options: { threshold: heapThreshold, heapTotal: 512 },
      workers: { [workerId]: { values: heapTuples } }
    }
  }
}

test('signal-scaler-executor should be registered correctly', async (t) => {
  const app = await buildServer(t, { PLT_SCALER_ALGORITHM_VERSION: 'v2' })

  assert.ok(app.signalScalerExecutor, 'signalScalerExecutor should be decorated on app')
  assert.strictEqual(typeof app.signalScalerExecutor.processSignals, 'function')
  assert.strictEqual(typeof app.signalScalerExecutor.checkScalingOnSignals, 'function')
  assert.strictEqual(typeof app.signalScalerExecutor.getScaleConfig, 'function')
  assert.strictEqual(typeof app.signalScalerExecutor.executeScaling, 'function')
  assert.strictEqual(typeof app.signalScalerExecutor.initialize, 'function')
  assert.strictEqual(typeof app.signalScalerExecutor.onConnect, 'function')
  assert.strictEqual(typeof app.signalScalerExecutor.onDisconnect, 'function')
  assert.ok(app.signalScalerExecutor.predictor, 'predictor should be available')
})

test('getScaleConfig should return config when available', async (t) => {
  const app = await buildServer(t, { PLT_SCALER_ALGORITHM_VERSION: 'v2' })

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
  const app = await buildServer(t, { PLT_SCALER_ALGORITHM_VERSION: 'v2' })

  const config = await app.signalScalerExecutor.getScaleConfig(randomUUID())
  assert.strictEqual(config.minPods, undefined)
  assert.strictEqual(config.maxPods, undefined)
})

test('initialize should set up application state', async (t) => {
  const app = await buildServer(t, { PLT_SCALER_ALGORITHM_VERSION: 'v2' })

  const applicationId = randomUUID()
  const controllerData = createTestController(applicationId, 2)

  await app.platformatic.entities.controller.save({
    input: controllerData
  })

  // Initialize should not throw
  await app.signalScalerExecutor.initialize()

  // Can initialize multiple times without error
  await app.signalScalerExecutor.initialize()
})

test('onConnect and onDisconnect should manage instance lifecycle', async (t) => {
  const app = await buildServer(t, { PLT_SCALER_ALGORITHM_VERSION: 'v2' })

  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const podId = 'test-pod-1'
  const runtimeId = randomUUID()
  const timestamp = Date.now()

  const controllerData = createTestController(applicationId, 2)
  controllerData.deploymentId = deploymentId

  await app.platformatic.entities.controller.save({
    input: controllerData
  })

  const controllerId = controllerData.k8SControllerId

  // onConnect should not throw
  await app.signalScalerExecutor.onConnect(applicationId, controllerId, deploymentId, podId, runtimeId, timestamp)

  // onDisconnect should not throw
  await app.signalScalerExecutor.onDisconnect(applicationId, controllerId, runtimeId, timestamp + 1000)
})

test('processSignals should store metrics and return alerts', async (t) => {
  const app = await buildServer(t, { PLT_SCALER_ALGORITHM_VERSION: 'v2' })

  // Mock as leader for this test
  app.isScalerLeader = () => true

  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const podId = 'test-pod-1'
  const runtimeId = randomUUID()
  const controllerData = createTestController(applicationId, 2)
  controllerData.deploymentId = deploymentId

  await app.platformatic.entities.controller.save({
    input: controllerData
  })

  await app.signalScalerExecutor.initialize()
  await app.signalScalerExecutor.onConnect(applicationId, controllerData.k8SControllerId, deploymentId, podId, runtimeId, Date.now() - 60000)

  // Create metrics samples with high ELU to trigger alert
  const serviceId = 'test-service'
  const samples = createMetricsSamples(5, 0.9, 100) // ELU 0.9 > threshold 0.75

  const signals = {
    [serviceId]: samples
  }

  const result = await app.signalScalerExecutor.processSignals({
    applicationId,
    controllerId: controllerData.k8SControllerId,
    podId,
    runtimeId,
    deploymentId,
    signals,
    batchStartedAt: Date.now()
  })

  assert.ok(Array.isArray(result.alerts), 'Should return alerts array')
  assert.ok(result.alerts.find(a => a.serviceId === serviceId), 'Should have alert for service with high ELU')

  // Verify alert was created in database
  const alerts = await app.platformatic.entities.alert.find({
    where: {
      applicationId: { eq: applicationId },
      podId: { eq: podId }
    }
  })

  assert.strictEqual(alerts.length, 1, 'Should create exactly one alert')
  assert.strictEqual(alerts[0].applicationId, applicationId)
  assert.strictEqual(alerts[0].serviceId, serviceId)
  assert.strictEqual(alerts[0].podId, podId)
})

test('processSignals should not create alerts when metrics are below threshold', async (t) => {
  const app = await buildServer(t, { PLT_SCALER_ALGORITHM_VERSION: 'v2' })

  // Mock as leader for this test
  app.isScalerLeader = () => true

  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const podId = 'test-pod-1'
  const runtimeId = randomUUID()
  const controllerData = createTestController(applicationId, 2)
  controllerData.deploymentId = deploymentId

  await app.platformatic.entities.controller.save({
    input: controllerData
  })

  await app.signalScalerExecutor.initialize()
  await app.signalScalerExecutor.onConnect(applicationId, controllerData.k8SControllerId, deploymentId, podId, runtimeId, Date.now() - 60000)

  // Create metrics samples with low ELU (below threshold)
  const serviceId = 'test-service'
  const samples = createMetricsSamples(5, 0.3, 50) // ELU 0.3 < threshold 0.75

  const signals = {
    [serviceId]: samples
  }

  const result = await app.signalScalerExecutor.processSignals({
    applicationId,
    controllerId: controllerData.k8SControllerId,
    podId,
    runtimeId,
    deploymentId,
    signals,
    batchStartedAt: Date.now()
  })

  assert.ok(Array.isArray(result.alerts), 'Should return alerts array')
  assert.deepStrictEqual(result.alerts, [], 'Should have no alerts for low metrics')

  // Verify no alert was created in database
  const alerts = await app.platformatic.entities.alert.find({
    where: {
      applicationId: { eq: applicationId },
      podId: { eq: podId }
    }
  })

  assert.strictEqual(alerts.length, 0, 'Should not create any alerts')
})

test('checkScalingOnSignals should handle errors gracefully', async (t) => {
  const app = await buildServer(t, { PLT_SCALER_ALGORITHM_VERSION: 'v2' })

  // checkScalingOnSignals for unknown app should not throw but handle gracefully
  const result = await app.signalScalerExecutor.checkScalingOnSignals({ applicationId: randomUUID(), controllerId: 'test-controller' })

  assert.ok(result.success, 'Should return success')
  assert.ok(result.timestamp, 'Should have timestamp')
})

test('processSignals should handle multiple services', async (t) => {
  const app = await buildServer(t, { PLT_SCALER_ALGORITHM_VERSION: 'v2' })

  // Mock as leader for this test
  app.isScalerLeader = () => true

  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const podId = 'test-pod-1'
  const runtimeId = randomUUID()
  const controllerData = createTestController(applicationId, 2)
  controllerData.deploymentId = deploymentId

  await app.platformatic.entities.controller.save({
    input: controllerData
  })

  await app.signalScalerExecutor.initialize()
  await app.signalScalerExecutor.onConnect(applicationId, controllerData.k8SControllerId, deploymentId, podId, runtimeId, Date.now() - 60000)

  // Create metrics for multiple services
  const signals = {
    'service-1': createMetricsSamples(5, 0.9, 100), // High ELU
    'service-2': createMetricsSamples(5, 0.3, 50), // Low ELU
    'service-3': createMetricsSamples(5, 0.85, 80) // High ELU
  }

  const result = await app.signalScalerExecutor.processSignals({
    applicationId,
    controllerId: controllerData.k8SControllerId,
    podId,
    runtimeId,
    deploymentId,
    signals,
    batchStartedAt: Date.now()
  })

  assert.ok(Array.isArray(result.alerts), 'Should return alerts array')
  assert.ok(result.alerts.find(a => a.serviceId === 'service-1'), 'Should have alert for service-1 (high ELU)')
  assert.strictEqual(result.alerts.find(a => a.serviceId === 'service-2'), undefined, 'Should not have alert for service-2 (low ELU)')
  assert.ok(result.alerts.find(a => a.serviceId === 'service-3'), 'Should have alert for service-3 (high ELU)')

  // Verify alerts were created in database
  const alerts = await app.platformatic.entities.alert.find({
    where: {
      applicationId: { eq: applicationId },
      podId: { eq: podId }
    }
  })

  assert.strictEqual(alerts.length, 2, 'Should create alerts for high ELU services only')
})

test('concurrent processSignals calls should be handled correctly', async (t) => {
  const app = await buildServer(t, { PLT_SCALER_ALGORITHM_VERSION: 'v2' })

  // Mock as leader for this test
  app.isScalerLeader = () => true

  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const podId = 'test-pod-1'
  const runtimeId = randomUUID()
  const controllerData = createTestController(applicationId, 2)
  controllerData.deploymentId = deploymentId

  await app.platformatic.entities.controller.save({
    input: controllerData
  })

  await app.signalScalerExecutor.initialize()
  await app.signalScalerExecutor.onConnect(applicationId, controllerData.k8SControllerId, deploymentId, podId, runtimeId, Date.now() - 60000)

  // Create two different metric batches
  const signals1 = {
    'service-1': createMetricsSamples(5, 0.9, 100)
  }

  const signals2 = {
    'service-2': createMetricsSamples(5, 0.85, 90)
  }

  // Run concurrently
  const results = await Promise.all([
    app.signalScalerExecutor.processSignals({
      applicationId,
      controllerId: controllerData.k8SControllerId,
      podId,
      runtimeId,
      deploymentId,
      signals: signals1,
      batchStartedAt: Date.now()
    }),
    app.signalScalerExecutor.processSignals({
      applicationId,
      controllerId: controllerData.k8SControllerId,
      podId,
      runtimeId,
      deploymentId,
      signals: signals2,
      batchStartedAt: Date.now()
    })
  ])

  // Both should complete without error
  assert.ok(results[0].alerts, 'First call should return alerts')
  assert.ok(results[1].alerts, 'Second call should return alerts')

  // Both services should have triggered alerts
  const alerts = await app.platformatic.entities.alert.find({
    where: {
      applicationId: { eq: applicationId }
    }
  })

  assert.strictEqual(alerts.length, 2, 'Should create alerts from both concurrent calls')
})

test('processSignals should not scale when controller has scalingDisabled', async (t) => {
  const app = await buildServer(t, { PLT_SCALER_ALGORITHM_VERSION: 'v2' })

  app.isScalerLeader = () => true

  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const podId = 'test-pod-1'
  const runtimeId = randomUUID()
  const controllerData = createTestController(applicationId, 2)
  controllerData.deploymentId = deploymentId
  controllerData.scalingDisabled = true

  await app.platformatic.entities.controller.save({
    input: controllerData
  })

  await app.signalScalerExecutor.initialize()
  await app.signalScalerExecutor.onConnect(applicationId, controllerData.k8SControllerId, deploymentId, podId, runtimeId, Date.now() - 60000)

  const signals = {
    'service-1': createMetricsSamples(5, 0.9, 100)
  }

  await app.signalScalerExecutor.processSignals({
    applicationId,
    controllerId: controllerData.k8SControllerId,
    podId,
    runtimeId,
    deploymentId,
    signals,
    batchStartedAt: Date.now()
  })

  // Verify no scale events were created — scaling is disabled
  const scaleEvents = await app.platformatic.entities.scaleEvent.find({
    where: { applicationId: { eq: applicationId } }
  })
  assert.strictEqual(scaleEvents.length, 0)
})

test('non-leader should not trigger scaling but should forward to leader', async (t) => {
  const app = await buildServer(t, { PLT_SCALER_ALGORITHM_VERSION: 'v2' })

  // Mock as non-leader
  app.isScalerLeader = () => false
  let notifyScalerCalled = false
  app.notifySignalScaler = async (appId, ctrlId) => {
    notifyScalerCalled = true
    assert.ok(appId, 'Should pass applicationId to notifySignalScaler')
  }

  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const podId = 'test-pod-1'
  const runtimeId = randomUUID()
  const controllerData = createTestController(applicationId, 2)
  controllerData.deploymentId = deploymentId

  await app.platformatic.entities.controller.save({
    input: controllerData
  })

  await app.signalScalerExecutor.initialize()
  await app.signalScalerExecutor.onConnect(applicationId, controllerData.k8SControllerId, deploymentId, podId, runtimeId, Date.now() - 60000)

  const signals = {
    'service-1': createMetricsSamples(5, 0.9, 100)
  }

  const result = await app.signalScalerExecutor.processSignals({
    applicationId,
    controllerId: controllerData.k8SControllerId,
    podId,
    runtimeId,
    deploymentId,
    signals,
    batchStartedAt: Date.now()
  })

  assert.ok(result.alerts, 'Should still return alerts')
  assert.ok(notifyScalerCalled, 'Should call notifySignalScaler when not leader')
})
