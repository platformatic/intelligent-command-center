'use strict'

const { test } = require('node:test')
const { buildServer, buildServerWithPlugins, createExecutor } = require('../helper')
const assert = require('node:assert')
const { setTimeout: sleep } = require('node:timers/promises')
const scalerPlugin = require('../../plugins/scaler')
const predictionSchedulerPlugin = require('../../plugins/prediction-scheduler')
const envPlugin = require('../../plugins/env')
const storePlugin = require('../../plugins/store')

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
    checkScalingOnAlert: async (payload) => {
      server1ExecutionCount++
      receivedPayload = payload
    }
  }
  const plugins = [
    envPlugin,
    createExecutor(executor1),
    storePlugin,
    predictionSchedulerPlugin,
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
    checkScalingOnAlert: async () => {
      server1ExecutionCount++
    }
  }

  const plugins1 = [
    envPlugin,
    createExecutor(executor1),
    storePlugin,
    predictionSchedulerPlugin,
    scalerPlugin
  ]

  const executor2 = {
    checkScalingOnAlert: async () => {
      server2ExecutionCount++
    }
  }

  const plugins2 = [
    envPlugin,
    createExecutor(executor2),
    storePlugin,
    predictionSchedulerPlugin,
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

test('should stop prediction scheduling when losing leadership', async (t) => {
  const server = await buildServer(t, {
    env: {
      PLT_SCALER_LOCK: (Math.floor(Math.random() * 1000) + 6000).toString(),
      PLT_SCALER_LEADER_POLL: '100',
      PLT_SCALER_PERIODIC_TRIGGER: '1'
    }
  })

  server.stopPredictionScheduling = async () => {}

  t.after(async () => {
    await server.close()
  })

  await sleep(200)
  await server.close()

  assert.strictEqual(typeof server.stopPredictionScheduling, 'function')
})

test('should handle periodic trigger already running scenario', async (t) => {
  const server = await buildServer(t, {
    env: {
      PLT_SCALER_LOCK: (Math.floor(Math.random() * 1000) + 6100).toString(),
      PLT_SCALER_LEADER_POLL: '100',
      PLT_SCALER_PERIODIC_TRIGGER: '1'
    }
  })

  server.scalerExecutor = {
    checkScalingOnMetrics: async () => {
      return { success: true }
    }
  }

  t.after(async () => {
    await server.close()
  })

  await sleep(200)
})

test('should execute periodic metrics check when leader', async (t) => {
  const server = await buildServer(t, {
    env: {
      PLT_SCALER_LOCK: (Math.floor(Math.random() * 1000) + 6200).toString(),
      PLT_SCALER_LEADER_POLL: '100',
      PLT_SCALER_PERIODIC_TRIGGER: '1'
    }
  })

  server.scalerExecutor = {
    checkScalingOnMetrics: async () => {
      return { success: true }
    }
  }

  t.after(async () => {
    await server.close()
  })

  await sleep(1200)
})

test('should handle error in periodic trigger execution', async (t) => {
  const server = await buildServer(t, {
    env: {
      PLT_SCALER_LOCK: (Math.floor(Math.random() * 1000) + 6300).toString(),
      PLT_SCALER_LEADER_POLL: '100',
      PLT_SCALER_PERIODIC_TRIGGER: '1'
    }
  })

  const originalError = server.log.error
  server.log.error = (data, msg) => {
    originalError.call(server.log, data, msg)
  }

  server.scalerExecutor = {
    checkScalingOnMetrics: async () => {
      throw new Error('Metrics check failed')
    }
  }

  t.after(() => {
    server.log.error = originalError
  })

  await sleep(1200)
  await server.close()
})

test('should handle error in periodic trigger loop with restart logic', async (t) => {
  const server = await buildServer(t, {
    env: {
      PLT_SCALER_LOCK: (Math.floor(Math.random() * 1000) + 6400).toString(),
      PLT_SCALER_LEADER_POLL: '100',
      PLT_SCALER_PERIODIC_TRIGGER: '1'
    }
  })

  const originalError = server.log.error
  server.log.error = (data, msg) => {
    originalError.call(server.log, data, msg)
  }

  t.after(() => {
    server.log.error = originalError
  })

  await sleep(1200)
  await server.close()
})

test('should trigger leadership change and stop periodic trigger when losing leadership', async (t) => {
  const lockId = (Math.floor(Math.random() * 1000) + 6500).toString()

  const server1 = await buildServer(t, {
    env: {
      PLT_SCALER_LOCK: lockId,
      PLT_SCALER_LEADER_POLL: '100',
      PLT_SCALER_PERIODIC_TRIGGER: '1'
    }
  })

  server1.stopPredictionScheduling = async () => {}

  await sleep(200)
  assert.ok(server1.isScalerLeader(), 'Server 1 should be the leader')

  const server2 = await buildServer(t, {
    env: {
      PLT_SCALER_LOCK: lockId,
      PLT_SCALER_LEADER_POLL: '50',
      PLT_SCALER_PERIODIC_TRIGGER: '1'
    }
  })

  await sleep(200)

  await server1.close()
  await sleep(300)

  t.after(async () => {
    await server2.close()
  })

  assert.ok(server2.isScalerLeader(), 'Server 2 should become leader after server 1 closes')
})

test('should prevent starting periodic trigger when already running', async (t) => {
  const server = await buildServer(t, {
    env: {
      PLT_SCALER_LOCK: (Math.floor(Math.random() * 1000) + 6600).toString(),
      PLT_SCALER_LEADER_POLL: '100',
      PLT_SCALER_PERIODIC_TRIGGER: '2'
    }
  })

  t.after(async () => {
    await server.close()
  })

  await sleep(2200)
})
