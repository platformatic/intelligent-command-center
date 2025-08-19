'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { WebSocket } = require('ws')
const { once } = require('events')
const { getServer, startK8sAuthService, startControlPlane } = require('../helper')

test('execute trigger-flamegraph command on pod', async (t) => {
  const applicationId = 'test-app-123'
  const podId = 'test-pod-456'

  const controlPlaneUrl = await startControlPlane(t, {
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

  const responsePromise = server.inject({
    method: 'POST',
    url: `/api/pods/${podId}/command`,
    headers: {
      'x-plt-icc-session-secret': 'test-secret'
    },
    payload: {
      command: 'trigger-flamegraph'
    }
  })

  const [data] = await once(socket, 'message')
  const receivedCommand = JSON.parse(data)

  const response = await responsePromise

  assert.strictEqual(response.statusCode, 200)
  const result = JSON.parse(response.body)
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.message, `Command 'trigger-flamegraph' executed for pod ${podId}`)
  assert.deepStrictEqual(result.data, { triggered: true })

  assert.deepStrictEqual(receivedCommand, { command: 'trigger-flamegraph', params: {} })

  socket.close()
})

test('execute command with params on pod', async (t) => {
  const applicationId = 'test-app-123'
  const podId = 'test-pod-456'

  const controlPlaneUrl = await startControlPlane(t, {
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

  const responsePromise = server.inject({
    method: 'POST',
    url: `/api/pods/${podId}/command`,
    headers: {
      'x-plt-icc-session-secret': 'test-secret'
    },
    payload: {
      command: 'trigger-flamegraph',
      params: { duration: 30 }
    }
  })

  const [data] = await once(socket, 'message')
  const receivedCommand = JSON.parse(data)

  const response = await responsePromise

  assert.strictEqual(response.statusCode, 200)
  const result = JSON.parse(response.body)
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.message, `Command 'trigger-flamegraph' executed for pod ${podId}`)

  assert.deepStrictEqual(receivedCommand, { command: 'trigger-flamegraph', params: { duration: 30 } })

  socket.close()
})

test('execute command on non-connected pod returns error', async (t) => {
  const server = await getServer(t)

  const response = await server.inject({
    method: 'POST',
    url: '/api/pods/non-existent-pod/command',
    headers: {
      'x-plt-icc-session-secret': 'test-secret'
    },
    payload: {
      command: 'trigger-flamegraph'
    }
  })

  assert.strictEqual(response.statusCode, 500)
  const result = JSON.parse(response.body)
  assert.ok(result.message.includes('No active connection'))
})

test('execute unknown command returns error', async (t) => {
  const applicationId = 'test-app-123'
  const podId = 'test-pod-456'

  const controlPlaneUrl = await startControlPlane(t, {
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

  const response = await server.inject({
    method: 'POST',
    url: `/api/pods/${podId}/command`,
    headers: {
      'x-plt-icc-session-secret': 'test-secret'
    },
    payload: {
      command: 'unknown-command'
    }
  })

  assert.strictEqual(response.statusCode, 400)

  socket.close()
})
