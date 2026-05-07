'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { getServer } = require('../helper')

test('watt-requests plugin basic functionality', async (t) => {
  const server = await getServer(t)

  assert.ok(typeof server.executeMachineCommand === 'function')
  assert.ok(typeof server.registerClientHandler === 'function')
  assert.ok(server.machineConnections instanceof Map)
})

test('executeMachineCommand throws error for non-existent pod', async (t) => {
  const server = await getServer(t)

  await assert.rejects(
    server.executeMachineCommand('non-existent-pod', 'trigger-flamegraph'),
    /No active connection for machine non-existent-pod/
  )
})

test('executeMachineCommand throws error for unknown command', async (t) => {
  const server = await getServer(t)

  const mockConnection = {
    send: () => {},
    on: () => {}
  }

  const podId = 'test-pod-123'
  server.registerClientHandler(mockConnection, podId)

  await assert.rejects(
    server.executeMachineCommand(podId, 'unknown-command'),
    /Unknown command: unknown-command/
  )
})

test('executeMachineCommand sends trigger-flamegraph command to connected pod', async (t) => {
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

  const result = await server.executeMachineCommand(podId, 'trigger-flamegraph')

  assert.deepStrictEqual(sentMessage, { command: 'trigger-flamegraph', params: {} })
  assert.deepStrictEqual(result, { triggered: true })
})

test('executeMachineCommand sends command with params to connected pod', async (t) => {
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
  const result = await server.executeMachineCommand(podId, 'trigger-flamegraph', params)

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

  assert.strictEqual(server.machineConnections.get(podId), mockConnection)
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

  assert.strictEqual(server.machineConnections.get(podId), mockConnection)

  handlers.close()

  assert.strictEqual(server.machineConnections.get(podId), undefined)
})
