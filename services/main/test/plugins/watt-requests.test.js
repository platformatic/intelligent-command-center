'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { getServer } = require('../helper')

test('watt-requests plugin basic functionality', async (t) => {
  const server = await getServer(t)

  assert.ok(typeof server.executePodCommand === 'function')
  assert.ok(typeof server.registerClientHandler === 'function')
  assert.ok(server.podConnections instanceof Map)
})

test('executePodCommand throws error for non-existent pod', async (t) => {
  const server = await getServer(t)

  await assert.rejects(
    server.executePodCommand('non-existent-pod', 'trigger-flamegraph'),
    /No active connection for pod non-existent-pod/
  )
})

test('executePodCommand throws error for unknown command', async (t) => {
  const server = await getServer(t)

  const mockConnection = {
    send: () => {},
    on: () => {}
  }

  const podId = 'test-pod-123'
  server.registerClientHandler(mockConnection, podId)

  await assert.rejects(
    server.executePodCommand(podId, 'unknown-command'),
    /Unknown command: unknown-command/
  )
})

test('executePodCommand sends trigger-flamegraph command to connected pod', async (t) => {
  const server = await getServer(t)

  let sentMessage = null
  const mockConnection = {
    send: (message) => {
      sentMessage = JSON.parse(message)
    },
    on: () => {}
  }

  const podId = 'test-pod-123'

  server.registerClientHandler(mockConnection, podId)

  const result = await server.executePodCommand(podId, 'trigger-flamegraph')

  assert.deepStrictEqual(sentMessage, { command: 'trigger-flamegraph', params: {} })
  assert.deepStrictEqual(result, { triggered: true })
})

test('executePodCommand sends command with params to connected pod', async (t) => {
  const server = await getServer(t)

  let sentMessage = null
  const mockConnection = {
    send: (message) => {
      sentMessage = JSON.parse(message)
    },
    on: () => {}
  }

  const podId = 'test-pod-123'

  server.registerClientHandler(mockConnection, podId)

  const params = { duration: 30, type: 'cpu' }
  const result = await server.executePodCommand(podId, 'trigger-flamegraph', params)

  assert.deepStrictEqual(sentMessage, { command: 'trigger-flamegraph', params })
  assert.deepStrictEqual(result, { triggered: true })
})

test('registerClientHandler manages connection lifecycle', async (t) => {
  const server = await getServer(t)

  const mockConnection = {
    on: () => {},
    send: () => {}
  }

  const podId = 'test-pod-123'

  server.registerClientHandler(mockConnection, podId)

  assert.strictEqual(server.podConnections.get(podId), mockConnection)
})

test('registerClientHandler cleans up on connection close', async (t) => {
  const server = await getServer(t)

  const handlers = {}
  const mockConnection = {
    on: (event, handler) => {
      handlers[event] = handler
    },
    send: () => {}
  }

  const podId = 'test-pod-cleanup'

  server.registerClientHandler(mockConnection, podId)

  assert.strictEqual(server.podConnections.get(podId), mockConnection)

  handlers.close()

  assert.strictEqual(server.podConnections.get(podId), undefined)
})
