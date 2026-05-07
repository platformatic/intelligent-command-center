'use strict'

const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const assert = require('node:assert')
const {
  buildServer,
  generateMachineHeaders,
  cleanValkeyData,
  createAlert
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

  server.getInstanceByMachineId = async () => ({ applicationId })

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
      ...generateMachineHeaders(podId)
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
    type: 'cpu',
    alertsCount: 0
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
  assert.ok(result.message.includes('Missing machine context'))
})

test('flamegraph saves successfully even if WebSocket update fails', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  const podId = 'test-pod-id'
  const serviceId = 'test-service-id'
  const applicationId = randomUUID()
  const flamegraphData = Buffer.from('test flamegraph data')

  server.getInstanceByMachineId = async () => ({ applicationId })

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
      ...generateMachineHeaders(podId)
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

  server.getInstanceByMachineId = async () => ({ applicationId })

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
      ...generateMachineHeaders(podId)
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
    type: 'cpu',
    alertsCount: 1
  })
})

test('receive and save heap profile successfully', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  const podId = 'test-pod-id'
  const serviceId = 'test-service-id'
  const applicationId = randomUUID()
  const heapProfileData = Buffer.from('test heap profile data')

  server.getInstanceByMachineId = async () => ({ applicationId })

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
      ...generateMachineHeaders(podId)
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
    type: 'heap',
    alertsCount: 0
  })
})

test('flamegraph endpoint fails when instance not found', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  const podId = 'test-pod-id'
  const serviceId = 'test-service-id'
  const flamegraphData = Buffer.from('test flamegraph data')

  server.getInstanceByMachineId = async () => null

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  const response = await server.inject({
    method: 'POST',
    url: `/pods/${podId}/services/${serviceId}/flamegraph`,
    headers: {
      'content-type': 'application/octet-stream',
      ...generateMachineHeaders(podId)
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

  server.getInstanceByMachineId = async () => ({ applicationId })
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
      ...generateMachineHeaders(podId)
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

test('POST /flamegraphs/states saves profiling states', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  const applicationId = randomUUID()
  const podId = 'test-pod-state'
  const expiresIn = 15000

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  const response = await server.inject({
    method: 'POST',
    url: '/flamegraphs/states',
    headers: {
      'content-type': 'application/json',
      ...generateMachineHeaders(podId)
    },
    payload: {
      applicationId,
      podId,
      expiresIn,
      states: [
        { isProfiling: true, isPaused: false, profileType: 'cpu' },
        { isProfiling: true, isPaused: false, profileType: 'heap' }
      ]
    }
  })

  assert.strictEqual(response.statusCode, 200)

  // Verify states were saved
  const states = await server.getProfilingStates(applicationId)
  assert.strictEqual(states.length, 2)
  assert.strictEqual(states[0].isProfiling, true)
  assert.strictEqual(states[0].isPaused, false)
  assert.strictEqual(states[0].podId, podId)
})

test('GET /flamegraphs/states retrieves profiling states', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  const applicationId = randomUUID()
  const podId = 'test-pod-get-state'
  const expiresIn = 15000

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  // Save some states first
  await server.saveProfilingStates(applicationId, podId, expiresIn, [
    { isProfiling: true, isPaused: false, profileType: 'cpu' }
  ])

  const response = await server.inject({
    method: 'GET',
    url: `/flamegraphs/states?applicationId=${applicationId}`
  })

  assert.strictEqual(response.statusCode, 200)
  const states = JSON.parse(response.body)
  assert.strictEqual(states.length, 1)
  assert.strictEqual(states[0].isProfiling, true)
  assert.strictEqual(states[0].isPaused, false)
  assert.strictEqual(states[0].podId, podId)
})

test('POST /flamegraphs/states requires k8s context', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  const applicationId = randomUUID()

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  const response = await server.inject({
    method: 'POST',
    url: '/flamegraphs/states',
    headers: {
      'content-type': 'application/json'
    },
    payload: {
      applicationId,
      podId: 'test-pod',
      states: [{ isProfiling: true, isPaused: false }]
    }
  })

  assert.strictEqual(response.statusCode, 500)
  const result = JSON.parse(response.body)
  assert.ok(result.message.includes('Missing machine context'))
})

test('/GET /flamegraphs returns flamegraphs for application', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  const applicationId = randomUUID()
  const podId1 = 'test-pod-id-1'
  const serviceId1 = 'test-service-id-1'

  const podId2 = 'test-pod-id-2'
  const serviceId2 = 'test-service-id-2'

  const flamegraphData1 = Buffer.from('test flamegraph data')
  const flamegraphData2 = Buffer.from('test flamegraph data')

  server.getInstanceByMachineId = async () => ({ applicationId })

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  let allertId1 = null
  let allertId2 = null
  let flamegraphId1 = null

  {
    const alert = createAlert(applicationId, serviceId1)
    const { statusCode, body } = await server.inject({
      method: 'POST',
      url: '/alerts',
      headers: {
        'content-type': 'application/json',
        ...generateMachineHeaders(podId1)
      },
      payload: JSON.stringify({
        applicationId,
        alert,
        healthHistory: [alert]
      })
    })
    assert.strictEqual(statusCode, 200)

    const { id } = JSON.parse(body)
    allertId1 = id
  }

  {
    const alert = createAlert(applicationId, serviceId1)
    const { statusCode, body } = await server.inject({
      method: 'POST',
      url: '/alerts',
      headers: {
        'content-type': 'application/json',
        ...generateMachineHeaders(podId1)
      },
      payload: JSON.stringify({
        applicationId,
        alert,
        healthHistory: [alert]
      })
    })
    assert.strictEqual(statusCode, 200)

    const { id } = JSON.parse(body)
    allertId2 = id
  }

  {
    const { statusCode, body } = await server.inject({
      method: 'POST',
      url: `/pods/${podId1}/services/${serviceId1}/flamegraph`,
      query: { profileType: 'cpu' },
      headers: {
        'content-type': 'application/octet-stream',
        ...generateMachineHeaders(podId1)
      },
      payload: flamegraphData1
    })
    assert.strictEqual(statusCode, 200)

    const { id } = JSON.parse(body)
    flamegraphId1 = id
  }

  {
    const { statusCode } = await server.inject({
      method: 'POST',
      url: `/pods/${podId2}/services/${serviceId2}/flamegraph`,
      query: { profileType: 'heap' },
      headers: {
        'content-type': 'application/octet-stream',
        ...generateMachineHeaders(podId2)
      },
      payload: flamegraphData2
    })
    assert.strictEqual(statusCode, 200)
  }

  {
    const { statusCode } = await server.inject({
      method: 'POST',
      url: `/flamegraphs/${flamegraphId1}/alerts`,
      headers: {
        'content-type': 'application/json',
        ...generateMachineHeaders(podId1)
      },
      body: {
        alertIds: [allertId1, allertId2]
      }
    })
    assert.strictEqual(statusCode, 200)
  }

  const { statusCode, body } = await server.inject({
    method: 'GET',
    url: '/flamegraphs',
    query: { applicationId }
  })
  assert.strictEqual(statusCode, 200)

  const { flamegraphs, total } = JSON.parse(body)
  assert.strictEqual(flamegraphs.length, 2)
  assert.strictEqual(total, 2)

  const flamegraph1 = flamegraphs.find((f) => f.podId === podId1)
  assert.ok(flamegraph1)
  assert.strictEqual(flamegraph1.type, 'cpu')
  assert.strictEqual(flamegraph1.serviceId, serviceId1)
  assert.strictEqual(flamegraph1.flamegraph, undefined)
  assert.strictEqual(flamegraph1.alertsCount, 2)

  const flamegraph2 = flamegraphs.find((f) => f.podId === podId2)
  assert.ok(flamegraph2)
  assert.strictEqual(flamegraph2.type, 'heap')
  assert.strictEqual(flamegraph2.serviceId, serviceId2)
  assert.strictEqual(flamegraph2.flamegraph, undefined)
  assert.strictEqual(flamegraph2.alertsCount, 0)
})

test('/GET /flamegraphs supports pagination with limit and offset', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  const applicationId = randomUUID()
  const flamegraphData = Buffer.from('test flamegraph data')

  server.getInstanceByMachineId = async () => ({ applicationId })
  server.emitUpdate = async () => {}

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  // Create 5 flamegraphs for the same application
  for (let i = 1; i <= 5; i++) {
    const { statusCode } = await server.inject({
      method: 'POST',
      url: `/pods/pod-${i}/services/service-${i}/flamegraph`,
      headers: {
        'content-type': 'application/octet-stream',
        ...generateMachineHeaders(`pod-${i}`)
      },
      payload: flamegraphData
    })
    assert.strictEqual(statusCode, 200)
  }

  // Verify all 5 are returned when limit is large enough
  {
    const { statusCode, body } = await server.inject({
      method: 'GET',
      url: '/flamegraphs',
      query: { applicationId, limit: 10, offset: 0 }
    })
    assert.strictEqual(statusCode, 200)
    const { flamegraphs, total } = JSON.parse(body)
    assert.strictEqual(flamegraphs.length, 5)
    assert.strictEqual(total, 5)
  }

  // First page: limit=2, offset=0 → 2 results, total=5
  {
    const { statusCode, body } = await server.inject({
      method: 'GET',
      url: '/flamegraphs',
      query: { applicationId, limit: 2, offset: 0 }
    })
    assert.strictEqual(statusCode, 200)
    const { flamegraphs, total } = JSON.parse(body)
    assert.strictEqual(flamegraphs.length, 2)
    assert.strictEqual(total, 5)
  }

  // Second page: limit=2, offset=2 → 2 results, total=5
  {
    const { statusCode, body } = await server.inject({
      method: 'GET',
      url: '/flamegraphs',
      query: { applicationId, limit: 2, offset: 2 }
    })
    assert.strictEqual(statusCode, 200)
    const { flamegraphs, total } = JSON.parse(body)
    assert.strictEqual(flamegraphs.length, 2)
    assert.strictEqual(total, 5)
  }

  // Last partial page: limit=2, offset=4 → 1 result, total=5
  {
    const { statusCode, body } = await server.inject({
      method: 'GET',
      url: '/flamegraphs',
      query: { applicationId, limit: 2, offset: 4 }
    })
    assert.strictEqual(statusCode, 200)
    const { flamegraphs, total } = JSON.parse(body)
    assert.strictEqual(flamegraphs.length, 1)
    assert.strictEqual(total, 5)
  }

  // Beyond total: offset past all records → 0 results, total still 5
  {
    const { statusCode, body } = await server.inject({
      method: 'GET',
      url: '/flamegraphs',
      query: { applicationId, limit: 2, offset: 10 }
    })
    assert.strictEqual(statusCode, 200)
    const { flamegraphs, total } = JSON.parse(body)
    assert.strictEqual(flamegraphs.length, 0)
    assert.strictEqual(total, 5)
  }
})

test('/GET /flamegraphs pages are ordered newest first', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  const applicationId = randomUUID()
  const flamegraphData = Buffer.from('test flamegraph data')

  server.getInstanceByMachineId = async () => ({ applicationId })
  server.emitUpdate = async () => {}

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  const createdIds = []
  for (let i = 1; i <= 3; i++) {
    const { statusCode, body } = await server.inject({
      method: 'POST',
      url: `/pods/pod-${i}/services/service-${i}/flamegraph`,
      headers: {
        'content-type': 'application/octet-stream',
        ...generateMachineHeaders(`pod-${i}`)
      },
      payload: flamegraphData
    })
    assert.strictEqual(statusCode, 200)
    createdIds.push(JSON.parse(body).id)
  }

  // First page (limit=2) should contain the 2 most recently created flamegraphs
  const { statusCode, body } = await server.inject({
    method: 'GET',
    url: '/flamegraphs',
    query: { applicationId, limit: 2, offset: 0 }
  })
  assert.strictEqual(statusCode, 200)
  const { flamegraphs, total } = JSON.parse(body)
  assert.strictEqual(total, 3)
  assert.strictEqual(flamegraphs.length, 2)

  // Results should be ordered newest first (descending createdAt)
  const returnedDates = flamegraphs.map(f => new Date(f.createdAt).getTime())
  assert.ok(returnedDates[0] >= returnedDates[1], 'First result should be newer than or equal to second')

  // Second page should contain the oldest flamegraph
  const { statusCode: statusCode2, body: body2 } = await server.inject({
    method: 'GET',
    url: '/flamegraphs',
    query: { applicationId, limit: 2, offset: 2 }
  })
  assert.strictEqual(statusCode2, 200)
  const { flamegraphs: page2, total: total2 } = JSON.parse(body2)
  assert.strictEqual(total2, 3)
  assert.strictEqual(page2.length, 1)
  assert.strictEqual(page2[0].id, createdIds[0])
})
