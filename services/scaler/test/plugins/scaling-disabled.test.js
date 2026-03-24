'use strict'

const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const assert = require('node:assert/strict')
const { setTimeout: sleep } = require('node:timers/promises')
const {
  buildServer,
  generateK8sHeader,
  cleanValkeyData,
  createAlert,
  startMachinist
} = require('../helper')

test('POST /alerts returns empty and creates no side effects when scaling is disabled', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t, {
    PLT_SCALER_SCALING_DISABLED: true
  })

  const podId = 'test-pod-disabled'
  const applicationId = randomUUID()
  const serviceId = 'test-service'
  const alert = createAlert(applicationId, serviceId)

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  const response = await server.inject({
    method: 'POST',
    url: '/alerts',
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    payload: JSON.stringify({
      applicationId,
      alert,
      healthHistory: [alert]
    })
  })

  assert.strictEqual(response.statusCode, 200)
  assert.deepStrictEqual(JSON.parse(response.body), {})

  // No alerts saved to valkey
  const savedAlerts = await server.store.getAlertsByPodId(podId)
  assert.strictEqual(savedAlerts.length, 0)

  // No alert entities saved to database
  const alertEntities = await server.platformatic.entities.alert.find({
    where: { applicationId: { eq: applicationId } }
  })
  assert.strictEqual(alertEntities.length, 0)

  // No scale events created
  const scaleEvents = await server.platformatic.entities.scaleEvent.find({
    where: { applicationId: { eq: applicationId } }
  })
  assert.strictEqual(scaleEvents.length, 0)
})

test('POST /signals returns empty alerts and creates no side effects when scaling is disabled', async (t) => {
  const applicationId = randomUUID()
  const podId = 'test-pod-disabled-v2'
  const namespace = 'platformatic'
  const runtimeId = randomUUID()

  await startMachinist(t, {
    getPodController: () => ({
      name: 'test-controller',
      namespace,
      kind: 'Deployment',
      apiVersion: 'apps/v1',
      replicas: 3
    })
  })

  const server = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v2',
    PLT_SCALER_SCALING_DISABLED: true
  })

  t.after(async () => {
    await server.close()
  })

  const now = Date.now()

  const response = await server.inject({
    method: 'POST',
    url: '/signals',
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId, namespace)
    },
    body: JSON.stringify({
      applicationId,
      runtimeId,
      signals: {
        main: {
          elu: {
            options: { threshold: 0.75 },
            workers: {
              'worker-1': {
                values: [
                  [now - 2000, 0.9],
                  [now - 1000, 0.95],
                  [now, 0.99]
                ]
              }
            }
          },
          heap: {
            options: { threshold: 250, heapTotal: 500 },
            workers: {
              'worker-1': {
                values: [
                  [now - 2000, 300],
                  [now - 1000, 350],
                  [now, 400]
                ]
              }
            }
          }
        }
      },
      batchStartedAt: now - 2000
    })
  })

  assert.strictEqual(response.statusCode, 200)
  const body = JSON.parse(response.body)
  assert.deepStrictEqual(body, { alerts: [] })

  // No alert entities saved to database
  const alertEntities = await server.platformatic.entities.alert.find({
    where: { applicationId: { eq: applicationId } }
  })
  assert.strictEqual(alertEntities.length, 0)

  // No scale events created
  const scaleEvents = await server.platformatic.entities.scaleEvent.find({
    where: { applicationId: { eq: applicationId } }
  })
  assert.strictEqual(scaleEvents.length, 0)
})

test('periodic trigger does not start when scaling is disabled', async (t) => {
  let checkMetricsCalls = 0

  const server = await buildServer(t, {
    PLT_SCALER_SCALING_DISABLED: true,
    PLT_SCALER_LOCK: Math.floor(Math.random() * 10000).toString(),
    PLT_SCALER_LEADER_POLL: '50',
    PLT_SCALER_PERIODIC_TRIGGER: '0.1'
  })

  const original = server.scalerExecutor.checkScalingOnMetrics
  server.scalerExecutor.checkScalingOnMetrics = async function () {
    checkMetricsCalls++
    return original.call(this)
  }

  // Wait enough time for multiple periodic triggers to have fired
  await sleep(500)

  assert.strictEqual(checkMetricsCalls, 0, 'checkScalingOnMetrics should never be called when scaling is disabled')

  await server.close()
})
