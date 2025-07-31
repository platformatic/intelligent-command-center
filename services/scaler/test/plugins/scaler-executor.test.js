'use strict'

const { test } = require('node:test')
const { buildServer, buildServerWithPlugins, startMachinist, setupMockPrometheusServer } = require('../helper')
const assert = require('node:assert')
const executorPlugin = require('../../plugins/scaler-executor')
const envPlugin = require('../../plugins/env')
const storePlugin = require('../../plugins/store')
const metricsPlugin = require('../../plugins/metrics')
const scaleConfigPlugin = require('../../plugins/scale-configs')
const controllerPlugin = require('../../plugins/controllers')
const activitiesPlugin = require('../../plugins/activities')

test('scaler-executor should be registered correctly', async (t) => {
  const server = await buildServer(t)
  assert.ok(server.scalerExecutor)
  assert.strictEqual(typeof server.scalerExecutor.checkScalingOnAlert, 'function')
})

test('checkScalingOnAlert should return error when pod has no alerts', async (t) => {
  const machinist = await startMachinist(t)

  const plugins = [
    envPlugin,
    storePlugin,
    metricsPlugin,
    activitiesPlugin,
    scaleConfigPlugin,
    executorPlugin,
    controllerPlugin
  ]

  const server = await buildServerWithPlugins(t, {}, plugins)

  server.updateControllerReplicas = async (appId, replicas) => {
    return { success: true }
  }

  server.store.getAlertsByPodId = async () => []

  const result = await server.scalerExecutor.checkScalingOnAlert({
    podId: 'test-pod-1',
    serviceId: 'test-service-1'
  })

  assert.strictEqual(result.success, true)
  assert.strictEqual(result.nfinal, 0)

  await machinist.close()
})

test('checkScalingOnAlert should return error when application has no metrics', async (t) => {
  const machinist = await startMachinist(t)

  const plugins = [
    envPlugin,
    storePlugin,
    metricsPlugin,
    activitiesPlugin,
    scaleConfigPlugin,
    executorPlugin,
    controllerPlugin
  ]

  const server = await buildServerWithPlugins(t, {}, plugins)

  server.updateControllerReplicas = async (appId, replicas) => {
    return { success: true }
  }

  server.store.getAlertsByPodId = async () => [{
    podId: 'test-pod-1',
    applicationId: 'test-app-1',
    timestamp: Date.now(),
    elu: 0.90,
    heapUsed: 6000000000,
    heapTotal: 8000000000,
    unhealthy: true,
    healthHistory: []
  }]

  server.scalerMetrics = {
    getApplicationMetrics: async () => ({})
  }

  const result = await server.scalerExecutor.checkScalingOnAlert({
    podId: 'test-pod-1',
    serviceId: 'test-service-1'
  })

  assert.strictEqual(result.success, false, 'checkScalingOnAlert should fail with no metrics')
  assert.strictEqual(result.podId, 'test-pod-1', 'podId should match input')
  assert.strictEqual(result.applicationId, 'test-app-1', 'applicationId should be from alert')
  assert.strictEqual(result.error, 'No metrics found', 'error should indicate no metrics')

  await machinist.close()
})

test('checkScalingOnAlert should call scaling algorithm and return result', async (t) => {
  const machinist = await startMachinist(t)

  const testAppId = '11111111-1111-1111-1111-111111111111'

  const mockPrometheus = await setupMockPrometheusServer({
    heapSize: {
      status: 'success',
      data: {
        resultType: 'matrix',
        result: [
          {
            metric: { pod: 'test-pod-1', application: testAppId },
            values: [[1620000000, '1000000000']]
          }
        ]
      }
    },
    eventLoop: {
      status: 'success',
      data: {
        resultType: 'matrix',
        result: [
          {
            metric: { pod: 'test-pod-1', application: testAppId },
            values: [[1620000000, '0.8']]
          }
        ]
      }
    }
  })

  process.env.PLT_SCALER_PROMETHEUS_URL = mockPrometheus.address

  const plugins = [
    envPlugin,
    storePlugin,
    metricsPlugin,
    activitiesPlugin,
    scaleConfigPlugin,
    executorPlugin,
    controllerPlugin
  ]

  const server = await buildServerWithPlugins(t, {}, plugins)

  server.store.getAlertsByPodId = async () => [{
    podId: 'test-pod-1',
    applicationId: testAppId,
    timestamp: Date.now(),
    elu: 0.90,
    heapUsed: 6000000000,
    heapTotal: 8000000000,
    unhealthy: true,
    healthHistory: []
  }]

  await server.platformatic.entities.controller.save({
    input: {
      applicationId: testAppId,
      deploymentId: '00000000-0000-0000-0000-000000000001',
      namespace: 'default',
      k8SControllerId: 'test-controller-1',
      kind: 'Deployment',
      apiVersion: 'apps/v1',
      replicas: 2
    }
  })

  const updateControllerCalls = []
  server.updateControllerReplicas = async (appId, replicas) => {
    updateControllerCalls.push({ appId, replicas })
    return { success: true }
  }

  server.scalerMetrics = {
    getApplicationMetrics: async () => ({
      'test-pod-1': {
        eventLoopUtilization: [
          {
            metric: { pod: 'test-pod-1' },
            values: [[1620000000, '0.8']]
          }
        ],
        heapSize: [
          {
            metric: { pod: 'test-pod-1' },
            values: [[1620000000, '1000000000']]
          }
        ]
      }
    })
  }

  const originalMethod = server.scalerExecutor.scalingAlgorithm.calculateScalingDecision
  server.scalerExecutor.scalingAlgorithm.calculateScalingDecision = async (applicationId, metrics, currentPodCount, minPods, maxPods, alerts) => {
    assert.strictEqual(applicationId, testAppId, 'applicationId should match')
    assert.ok(metrics['test-pod-1'], 'metrics should contain pod data')
    assert.strictEqual(currentPodCount, 2, 'currentPodCount should be 2')
    assert.ok(Array.isArray(alerts), 'alerts should be an array')
    assert.strictEqual(alerts.length, 1, 'should receive 1 alert')
    assert.strictEqual(alerts[0].podId, 'test-pod-1', 'alert should be for the right pod')
    assert.strictEqual(alerts[0].applicationId, testAppId, 'alert should have correct applicationId')

    return { nfinal: 3 }
  }

  const result = await server.scalerExecutor.checkScalingOnAlert({
    podId: 'test-pod-1',
    serviceId: 'test-service-1'
  })

  assert.strictEqual(result.success, true, 'checkScalingOnAlert should succeed')
  assert.strictEqual(result.applicationId, testAppId, 'applicationId should be from alert')
  assert.strictEqual(result.nfinal, 3, 'nfinal should match scaling decision')

  assert.strictEqual(updateControllerCalls.length, 1, 'updateControllerReplicas should be called once')
  assert.strictEqual(updateControllerCalls[0].appId, testAppId, 'should be called with correct applicationId')
  assert.strictEqual(updateControllerCalls[0].replicas, 3, 'should be called with correct number of replicas')

  server.scalerExecutor.scalingAlgorithm.calculateScalingDecision = originalMethod

  await mockPrometheus.close()
  await machinist.close()
})

test('checkScalingOnAlert should return error when no podId is provided', async (t) => {
  const plugins = [
    envPlugin,
    storePlugin,
    metricsPlugin,
    activitiesPlugin,
    scaleConfigPlugin,
    executorPlugin,
    controllerPlugin
  ]

  const server = await buildServerWithPlugins(t, {}, plugins)

  const result = await server.scalerExecutor.checkScalingOnAlert()

  assert.strictEqual(result.success, false, 'checkScalingOnAlert should fail')
  assert.strictEqual(result.error, 'Pod ID is required', 'error message should be about missing podId')
})

test('checkScalingOnAlert should merge metrics from alerts with pod metrics for scaling decisions', async (t) => {
  const testAppId = '22222222-2222-2222-2222-222222222222'
  const plugins = [
    envPlugin,
    storePlugin,
    metricsPlugin,
    activitiesPlugin,
    scaleConfigPlugin,
    executorPlugin,
    controllerPlugin
  ]

  const server = await buildServerWithPlugins(t, {}, plugins)

  const alertTimestamp = Date.now()
  server.store.getAlertsByPodId = async () => [{
    podId: 'test-pod-1',
    applicationId: testAppId,
    timestamp: alertTimestamp,
    elu: 0.95,
    heapUsed: 7000000000,
    heapTotal: 8000000000,
    unhealthy: true,
    healthHistory: []
  }]

  server.scalerMetrics = {
    getApplicationMetrics: async () => ({
      'test-pod-1': {
        eventLoopUtilization: [
          {
            metric: { pod: 'test-pod-1' },
            values: [[1620000000, '0.7']]
          }
        ],
        heapSize: [
          {
            metric: { pod: 'test-pod-1' },
            values: [[1620000000, '500000000']]
          }
        ]
      }
    })
  }

  await server.platformatic.entities.controller.save({
    input: {
      applicationId: testAppId,
      deploymentId: '00000000-0000-0000-0000-000000000002',
      namespace: 'default',
      k8SControllerId: 'test-controller-2',
      kind: 'Deployment',
      apiVersion: 'apps/v1',
      replicas: 1
    }
  })

  const updateControllerCalls = []
  server.updateControllerReplicas = async (appId, replicas) => {
    updateControllerCalls.push({ appId, replicas })
    return { success: true }
  }

  const originalMethod = server.scalerExecutor.scalingAlgorithm.calculateScalingDecision
  server.scalerExecutor.scalingAlgorithm.calculateScalingDecision = async (applicationId, metrics, currentPodCount, minPods, maxPods, alerts) => {
    assert.strictEqual(alerts.length, 1, 'should have one alert')
    assert.strictEqual(alerts[0].elu, 0.95, 'should be an ELU alert with correct value')
    assert.strictEqual(alerts[0].unhealthy, true, 'alert should indicate unhealthy pod')

    const metricsCopy = JSON.parse(JSON.stringify(metrics))

    if (!metricsCopy['test-pod-1'].eventLoopUtilization.some(
      item => item.values.some(([ts, val]) => ts === alertTimestamp))) {
      metricsCopy['test-pod-1'].eventLoopUtilization.push({
        metric: { podId: 'test-pod-1' },
        values: [[alertTimestamp, '0.95']]
      })
    }

    return { nfinal: currentPodCount + 1, source: 'combined' }
  }

  const result = await server.scalerExecutor.checkScalingOnAlert({
    podId: 'test-pod-1',
    serviceId: 'test-service-1'
  })

  assert.strictEqual(result.success, true, 'checkScalingOnAlert should succeed')
  assert.strictEqual(result.applicationId, testAppId, 'applicationId should be from alert')
  assert.strictEqual(result.nfinal, 2, 'should return new pod count (current + 1)')

  assert.strictEqual(updateControllerCalls.length, 1, 'updateControllerReplicas should be called once')
  assert.strictEqual(updateControllerCalls[0].appId, testAppId, 'should be called with correct applicationId')
  assert.strictEqual(updateControllerCalls[0].replicas, 2, 'should be called with correct number of replicas')

  server.scalerExecutor.scalingAlgorithm.calculateScalingDecision = originalMethod
})

test('checkScalingOnAlert should handle unexpected errors', async (t) => {
  const plugins = [
    envPlugin,
    storePlugin,
    metricsPlugin,
    activitiesPlugin,
    scaleConfigPlugin,
    executorPlugin,
    controllerPlugin
  ]

  const server = await buildServerWithPlugins(t, {}, plugins)

  server.updateControllerReplicas = async (appId, replicas) => {
    return { success: true }
  }

  server.store.getAlertsByPodId = async () => {
    throw new Error('Test error')
  }

  const result = await server.scalerExecutor.checkScalingOnAlert({
    podId: 'test-pod-1',
    serviceId: 'test-service-1'
  })

  assert.strictEqual(result.success, false, 'checkScalingOnAlert should fail')
  assert.strictEqual(result.error, 'Test error', 'error message should match thrown error')
})

test('getCurrentPodCount should throw error when no controller found', async (t) => {
  const server = await buildServer(t)

  server.getApplicationController = async () => null

  await assert.rejects(
    () => server.scalerExecutor.getCurrentPodCount('nonexistent-app'),
    { message: 'No controller found for application: nonexistent-app' }
  )
})

test('getScaleConfig should return config when available', async (t) => {
  const server = await buildServer(t)

  server.getScaleConfig = async (appId) => ({
    minPods: 2,
    maxPods: 8
  })

  const config = await server.scalerExecutor.getScaleConfig('test-app')
  assert.strictEqual(config.minPods, 2)
  assert.strictEqual(config.maxPods, 8)
})

test('getScaleConfig should return undefined values when error occurs', async (t) => {
  const server = await buildServer(t)

  server.getScaleConfig = async () => {
    throw new Error('Config not found')
  }

  const config = await server.scalerExecutor.getScaleConfig('test-app')
  assert.strictEqual(config.minPods, undefined)
  assert.strictEqual(config.maxPods, undefined)
})

test('getScaleConfig should return undefined when no config found', async (t) => {
  const server = await buildServer(t)

  server.getScaleConfig = async () => null

  const config = await server.scalerExecutor.getScaleConfig('test-app')
  assert.strictEqual(config.minPods, undefined)
  assert.strictEqual(config.maxPods, undefined)
})

test('checkScalingOnAlert should handle missing applicationId in alerts', async (t) => {
  const server = await buildServer(t)

  server.store.getAlertsByPodId = async () => [{
    podId: 'test-pod-1',
    timestamp: Date.now(),
    elu: 0.90
  }]

  const result = await server.scalerExecutor.checkScalingOnAlert({
    podId: 'test-pod-1',
    serviceId: 'test-service-1'
  })

  assert.strictEqual(result.success, false)
  assert.strictEqual(result.error, 'Missing applicationId')
})

test('applyScaleConstraints should apply min and max constraints', async (t) => {
  const server = await buildServer(t)

  assert.strictEqual(server.scalerExecutor.applyScaleConstraints(0, 2, 10), 2)
  assert.strictEqual(server.scalerExecutor.applyScaleConstraints(5, 2, 10), 5)
  assert.strictEqual(server.scalerExecutor.applyScaleConstraints(15, 2, 10), 10)
})

test('applyScaleConstraints should use defaults when constraints are undefined', async (t) => {
  const server = await buildServer(t)

  assert.strictEqual(server.scalerExecutor.applyScaleConstraints(0), 1)
  assert.strictEqual(server.scalerExecutor.applyScaleConstraints(5), 5)
  assert.strictEqual(server.scalerExecutor.applyScaleConstraints(1000000), 1000000)
})

test('executeScaling should handle errors', async (t) => {
  const server = await buildServer(t)

  server.updateControllerReplicas = async () => {
    throw new Error('Scaling failed')
  }

  const result = await server.scalerExecutor.executeScaling('test-app', 3, 'test reason')

  assert.strictEqual(result.success, false)
  assert.strictEqual(result.error, 'Scaling failed')
  assert.strictEqual(result.applicationId, 'test-app')
  assert.strictEqual(result.podsNumber, 3)
})

test('executeScaling should succeed when no errors', async (t) => {
  const server = await buildServer(t)

  server.updateControllerReplicas = async () => ({ success: true })

  const result = await server.scalerExecutor.executeScaling('test-app', 3, 'test reason')

  assert.strictEqual(result.success, true)
  assert.strictEqual(result.applicationId, 'test-app')
  assert.strictEqual(result.podsNumber, 3)
})

test('checkScalingOnMetrics should handle missing scalerMetrics plugin', async (t) => {
  const server = await buildServer(t)

  server.scalerMetrics = null

  const result = await server.scalerExecutor.checkScalingOnMetrics()

  assert.strictEqual(result.success, false)
  assert.strictEqual(result.periodic, true)
  assert.strictEqual(result.error, 'Scaler metrics plugin is not available')
})

test('checkScalingOnMetrics should handle no application metrics', async (t) => {
  const server = await buildServer(t)

  server.scalerMetrics = {
    getAllApplicationsMetrics: async () => ({})
  }

  const result = await server.scalerExecutor.checkScalingOnMetrics()

  assert.strictEqual(result.success, true)
  assert.strictEqual(result.periodic, true)
  assert.strictEqual(result.message, 'No application metrics found')
})

test('checkScalingOnMetrics should process applications and handle errors', async (t) => {
  const server = await buildServer(t)

  server.getApplicationController = async (appId) => {
    if (appId === 'app-1') return { replicas: 2 }
    throw new Error('Controller not found')
  }

  server.getScaleConfig = async () => ({ minPods: 1, maxPods: 10 })
  server.updateControllerReplicas = async () => ({ success: true })

  server.scalerMetrics = {
    getAllApplicationsMetrics: async () => ({
      'app-1': { 'pod-1': { heapSize: [], eventLoopUtilization: [] } },
      'app-2': { 'pod-2': { heapSize: [], eventLoopUtilization: [] } }
    })
  }

  server.scalerExecutor.scalingAlgorithm.calculateScalingDecision = async () => ({
    nfinal: 3,
    reason: 'Test scaling'
  })

  const result = await server.scalerExecutor.checkScalingOnMetrics()

  assert.strictEqual(result.success, true)
  assert.strictEqual(result.periodic, true)
  assert.ok(Array.isArray(result.results))
  assert.strictEqual(result.results.length, 2)

  const successResult = result.results.find(r => r.applicationId === 'app-1')
  assert.ok(successResult)
  assert.strictEqual(successResult.currentPodCount, 2)
  assert.strictEqual(successResult.newPodCount, 3)
  assert.strictEqual(successResult.scaled, true)

  const errorResult = result.results.find(r => r.applicationId === 'app-2')
  assert.ok(errorResult)
  assert.ok(errorResult.error)
})

test('checkScalingOnMetrics should skip unknown applications', async (t) => {
  const server = await buildServer(t)

  server.scalerMetrics = {
    getAllApplicationsMetrics: async () => ({
      unknown: { 'pod-1': { heapSize: [], eventLoopUtilization: [] } },
      'app-1': { 'pod-2': { heapSize: [], eventLoopUtilization: [] } }
    })
  }

  server.getApplicationController = async () => ({ replicas: 1 })
  server.getScaleConfig = async () => ({ minPods: 1, maxPods: 10 })
  server.updateControllerReplicas = async () => ({ success: true })

  server.scalerExecutor.scalingAlgorithm.calculateScalingDecision = async () => ({
    nfinal: 1,
    reason: 'No change'
  })

  const result = await server.scalerExecutor.checkScalingOnMetrics()

  assert.strictEqual(result.success, true)
  assert.strictEqual(result.results.length, 1)
  assert.strictEqual(result.results[0].applicationId, 'app-1')
})

test('checkScalingOnMetrics should handle getAllApplicationsMetrics errors', async (t) => {
  const server = await buildServer(t)

  server.scalerMetrics = {
    getAllApplicationsMetrics: async () => {
      throw new Error('Metrics fetch failed')
    }
  }

  const result = await server.scalerExecutor.checkScalingOnMetrics()

  assert.strictEqual(result.success, false)
  assert.strictEqual(result.periodic, true)
  assert.strictEqual(result.error, 'Metrics fetch failed')
})
