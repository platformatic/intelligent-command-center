'use strict'

const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const assert = require('node:assert')
const {
  buildServer,
  generateK8sHeader,
  cleanValkeyData
} = require('../helper')

test('receive and save flamegraph successfully', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  const podId = 'test-pod-id'
  const serviceId = 'test-service-id'
  const flamegraphData = Buffer.from('test flamegraph data')

  const emittedUpdates = []
  server.emitUpdate = async (namespace, message) => {
    emittedUpdates.push({ namespace, message })
  }

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  const response = await server.inject({
    method: 'POST',
    url: `/pods/${podId}/services/${serviceId}/flamegraph`,
    headers: {
      'content-type': 'application/octet-stream',
      'x-k8s': generateK8sHeader(podId)
    },
    payload: flamegraphData
  })

  assert.strictEqual(response.statusCode, 200)

  const flamegraphEntity = JSON.parse(response.body)
  assert.ok(flamegraphEntity.id)

  const savedFlamegraphs = await server.platformatic.entities.flamegraph.find({
    where: {
      podId: { eq: podId },
      serviceId: { eq: serviceId }
    }
  })

  assert.strictEqual(savedFlamegraphs.length, 1)
  const savedFlamegraph = savedFlamegraphs[0]
  assert.strictEqual(savedFlamegraph.podId, podId)
  assert.strictEqual(savedFlamegraph.serviceId, serviceId)
  assert.strictEqual(savedFlamegraph.profileType, 'cpu')
  assert.ok(Buffer.isBuffer(savedFlamegraph.flamegraph))
  assert.strictEqual(savedFlamegraph.flamegraph.toString(), flamegraphData.toString())

  assert.strictEqual(emittedUpdates.length, 1)
  const update = emittedUpdates[0]
  assert.strictEqual(update.namespace, 'icc')
  assert.strictEqual(update.message.topic, 'ui-updates/flamegraphs')
  assert.strictEqual(update.message.type, 'flamegraph-created')
  assert.deepStrictEqual(update.message.data, {
    id: flamegraphEntity.id,
    serviceId,
    podId,
    profileType: 'cpu'
  })
})

test('flamegraph endpoint requires k8s context', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  const podId = 'test-pod-id'
  const serviceId = 'test-service-id'
  const flamegraphData = Buffer.from('test flamegraph data')

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  const response = await server.inject({
    method: 'POST',
    url: `/pods/${podId}/services/${serviceId}/flamegraph`,
    headers: {
      'content-type': 'application/octet-stream'
    },
    payload: flamegraphData
  })

  assert.strictEqual(response.statusCode, 500)
  const result = JSON.parse(response.body)
  assert.ok(result.message.includes('Missing k8s context'))
})

test('flamegraph saves successfully even if WebSocket update fails', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  const podId = 'test-pod-id'
  const serviceId = 'test-service-id'
  const flamegraphData = Buffer.from('test flamegraph data')

  let errorLogged = false
  server.emitUpdate = async () => {
    throw new Error('WebSocket update failed')
  }

  const originalError = server.log.error
  server.log.error = (obj, msg) => {
    if (msg === 'Failed to send notification to ui') {
      errorLogged = true
      assert.ok(obj.err)
      assert.strictEqual(obj.err.message, 'WebSocket update failed')
    }
    originalError.call(server.log, obj, msg)
  }

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  const response = await server.inject({
    method: 'POST',
    url: `/pods/${podId}/services/${serviceId}/flamegraph`,
    headers: {
      'content-type': 'application/octet-stream',
      'x-k8s': generateK8sHeader(podId)
    },
    payload: flamegraphData
  })

  assert.strictEqual(response.statusCode, 200)

  const flamegraphEntity = JSON.parse(response.body)
  assert.ok(flamegraphEntity.id)

  const savedFlamegraphs = await server.platformatic.entities.flamegraph.find({
    where: {
      podId: { eq: podId },
      serviceId: { eq: serviceId }
    }
  })

  assert.strictEqual(savedFlamegraphs.length, 1)
  assert.ok(errorLogged, 'Error should have been logged')
})

test('receive and save flamegraph with alertId successfully', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  const podId = 'test-pod-id'
  const serviceId = 'test-service-id'
  const applicationId = randomUUID()
  const flamegraphData = Buffer.from('test flamegraph data with alert')

  // Create a valid alert first
  const alert = await server.platformatic.entities.alert.save({
    input: {
      applicationId,
      serviceId,
      podId,
      elu: 0.5,
      heapUsed: 100,
      heapTotal: 200,
      unhealthy: true,
      healthHistory: []
    },
    fields: ['id']
  })
  const alertId = alert.id

  const emittedUpdates = []
  server.emitUpdate = async (namespace, message) => {
    emittedUpdates.push({ namespace, message })
  }

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  const response = await server.inject({
    method: 'POST',
    url: `/pods/${podId}/services/${serviceId}/flamegraph?alertId=${alertId}`,
    headers: {
      'content-type': 'application/octet-stream',
      'x-k8s': generateK8sHeader(podId)
    },
    payload: flamegraphData
  })

  assert.strictEqual(response.statusCode, 200)

  const flamegraphEntity = JSON.parse(response.body)
  assert.ok(flamegraphEntity.id)

  const savedFlamegraphs = await server.platformatic.entities.flamegraph.find({
    where: {
      podId: { eq: podId },
      serviceId: { eq: serviceId },
      alertId: { eq: alertId }
    }
  })

  assert.strictEqual(savedFlamegraphs.length, 1)
  const savedFlamegraph = savedFlamegraphs[0]
  assert.strictEqual(savedFlamegraph.podId, podId)
  assert.strictEqual(savedFlamegraph.serviceId, serviceId)
  assert.strictEqual(savedFlamegraph.alertId, alertId)
  assert.strictEqual(savedFlamegraph.profileType, 'cpu')
  assert.ok(Buffer.isBuffer(savedFlamegraph.flamegraph))
  assert.strictEqual(savedFlamegraph.flamegraph.toString(), flamegraphData.toString())

  assert.strictEqual(emittedUpdates.length, 1)
  const update = emittedUpdates[0]
  assert.strictEqual(update.namespace, 'icc')
  assert.strictEqual(update.message.topic, 'ui-updates/flamegraphs')
  assert.strictEqual(update.message.type, 'flamegraph-created')
  assert.deepStrictEqual(update.message.data, {
    id: flamegraphEntity.id,
    serviceId,
    podId,
    profileType: 'cpu'
  })
})

test('receive and save heap profile successfully', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  const podId = 'test-pod-id'
  const serviceId = 'test-service-id'
  const heapProfileData = Buffer.from('test heap profile data')

  const emittedUpdates = []
  server.emitUpdate = async (namespace, message) => {
    emittedUpdates.push({ namespace, message })
  }

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  const response = await server.inject({
    method: 'POST',
    url: `/pods/${podId}/services/${serviceId}/flamegraph?profileType=heap`,
    headers: {
      'content-type': 'application/octet-stream',
      'x-k8s': generateK8sHeader(podId)
    },
    payload: heapProfileData
  })

  assert.strictEqual(response.statusCode, 200)

  const flamegraphEntity = JSON.parse(response.body)
  assert.ok(flamegraphEntity.id)

  const savedFlamegraphs = await server.platformatic.entities.flamegraph.find({
    where: {
      podId: { eq: podId },
      serviceId: { eq: serviceId },
      profileType: { eq: 'heap' }
    }
  })

  assert.strictEqual(savedFlamegraphs.length, 1)
  const savedFlamegraph = savedFlamegraphs[0]
  assert.strictEqual(savedFlamegraph.podId, podId)
  assert.strictEqual(savedFlamegraph.serviceId, serviceId)
  assert.strictEqual(savedFlamegraph.profileType, 'heap')
  assert.ok(Buffer.isBuffer(savedFlamegraph.flamegraph))
  assert.strictEqual(savedFlamegraph.flamegraph.toString(), heapProfileData.toString())

  assert.strictEqual(emittedUpdates.length, 1)
  const update = emittedUpdates[0]
  assert.strictEqual(update.namespace, 'icc')
  assert.strictEqual(update.message.topic, 'ui-updates/flamegraphs')
  assert.strictEqual(update.message.type, 'flamegraph-created')
  assert.deepStrictEqual(update.message.data, {
    id: flamegraphEntity.id,
    serviceId,
    podId,
    profileType: 'heap'
  })
})
