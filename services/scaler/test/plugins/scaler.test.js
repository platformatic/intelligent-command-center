'use strict'

const test = require('node:test')
const { buildServer, buildServerWithPlugins, createExecutor } = require('../helper')
const assert = require('node:assert')
const { setTimeout: sleep } = require('node:timers/promises')
const scalerPlugin = require('../../plugins/scaler')
const envPlugin = require('../../plugins/env')

test('should register the scaler plugin correctly', async (t) => {
  const server = await buildServer(t)
  t.after(async () => {
    await server.close()
  })
  assert.ok(server.notifyScaler, 'server should have notifyScaler decorator')
})

test('should pass podId through PostgreSQL notification', async (t) => {
  let server1ExecutionCount = 0
  let receivedPayload = null

  const executor1 = {
    execute: async (payload) => {
      server1ExecutionCount++
      receivedPayload = payload
    }
  }
  const plugins = [
    envPlugin,
    createExecutor(executor1),
    scalerPlugin
  ]

  const server1 = await buildServerWithPlugins(t, {}, plugins)

  t.after(async () => {
    await server1.close()
  })

  server1.scalerExecutor = executor1

  const podId = 'test-pod-123'
  await server1.notifyScaler(podId)

  await sleep(500)

  assert.strictEqual(server1ExecutionCount, 1, 'Executor should have been called once')
  assert.deepStrictEqual(receivedPayload, podId, 'Payload should be passed through notification')
})

test('only one instance processes notifications with real scaler', async (t) => {
  let server1ExecutionCount = 0
  let server2ExecutionCount = 0

  const executor1 = {
    execute: async () => {
      server1ExecutionCount++
    }
  }

  const plugins1 = [
    envPlugin,
    createExecutor(executor1),
    scalerPlugin
  ]

  const executor2 = {
    execute: async () => {
      server2ExecutionCount++
    }
  }

  const plugins2 = [
    envPlugin,
    createExecutor(executor2),
    scalerPlugin
  ]

  // Create first the server2, so it will be the leader
  const server2 = await buildServerWithPlugins(t, {}, plugins2)
  const server1 = await buildServerWithPlugins(t, {}, plugins1)

  assert.ok(!server1.isScalerLeader(), 'Server 1 should not be the leader')
  assert.ok(server2.isScalerLeader(), 'Server 2 should be the leader')

  t.after(async () => {
    await server1.close()
    await server2.close()
  })

  server1.scalerExecutor = executor1
  server2.scalerExecutor = executor2

  // Notify the scaler on one server
  server1.notifyScaler()
  await sleep(500)
  assert.strictEqual(server1ExecutionCount, 0, 'Server 1 should not execute the scaler')
  assert.strictEqual(server2ExecutionCount, 1, 'Server 2 should execute the scaler once')
})

test('if one instance is shut down, the other is elected', async (t) => {
  const lockId = (Math.floor(Math.random() * 1000) + 5000).toString()

  const server2 = await buildServer(t, {
    env: {
      PLT_SCALER_LOCK: lockId,
      PLT_SCALER_LEADER_POLL: '200'
    }
  })

  const server1 = await buildServer(t, {
    env: {
      PLT_SCALER_LOCK: lockId,
      PLT_SCALER_LEADER_POLL: '200'
    }
  })

  t.after(async () => {
    await server1.close()
    await server2.close()
  })

  await sleep(200)
  assert.ok(!server1.isScalerLeader(), 'Server 1 should not be the leader')
  assert.ok(server2.isScalerLeader(), 'Server 2 should be the leader')

  // We close the leader, server1 should become the leader then
  await server2.close()
  await sleep(1000)
  assert.ok(server1.isScalerLeader(), 'Server 1 should be the leader after server 2 is closed')
})
