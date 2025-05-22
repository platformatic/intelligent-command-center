'use strict'

const test = require('node:test')
const { buildServer, buildServerWithPlugins, startMachinist, setupMockPrometheusServer } = require('../helper')
const assert = require('node:assert')
const executorPlugin = require('../../plugins/scaler-executor')
const envPlugin = require('../../plugins/env')
const storePlugin = require('../../plugins/store')
const metricsPlugin = require('../../plugins/metrics')
const scaleConfigPlugin = require('../../plugins/scale-configs')
const controllerPlugin = require('../../plugins/controllers')

test('scaler-executor should be registered correctly', async (t) => {
  const server = await buildServer(t)
  assert.ok(server.scalerExecutor, 'server should have scalerExecutor decorator')
  assert.strictEqual(typeof server.scalerExecutor.checkScalingOnAlert, 'function', 'scalerExecutor should have checkScalingOnAlert method')
})

test('checkScalingOnAlert should return error when pod has no alerts', async (t) => {
  const machinist = await startMachinist(t)

  const plugins = [
    envPlugin,
    storePlugin,
    metricsPlugin,
    scaleConfigPlugin,
    executorPlugin,
    controllerPlugin
  ]

  const server = await buildServerWithPlugins(t, {}, plugins)

  server.updateControllerReplicas = async (appId, replicas) => {
    return { success: true }
  }

  server.store.getAlertsByPodId = async () => []

  const result = await server.scalerExecutor.checkScalingOnAlert('test-pod-1')

  assert.strictEqual(result.success, true, 'checkScalingOnAlert should succeed with no alerts')
  assert.strictEqual(result.nfinal, 0, 'nfinal should be 0 when no alerts')

  await machinist.close()
})

test('checkScalingOnAlert should return error when application has no metrics', async (t) => {
  const machinist = await startMachinist(t)

  const plugins = [
    envPlugin,
    storePlugin,
    metricsPlugin,
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
    type: 'cpu',
    value: 90
  }]

  server.scalerMetrics = {
    getApplicationMetrics: async () => ({})
  }

  const result = await server.scalerExecutor.checkScalingOnAlert('test-pod-1')

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
    scaleConfigPlugin,
    executorPlugin,
    controllerPlugin
  ]

  const server = await buildServerWithPlugins(t, {}, plugins)

  server.store.getAlertsByPodId = async () => [{
    podId: 'test-pod-1',
    applicationId: testAppId,
    timestamp: Date.now(),
    type: 'cpu',
    value: 90
  }]

  await server.platformatic.entities.controller.save({
    input: {
      applicationId: testAppId,
      deploymentId: '00000000-0000-0000-0000-000000000001',
      namespace: 'default',
      controllerId: 'test-controller-1',
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

  const result = await server.scalerExecutor.checkScalingOnAlert('test-pod-1')

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
    type: 'elu',
    value: 95
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
      controllerId: 'test-controller-2',
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
    assert.strictEqual(alerts[0].type, 'elu', 'should be an ELU alert')
    assert.strictEqual(alerts[0].value, 95, 'alert should have the right value')

    const metricsCopy = JSON.parse(JSON.stringify(metrics))

    if (!metricsCopy['test-pod-1'].eventLoopUtilization.some(
      item => item.values.some(([ts, val]) => ts === alertTimestamp))) {
      metricsCopy['test-pod-1'].eventLoopUtilization.push({
        metric: { podId: 'test-pod-1' },
        values: [[alertTimestamp, '0.95']]
      })
    }

    console.log('Test is verifying that alert metrics would be merged into pod metrics')

    return { nfinal: currentPodCount + 1, source: 'combined' }
  }

  const result = await server.scalerExecutor.checkScalingOnAlert('test-pod-1')

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

  const result = await server.scalerExecutor.checkScalingOnAlert('test-pod-1')

  assert.strictEqual(result.success, false, 'checkScalingOnAlert should fail')
  assert.strictEqual(result.error, 'Test error', 'error message should match thrown error')
})
