'use strict'

const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const assert = require('node:assert')
const {
  buildServer,
  generateK8sHeader,
  cleanValkeyData
} = require('../helper')

function deepStrictEqualIgnoreCreatedAt (actual, expected) {
  assert.ok(actual.createdAt)
  delete actual.createdAt
  delete expected.createdAt
  assert.deepStrictEqual(actual, expected)
}

test('receive and save flamegraph successfully', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  const podId = 'test-pod-id'
  const serviceId = 'test-service-id'
  const applicationId = randomUUID()
  const flamegraphData = Buffer.from('test flamegraph data')

  server.getInstanceByPodId = async () => ({ applicationId })

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
  assert.strictEqual(savedFlamegraph.applicationId, applicationId)
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
  deepStrictEqualIgnoreCreatedAt(update.message.data, {
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
  const applicationId = randomUUID()
  const flamegraphData = Buffer.from('test flamegraph data')

  server.getInstanceByPodId = async () => ({ applicationId })

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

  server.getInstanceByPodId = async () => ({ applicationId })

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
      serviceId: { eq: serviceId }
    }
  })

  assert.strictEqual(savedFlamegraphs.length, 1)
  const savedFlamegraph = savedFlamegraphs[0]
  assert.strictEqual(savedFlamegraph.applicationId, applicationId)
  assert.strictEqual(savedFlamegraph.podId, podId)
  assert.strictEqual(savedFlamegraph.serviceId, serviceId)
  assert.strictEqual(savedFlamegraph.profileType, 'cpu')
  assert.ok(Buffer.isBuffer(savedFlamegraph.flamegraph))
  assert.strictEqual(savedFlamegraph.flamegraph.toString(), flamegraphData.toString())

  // Verify the alert was updated with the flamegraph_id
  const updatedAlerts = await server.platformatic.entities.alert.find({
    where: { id: { eq: alertId } }
  })
  assert.strictEqual(updatedAlerts.length, 1)
  assert.strictEqual(updatedAlerts[0].flamegraphId, savedFlamegraph.id)

  assert.strictEqual(emittedUpdates.length, 1)
  const update = emittedUpdates[0]
  assert.strictEqual(update.namespace, 'icc')
  assert.strictEqual(update.message.topic, 'ui-updates/flamegraphs')
  assert.strictEqual(update.message.type, 'flamegraph-created')
  deepStrictEqualIgnoreCreatedAt(update.message.data, {
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
  const applicationId = randomUUID()
  const heapProfileData = Buffer.from('test heap profile data')

  server.getInstanceByPodId = async () => ({ applicationId })

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
  assert.strictEqual(savedFlamegraph.applicationId, applicationId)
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

  deepStrictEqualIgnoreCreatedAt(update.message.data, {
    id: flamegraphEntity.id,
    serviceId,
    podId,
    profileType: 'heap'
  })
})

test('flamegraph endpoint fails when instance not found', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  const podId = 'test-pod-id'
  const serviceId = 'test-service-id'
  const flamegraphData = Buffer.from('test flamegraph data')

  server.getInstanceByPodId = async () => null

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

  assert.strictEqual(response.statusCode, 500)
  const result = JSON.parse(response.body)
  assert.ok(result.message.includes('Instance not found'))
})

test('link flamegraph to multiple alerts', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  const podId = 'test-pod-id'
  const serviceId = 'test-service-id'
  const applicationId = randomUUID()

  server.getInstanceByPodId = async () => ({ applicationId })
  server.emitUpdate = async () => {}

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  // Create a flamegraph
  const flamegraphResponse = await server.inject({
    method: 'POST',
    url: `/pods/${podId}/services/${serviceId}/flamegraph`,
    headers: {
      'content-type': 'application/octet-stream',
      'x-k8s': generateK8sHeader(podId)
    },
    payload: Buffer.from('test flamegraph data')
  })
  assert.strictEqual(flamegraphResponse.statusCode, 200)
  const flamegraph = JSON.parse(flamegraphResponse.body)

  // Create multiple alerts
  const alert1 = await server.platformatic.entities.alert.save({
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

  const alert2 = await server.platformatic.entities.alert.save({
    input: {
      applicationId,
      serviceId,
      podId,
      elu: 0.6,
      heapUsed: 150,
      heapTotal: 200,
      unhealthy: true,
      healthHistory: []
    },
    fields: ['id']
  })

  const alert3 = await server.platformatic.entities.alert.save({
    input: {
      applicationId,
      serviceId,
      podId,
      elu: 0.7,
      heapUsed: 180,
      heapTotal: 200,
      unhealthy: true,
      healthHistory: []
    },
    fields: ['id']
  })

  // Link flamegraph to multiple alerts
  const linkResponse = await server.inject({
    method: 'POST',
    url: `/flamegraphs/${flamegraph.id}/alerts`,
    headers: {
      'content-type': 'application/json'
    },
    payload: {
      alertIds: [alert1.id, alert2.id, alert3.id]
    }
  })

  assert.strictEqual(linkResponse.statusCode, 200)

  // Verify all alerts are linked to the flamegraph
  const updatedAlerts = await server.platformatic.entities.alert.find({
    where: {
      id: { in: [alert1.id, alert2.id, alert3.id] }
    }
  })

  assert.strictEqual(updatedAlerts.length, 3)
  for (const alert of updatedAlerts) {
    assert.strictEqual(alert.flamegraphId, flamegraph.id)
  }
})

test('link flamegraph to alerts fails when flamegraph not found', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  const nonExistentFlamegraphId = randomUUID()

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  const response = await server.inject({
    method: 'POST',
    url: `/flamegraphs/${nonExistentFlamegraphId}/alerts`,
    headers: {
      'content-type': 'application/json'
    },
    payload: {
      alertIds: [randomUUID()]
    }
  })

  assert.strictEqual(response.statusCode, 404)
  const result = JSON.parse(response.body)
  assert.ok(result.message.includes('Flamegraph not found'))
})

test('request flamegraph successfully', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  const podId = 'test-pod-id'
  const serviceId = 'test-service-id'
  const applicationId = randomUUID()

  server.getApplicationInstances = async () => [{ podId }]

  const receivedCommands = []
  server.sendPodCommand = (podId, command, params) => {
    receivedCommands.push({ podId, command, params })
  }

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  const response = await server.inject({
    method: 'POST',
    url: '/flamegraphs/requests',
    headers: {
      'content-type': 'application/json'
    },
    body: {
      applicationId,
      serviceIds: [serviceId],
      type: 'cpu'
    }
  })

  assert.strictEqual(response.statusCode, 200)

  assert.strictEqual(receivedCommands.length, 1)
  assert.deepStrictEqual(receivedCommands[0], {
    podId,
    command: 'trigger-flamegraph',
    params: { serviceIds: [serviceId] }
  })
})
