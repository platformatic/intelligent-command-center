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

  const response = await server.inject({
    method: 'POST',
    url: '/signals',
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId, namespace)
    },
    body: JSON.stringify({
      applicationId,
      signals: [
        { type: 'cpu', value: 0.75, timestamp: Date.now() },
        { type: 'memory', value: 0.80, timestamp: Date.now(), description: 'High memory usage' }
      ]
    })
  })

  assert.strictEqual(response.statusCode, 200)

  const body = JSON.parse(response.body)
  assert.strictEqual(body.success, true)
  assert.strictEqual(body.applicationId, applicationId)
  assert.strictEqual(body.podId, podId)
  assert.strictEqual(body.signalCount, 2)
  assert.ok(body.scalingDecision)
  assert.ok(typeof body.scalingDecision.nfinal === 'number')
  assert.ok(typeof body.scalingDecision.reason === 'string')
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
