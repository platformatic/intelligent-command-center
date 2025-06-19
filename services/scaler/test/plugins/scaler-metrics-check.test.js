'use strict'

const { test } = require('node:test')
const { buildServerWithPlugins, startMachinist, setupMockPrometheusServer } = require('../helper')
const assert = require('node:assert')
const executorPlugin = require('../../plugins/scaler-executor')
const envPlugin = require('../../plugins/env')
const storePlugin = require('../../plugins/store')
const metricsPlugin = require('../../plugins/metrics')
const scaleConfigPlugin = require('../../plugins/scale-configs')
const controllerPlugin = require('../../plugins/controllers')
const activitiesPlugin = require('../../plugins/activities')

test('checkScalingOnMetrics should handle no metrics case', async (t) => {
  const plugins = [
    envPlugin,
    storePlugin,
    metricsPlugin,
    activitiesPlugin,
    scaleConfigPlugin,
    executorPlugin
  ]

  const server = await buildServerWithPlugins(t, {}, plugins)

  server.scalerMetrics = {
    getAllApplicationsMetrics: async () => ({})
  }

  const result = await server.scalerExecutor.checkScalingOnMetrics()

  assert.strictEqual(result.success, true, 'function should succeed')
  assert.strictEqual(result.periodic, true, 'should indicate periodic check')
  assert.strictEqual(result.message, 'No application metrics found')
})

test('checkScalingOnMetrics should process all applications with metrics', async (t) => {
  const app1Id = '33333333-3333-3333-3333-333333333333'
  const app2Id = '44444444-4444-4444-4444-444444444444'

  const machinist = await startMachinist(t)

  const mockPrometheus = await setupMockPrometheusServer({
    allHeapSize: {
      status: 'success',
      data: {
        resultType: 'matrix',
        result: [
          {
            metric: { applicationId: app1Id, podId: 'pod-1' },
            values: [[1620000000, '100000000']]
          },
          {
            metric: { applicationId: app2Id, podId: 'pod-2' },
            values: [[1620000000, '200000000']]
          }
        ]
      }
    },
    allEventLoop: {
      status: 'success',
      data: {
        resultType: 'matrix',
        result: [
          {
            metric: { applicationId: app1Id, podId: 'pod-1' },
            values: [[1620000000, '0.8']]
          },
          {
            metric: { applicationId: app2Id, podId: 'pod-2' },
            values: [[1620000000, '0.7']]
          }
        ]
      }
    }
  })

  t.after(async () => {
    await machinist.close()
    await mockPrometheus.close()
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

  await server.platformatic.entities.controller.save({
    input: {
      applicationId: app1Id,
      deploymentId: '00000000-0000-0000-0000-000000000003',
      namespace: 'default',
      k8SControllerId: 'test-controller-3',
      kind: 'Deployment',
      apiVersion: 'apps/v1',
      replicas: 1
    }
  })

  await server.platformatic.entities.controller.save({
    input: {
      applicationId: app2Id,
      deploymentId: '00000000-0000-0000-0000-000000000004',
      namespace: 'default',
      k8SControllerId: 'test-controller-4',
      kind: 'Deployment',
      apiVersion: 'apps/v1',
      replicas: 2
    }
  })

  server.scalerMetrics = {
    getAllApplicationsMetrics: async () => {
      return {
        [app1Id]: {
          'pod-1': {
            eventLoopUtilization: [
              {
                metric: { applicationId: app1Id, podId: 'pod-1' },
                values: [[1620000000, '0.8']]
              }
            ],
            heapSize: [
              {
                metric: { applicationId: app1Id, podId: 'pod-1' },
                values: [[1620000000, '100000000']]
              }
            ]
          }
        },
        [app2Id]: {
          'pod-2': {
            eventLoopUtilization: [
              {
                metric: { applicationId: app2Id, podId: 'pod-2' },
                values: [[1620000000, '0.7']]
              }
            ],
            heapSize: [
              {
                metric: { applicationId: app2Id, podId: 'pod-2' },
                values: [[1620000000, '200000000']]
              }
            ]
          }
        }
      }
    }
  }

  const executedScalings = []
  server.scalerExecutor.executeScaling = async (applicationId, podsNumber) => {
    executedScalings.push({ applicationId, podsNumber })
    return { success: true, applicationId, podsNumber }
  }

  const originalMethod = server.scalerExecutor.scalingAlgorithm.calculateScalingDecision
  server.scalerExecutor.scalingAlgorithm.calculateScalingDecision = async (applicationId, metrics, currentPodCount) => {
    if (applicationId === app1Id) {
      return { nfinal: currentPodCount + 1 }
    }
    if (applicationId === app2Id) {
      return { nfinal: Math.max(1, currentPodCount - 1) }
    }
    return { nfinal: currentPodCount }
  }

  const result = await server.scalerExecutor.checkScalingOnMetrics()

  assert.strictEqual(result.success, true, 'function should succeed')
  assert.strictEqual(result.periodic, true, 'should indicate periodic check')
  assert.strictEqual(result.results.length, 2, 'should have results for 2 applications')

  const app1Result = result.results.find(r => r.applicationId === app1Id)
  assert.ok(app1Result, 'should have result for app1')
  assert.strictEqual(app1Result.currentPodCount, 1, 'app1 should have 1 current pod')
  assert.strictEqual(app1Result.newPodCount, 2, 'app1 should scale to 2 pods')
  assert.strictEqual(app1Result.scaled, true, 'app1 should indicate scaling happened')

  const app2Result = result.results.find(r => r.applicationId === app2Id)
  assert.ok(app2Result, 'should have result for app2')
  assert.strictEqual(app2Result.currentPodCount, 2, 'app2 should have 2 current pods')
  assert.strictEqual(app2Result.newPodCount, 1, 'app2 should scale to 1 pod')
  assert.strictEqual(app2Result.scaled, true, 'app2 should indicate scaling happened')

  assert.strictEqual(executedScalings.length, 2, 'executeScaling should be called twice')
  assert.ok(executedScalings.some(s => s.applicationId === app1Id && s.podsNumber === 2),
    'executeScaling should be called for app1 with 2 pods')
  assert.ok(executedScalings.some(s => s.applicationId === app2Id && s.podsNumber === 1),
    'executeScaling should be called for app2 with 1 pod')
  server.scalerExecutor.scalingAlgorithm.calculateScalingDecision = originalMethod
})

test('checkScalingOnMetrics should handle errors gracefully', async (t) => {
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

  server.scalerMetrics = {
    getAllApplicationsMetrics: async () => {
      throw new Error('Test error')
    }
  }

  const result = await server.scalerExecutor.checkScalingOnMetrics()

  assert.strictEqual(result.success, false, 'function should return failure')
  assert.strictEqual(result.periodic, true, 'should indicate periodic check')
  assert.strictEqual(result.error, 'Test error', 'should return the error message')
})

test('checkScalingOnMetrics should skip the unknown application ID', async (t) => {
  const appId = '55555555-5555-5555-5555-555555555555'

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

  server.scalerMetrics = {
    getAllApplicationsMetrics: async () => {
      return {
        unknown: {
          'pod-x': {
            eventLoopUtilization: [
              {
                metric: { applicationId: 'unknown', podId: 'pod-x' },
                values: [[1620000000, '0.8']]
              }
            ],
            heapSize: [
              {
                metric: { applicationId: 'unknown', podId: 'pod-x' },
                values: [[1620000000, '100000000']]
              }
            ]
          }
        },
        [appId]: {
          'pod-y': {
            eventLoopUtilization: [
              {
                metric: { applicationId: appId, podId: 'pod-y' },
                values: [[1620000000, '0.7']]
              }
            ],
            heapSize: [
              {
                metric: { applicationId: appId, podId: 'pod-y' },
                values: [[1620000000, '200000000']]
              }
            ]
          }
        }
      }
    }
  }

  await server.platformatic.entities.controller.save({
    input: {
      applicationId: appId,
      deploymentId: '00000000-0000-0000-0000-000000000005',
      namespace: 'default',
      k8SControllerId: 'test-controller-5',
      kind: 'Deployment',
      apiVersion: 'apps/v1',
      replicas: 1
    }
  })

  const executedScalings = []
  server.scalerExecutor.executeScaling = async (applicationId, podsNumber) => {
    executedScalings.push({ applicationId, podsNumber })
    return { success: true, applicationId, podsNumber }
  }

  const originalMethod = server.scalerExecutor.scalingAlgorithm.calculateScalingDecision
  server.scalerExecutor.scalingAlgorithm.calculateScalingDecision = async (applicationId, metrics, currentPodCount) => {
    return { nfinal: currentPodCount + 1 }
  }

  const result = await server.scalerExecutor.checkScalingOnMetrics()

  assert.strictEqual(result.success, true, 'function should succeed')
  assert.strictEqual(result.results.length, 1, 'should have results for 1 real application only')
  assert.strictEqual(result.results[0].applicationId, appId, 'should only process the real app')

  assert.strictEqual(executedScalings.length, 1, 'executeScaling should be called once')
  assert.strictEqual(executedScalings[0].applicationId, appId, 'executeScaling should be called for the real app')
  assert.strictEqual(executedScalings[0].podsNumber, 2, 'executeScaling should be called with 2 pods')
  server.scalerExecutor.scalingAlgorithm.calculateScalingDecision = originalMethod
})
