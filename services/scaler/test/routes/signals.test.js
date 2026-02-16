'use strict'

const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const assert = require('node:assert/strict')
const {
  buildServer,
  generateK8sHeader,
  startMachinist
} = require('../helper')

test('POST /signals should process signals with v2 algorithm', async (t) => {
  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const podId = 'test-pod-1'
  const namespace = 'platformatic'
  const controllerId = 'test-controller'
  const runtimeId = randomUUID()

  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      namespace,
      kind: 'Deployment',
      apiVersion: 'apps/v1',
      replicas: 3
    })
  })

  const server = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v2'
  })

  // Mock as leader for this test
  server.isScalerLeader = () => true

  t.after(async () => {
    await server.close()
  })

  // Create instance first
  await server.inject({
    method: 'POST',
    url: '/controllers',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      applicationId,
      deploymentId,
      namespace,
      podId
    })
  })

  // Mock getInstanceByPodId
  server.getInstanceByPodId = async (pid, ns) => {
    if (pid === podId) {
      return { applicationId, deploymentId, podId, namespace, status: 'running' }
    }
    return null
  }

  // Initialize and connect
  await server.signalScalerExecutor.initialize()
  await server.signalScalerExecutor.onConnect(applicationId, deploymentId, podId, runtimeId, Date.now() - 60000)

  const now = Date.now()
  const serviceId = 'main'

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
        [serviceId]: {
          elu: {
            options: { threshold: 0.75 },
            workers: {
              'worker-1': {
                values: [
                  [now - 2000, 0.7],
                  [now - 1000, 0.75],
                  [now, 0.8]
                ]
              }
            }
          },
          heap: {
            options: { threshold: 250, heapTotal: 500 },
            workers: {
              'worker-1': {
                values: [
                  [now - 2000, 100],
                  [now - 1000, 110],
                  [now, 120]
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
  assert.ok(body.alerts !== undefined)
})

test('POST /signals should reject when algorithm version is not v2', async (t) => {
  const applicationId = randomUUID()
  const podId = 'test-pod-1'
  const namespace = 'platformatic'
  const runtimeId = randomUUID()

  const server = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v1'
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
            workers: { 'worker-1': { values: [[now, 0.7]] } }
          },
          heap: {
            options: { threshold: 250 },
            workers: { 'worker-1': { values: [[now, 100]] } }
          }
        }
      },
      batchStartedAt: now
    })
  })

  assert.strictEqual(response.statusCode, 400)

  const body = JSON.parse(response.body)
  assert.ok(body.error)
  assert.ok(body.error.includes('only available with algorithm version v2'))
  assert.strictEqual(body.currentVersion, 'v1')
})

test('POST /signals should require k8s context', async (t) => {
  const applicationId = randomUUID()
  const runtimeId = randomUUID()

  const server = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v2'
  })

  t.after(async () => {
    await server.close()
  })

  const now = Date.now()

  const response = await server.inject({
    method: 'POST',
    url: '/signals',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      applicationId,
      runtimeId,
      signals: {
        main: {
          elu: {
            options: { threshold: 0.75 },
            workers: { 'worker-1': { values: [[now, 0.7]] } }
          },
          heap: {
            options: { threshold: 250 },
            workers: { 'worker-1': { values: [[now, 100]] } }
          }
        }
      },
      batchStartedAt: now
    })
  })

  assert.strictEqual(response.statusCode, 500)

  const body = JSON.parse(response.body)
  assert.ok(body.message)
  assert.ok(body.message.includes('Missing k8s context'))
})

test('POST /signals should validate request body', async (t) => {
  const podId = 'test-pod-1'
  const namespace = 'platformatic'

  const server = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v2'
  })

  t.after(async () => {
    await server.close()
  })

  const response = await server.inject({
    method: 'POST',
    url: '/signals',
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId, namespace)
    },
    body: JSON.stringify({
      applicationId: randomUUID()
      // Missing runtimeId and signals
    })
  })

  assert.strictEqual(response.statusCode, 400)

  const body = JSON.parse(response.body)
  assert.ok(body.message)
})
