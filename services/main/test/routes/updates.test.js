'use strict'

const assert = require('node:assert')
const { test } = require('node:test')
const { once } = require('node:events')
const { setTimeout: sleep } = require('node:timers/promises')
const { request, MockAgent, setGlobalDispatcher } = require('undici')
const WebSocket = require('ws')
const { getServer, startControlPlane, startScaler, startK8sAuthService } = require('../helper')

const agent = new MockAgent()
setGlobalDispatcher(agent)

test('should return 204 when posting an update', async (t) => {
  const server = await getServer(t)

  const res = await server.inject({
    method: 'POST',
    url: '/api/updates/icc',
    headers: {
      'Content-Type': 'application/json',
      'x-plt-icc-session-secret': 'test-secret'
    },
    body: {
      topic: 'ui-updates/applications',
      data: { foo: 'bar' }
    }
  })

  assert.strictEqual(res.statusCode, 204, res.body)
  assert.deepStrictEqual(res.body, '')
})

test('the icc event should be sent to the websocket', async (t) => {
  const server = await getServer(t)
  const url = await server.start()

  const wsUrl = url.replace('http', 'ws') + '/api/updates/icc'

  const socket = new WebSocket(wsUrl, {
    headers: {
      'x-plt-icc-session-secret': 'test-secret'
    }
  })
  await once(socket, 'open')

  t.after(() => {
    socket.close()
  })

  // subscribe to the topic
  socket.send(JSON.stringify({ command: 'subscribe', topic: 'ui-updates/applications' }))

  const subscriptionAck = await once(socket, 'message')
  assert.deepStrictEqual(JSON.parse(subscriptionAck[0]), { command: 'ack' })

  {
    const { statusCode, body } = await request(`${url}/api/updates/icc`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-plt-icc-session-secret': 'test-secret'
      },
      body: JSON.stringify({
        topic: 'ui-updates/applications',
        type: 'application-created',
        data: { foo: 'bar' }
      })
    })
    assert.strictEqual(statusCode, 204, body)
  }

  const notification = await once(socket, 'message')
  const notificationData = JSON.parse(notification[0])
  assert.deepStrictEqual(notificationData, {
    topic: 'ui-updates/applications',
    type: 'application-created',
    data: { foo: 'bar' }
  })
  // unsubscribe from the topic
  socket.send(JSON.stringify({ command: 'unsubscribe', topic: 'ui-updates/applications' }))
  const unsubscriptionAck = await once(socket, 'message')
  assert.deepStrictEqual(JSON.parse(unsubscriptionAck[0]), { command: 'ack' })
})

test('the application event should be sent to the websocket', async (t) => {
  const podId = '33'
  const applicationId = 'test-app-id'

  const podStatusChanges = []
  const controlPlaneUrl = await startControlPlane(t, {
    savePodStatus: async ({ podId, status }) => {
      podStatusChanges.push({ podId, status })
    },
    getPodDetails: async ({ podId }) => {
      return { id: podId, applicationId }
    }
  })

  const k8sAuth = await startK8sAuthService(t)

  const server = await getServer(t, {
    PLT_CONTROL_PLANE_URL: controlPlaneUrl,
    PLT_DISABLE_K8S_AUTH: false
  })

  const url = await server.start()

  const jwt = k8sAuth.generateToken(podId)
  const wsUrl = url.replace('http', 'ws') + `/api/updates/applications/${applicationId}`

  const socket = new WebSocket(wsUrl, {
    headers: {
      Authorization: `Bearer ${jwt}`
    }
  })
  await once(socket, 'open')

  // subscribe to the topic
  socket.send(JSON.stringify({ command: 'subscribe', topic: '/config' }))

  const subscriptionAck = await once(socket, 'message')
  assert.deepStrictEqual(JSON.parse(subscriptionAck[0]), { command: 'ack' })

  {
    const { statusCode } = await request(`${url}/api/updates/applications/${applicationId}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-plt-icc-session-secret': 'test-secret'
      },
      body: JSON.stringify({
        topic: 'config',
        type: 'config-updated',
        data: {
          threads: 10
        }
      })
    })
    assert.strictEqual(statusCode, 204)
  }

  const notification = await once(socket, 'message')
  const notificationData = JSON.parse(notification[0])
  assert.deepStrictEqual(notificationData, {
    topic: 'config',
    type: 'config-updated',
    data: {
      threads: 10
    }
  })
  // unsubscribe from the topic
  socket.send(JSON.stringify({ command: 'unsubscribe', topic: '/config' }))
  const unsubscriptionAck = await once(socket, 'message')
  assert.deepStrictEqual(JSON.parse(unsubscriptionAck[0]), { command: 'ack' })

  assert.deepStrictEqual(podStatusChanges, [
    { podId, status: 'running' }
  ])

  socket.close()

  // Wait for request to be sent to the control plane
  await sleep(500)

  assert.deepStrictEqual(podStatusChanges, [
    { podId, status: 'running' },
    { podId, status: 'stopped' }
  ])
})

test('should notify scaler on connect and disconnect when runtimeId is provided and algorithm version is v2', async (t) => {
  const podId = 'test-pod-42'
  const applicationId = 'test-app-id'
  const runtimeId = 'test-runtime-id'
  const namespace = 'platformatic'

  const scalerEvents = []
  const scalerUrl = await startScaler(t, {
    onConnect: async (data) => {
      scalerEvents.push({ type: 'connect', ...data })
      return { success: true }
    },
    onDisconnect: async (data) => {
      scalerEvents.push({ type: 'disconnect', ...data })
      return { success: true }
    }
  })

  const controlPlaneUrl = await startControlPlane(t, {
    savePodStatus: async () => {},
    getPodDetails: async ({ podId }) => {
      return { id: podId, applicationId }
    }
  })

  const k8sAuth = await startK8sAuthService(t)

  const server = await getServer(t, {
    PLT_CONTROL_PLANE_URL: controlPlaneUrl,
    PLT_SCALER_URL: scalerUrl,
    PLT_SCALER_ALGORITHM_VERSION: 'v2',
    PLT_DISABLE_K8S_AUTH: false
  })

  const url = await server.start()

  const jwt = k8sAuth.generateToken(podId, namespace)
  const wsUrl = url.replace('http', 'ws') + `/api/updates/applications/${applicationId}?runtimeId=${runtimeId}`

  const socket = new WebSocket(wsUrl, {
    headers: {
      Authorization: `Bearer ${jwt}`
    }
  })
  await once(socket, 'open')

  // Wait for connect notification to be sent
  await sleep(100)

  assert.strictEqual(scalerEvents.length, 1)
  assert.strictEqual(scalerEvents[0].type, 'connect')
  assert.strictEqual(scalerEvents[0].applicationId, applicationId)
  assert.strictEqual(scalerEvents[0].podId, podId)
  assert.strictEqual(scalerEvents[0].namespace, namespace)
  assert.strictEqual(scalerEvents[0].runtimeId, runtimeId)
  assert.ok(scalerEvents[0].timestamp)

  socket.close()

  // Wait for disconnect notification to be sent
  await sleep(500)

  assert.strictEqual(scalerEvents.length, 2)
  assert.strictEqual(scalerEvents[1].type, 'disconnect')
  assert.strictEqual(scalerEvents[1].applicationId, applicationId)
  assert.strictEqual(scalerEvents[1].podId, podId)
  assert.strictEqual(scalerEvents[1].namespace, namespace)
  assert.strictEqual(scalerEvents[1].runtimeId, runtimeId)
  assert.ok(scalerEvents[1].timestamp)
})

test('should not notify scaler when algorithm version is v1', async (t) => {
  const podId = 'test-pod-43'
  const applicationId = 'test-app-id'
  const runtimeId = 'test-runtime-id'
  const namespace = 'platformatic'

  const scalerEvents = []
  const scalerUrl = await startScaler(t, {
    onConnect: async (data) => {
      scalerEvents.push({ type: 'connect', ...data })
      return { success: true }
    },
    onDisconnect: async (data) => {
      scalerEvents.push({ type: 'disconnect', ...data })
      return { success: true }
    }
  })

  const controlPlaneUrl = await startControlPlane(t, {
    savePodStatus: async () => {},
    getPodDetails: async ({ podId }) => {
      return { id: podId, applicationId }
    }
  })

  const k8sAuth = await startK8sAuthService(t)

  const server = await getServer(t, {
    PLT_CONTROL_PLANE_URL: controlPlaneUrl,
    PLT_SCALER_URL: scalerUrl,
    PLT_SCALER_ALGORITHM_VERSION: 'v1',
    PLT_DISABLE_K8S_AUTH: false
  })

  const url = await server.start()

  const jwt = k8sAuth.generateToken(podId, namespace)
  const wsUrl = url.replace('http', 'ws') + `/api/updates/applications/${applicationId}?runtimeId=${runtimeId}`

  const socket = new WebSocket(wsUrl, {
    headers: {
      Authorization: `Bearer ${jwt}`
    }
  })
  await once(socket, 'open')

  // Wait for potential connect notification
  await sleep(100)

  socket.close()

  // Wait for potential disconnect notification
  await sleep(500)

  // No events should be recorded since algorithm version is v1
  assert.strictEqual(scalerEvents.length, 0)
})

test('should not notify scaler when runtimeId is not provided', async (t) => {
  const podId = 'test-pod-44'
  const applicationId = 'test-app-id'
  const namespace = 'platformatic'

  const scalerEvents = []
  const scalerUrl = await startScaler(t, {
    onConnect: async (data) => {
      scalerEvents.push({ type: 'connect', ...data })
      return { success: true }
    },
    onDisconnect: async (data) => {
      scalerEvents.push({ type: 'disconnect', ...data })
      return { success: true }
    }
  })

  const controlPlaneUrl = await startControlPlane(t, {
    savePodStatus: async () => {},
    getPodDetails: async ({ podId }) => {
      return { id: podId, applicationId }
    }
  })

  const k8sAuth = await startK8sAuthService(t)

  const server = await getServer(t, {
    PLT_CONTROL_PLANE_URL: controlPlaneUrl,
    PLT_SCALER_URL: scalerUrl,
    PLT_SCALER_ALGORITHM_VERSION: 'v2',
    PLT_DISABLE_K8S_AUTH: false
  })

  const url = await server.start()

  const jwt = k8sAuth.generateToken(podId, namespace)
  // Note: no runtimeId in the URL
  const wsUrl = url.replace('http', 'ws') + `/api/updates/applications/${applicationId}`

  const socket = new WebSocket(wsUrl, {
    headers: {
      Authorization: `Bearer ${jwt}`
    }
  })
  await once(socket, 'open')

  // Wait for potential connect notification
  await sleep(100)

  socket.close()

  // Wait for potential disconnect notification
  await sleep(500)

  // No events should be recorded since runtimeId is not provided
  assert.strictEqual(scalerEvents.length, 0)
})
