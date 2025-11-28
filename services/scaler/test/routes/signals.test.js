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

  const serviceId = 'test-service'

  const response = await server.inject({
    method: 'POST',
    url: '/signals',
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId, namespace)
    },
    body: JSON.stringify({
      applicationId,
      serviceId,
      elu: 0.7,
      heapUsed: 111,
      heapTotal: 222,
      signals: [
        { type: 'cpu', value: 0.75, timestamp: Date.now() },
        { type: 'memory', value: 0.80, timestamp: Date.now(), description: 'High memory usage' }
      ]
    })
  })

  const body = JSON.parse(response.body)
  assert.strictEqual(body.success, true)
  assert.strictEqual(body.applicationId, applicationId)
  assert.strictEqual(body.podId, podId)
  assert.strictEqual(body.signalCount, 2)
  assert.ok(body.alertId)
  assert.ok(body.scalingDecision)
  assert.ok(typeof body.scalingDecision.nfinal === 'number')
  assert.ok(typeof body.scalingDecision.reason === 'string')

  const alerts = await server.platformatic.entities.alert.find({
    where: {
      applicationId: { eq: applicationId },
      podId: { eq: podId }
    }
  })

  assert.ok(alerts.length > 0, 'Should have created alert records')
  const alert = alerts[0]
  assert.strictEqual(alert.applicationId, applicationId)
  assert.strictEqual(alert.podId, podId)
  assert.strictEqual(alert.serviceId, serviceId)
  assert.strictEqual(alert.unhealthy, false)

  const signals = await server.platformatic.entities.signal.find({
    where: {
      applicationId: { eq: applicationId },
      podId: { eq: podId }
    }
  })

  assert.ok(signals.length > 0, 'Should have created signal records')
  assert.strictEqual(signals.length, 2)
  assert.strictEqual(signals[0].applicationId, applicationId)
  assert.strictEqual(signals[0].podId, podId)
  assert.strictEqual(signals[0].serviceId, serviceId)
  assert.strictEqual(signals[0].alertId, alert.id, 'Signal should be linked to alert')
  assert.ok(signals[0].type, 'Signal should have type')
  assert.ok(signals[0].timestamp, 'Signal should have timestamp')
})

test('POST /signals should reject when algorithm version is not v2', async (t) => {
  const applicationId = randomUUID()
  const podId = 'test-pod-1'
  const namespace = 'platformatic'

  const server = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v1'
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
      applicationId,
      serviceId: 'test-service',
      elu: 0.7,
      heapUsed: 111,
      heapTotal: 222,
      signals: [
        { type: 'cpu', value: 0.75, timestamp: Date.now() }
      ]
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
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      applicationId,
      serviceId: 'test-service',
      elu: 0.7,
      heapUsed: 111,
      heapTotal: 222,
      signals: [
        { type: 'cpu', value: 0.75, timestamp: Date.now() }
      ]
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
    })
  })

  assert.strictEqual(response.statusCode, 400)

  const body = JSON.parse(response.body)
  assert.ok(body.message)
})
