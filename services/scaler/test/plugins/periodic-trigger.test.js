'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { setTimeout: sleep } = require('node:timers/promises')
const { buildServer } = require('../helper')

test('should periodically trigger scaling check on leader instance', async (t) => {
  const periodicTriggerInterval = 0.1 // 100ms in seconds
  process.env.PLT_SCALER_PERIODIC_TRIGGER = periodicTriggerInterval

  const executeCalls = []
  let checkMetricsCalls = 0

  const server = await buildServer(t, {
    env: {
      PLT_SCALER_LOCK: '12345',
      PLT_SCALER_LEADER_POLL: '50'
    }
  })

  const originalExecute = server.scalerExecutor.checkScalingOnMetrics
  server.scalerExecutor.checkScalingOnMetrics = async function (podId) {
    executeCalls.push({ podId, timestamp: Date.now() })
    return originalExecute.call(this, podId)
  }

  const originalCheckScalingOnMetrics = server.scalerExecutor.checkScalingOnMetrics
  server.scalerExecutor.checkScalingOnMetrics = async function () {
    checkMetricsCalls++
    return originalCheckScalingOnMetrics.call(this)
  }

  await sleep(periodicTriggerInterval * 3 * 1000) // Convert seconds to milliseconds for sleep

  assert.strictEqual(server.isScalerLeader(), true, 'Server should be the leader')
  assert.ok(executeCalls.length > 0, 'execute should be called at least once')

  assert.ok(checkMetricsCalls > 0, 'checkScalingOnMetrics should be called')

  await server.close()
  delete process.env.PLT_SCALER_PERIODIC_TRIGGER
})

test('should not trigger on non-leader instance', async (t) => {
  const lockId = Math.floor(Math.random() * 10000).toString()

  const server1 = await buildServer(t, {
    env: {
      PLT_SCALER_LOCK: lockId,
      PLT_SCALER_LEADER_POLL: '50',
      PLT_SCALER_PERIODIC_TRIGGER: '0.1'
    }
  })

  const server1Executions = []
  const originalExecute1 = server1.scalerExecutor.checkScalingOnMetrics
  server1.scalerExecutor.checkScalingOnMetrics = async function (podId) {
    server1Executions.push({ podId, timestamp: Date.now() })
    return originalExecute1.call(this, podId)
  }

  await sleep(200)

  const server2 = await buildServer(t, {
    env: {
      PLT_SCALER_LOCK: lockId,
      PLT_SCALER_LEADER_POLL: '50',
      PLT_SCALER_PERIODIC_TRIGGER: '0.1'
    }
  })

  const server2Executions = []
  const originalExecute2 = server2.scalerExecutor.checkScalingOnMetrics
  server2.scalerExecutor.checkScalingOnMetrics = async function (podId) {
    server2Executions.push({ podId, timestamp: Date.now() })
    return originalExecute2.call(this, podId)
  }

  await sleep(300)

  assert.strictEqual(server1.isScalerLeader(), true, 'Server 1 should be the leader')
  assert.strictEqual(server2.isScalerLeader(), false, 'Server 2 should not be the leader')

  const server2AllCalls = server2Executions.filter(call => call.podId === 'all')
  assert.strictEqual(server2AllCalls.length, 0, 'Non-leader should not execute periodic triggers')

  await server1.close()
  await server2.close()
})

test('leadership transfer should start/stop periodic triggers', async (t) => {
  const lockId = Math.floor(Math.random() * 10000).toString()

  const server1 = await buildServer(t, {
    env: {
      PLT_SCALER_LOCK: lockId,
      PLT_SCALER_LEADER_POLL: '50',
      PLT_SCALER_PERIODIC_TRIGGER: '0.1'
    }
  })

  const server1Executions = []
  const originalExecute1 = server1.scalerExecutor.checkScalingOnMetrics
  server1.scalerExecutor.checkScalingOnMetrics = async function (podId) {
    server1Executions.push({ podId, timestamp: Date.now() })
    return originalExecute1.call(this, podId)
  }

  const server2 = await buildServer(t, {
    env: {
      PLT_SCALER_LOCK: lockId,
      PLT_SCALER_LEADER_POLL: '50',
      PLT_SCALER_PERIODIC_TRIGGER: '0.1'
    }
  })

  const server2Executions = []
  const originalExecute2 = server2.scalerExecutor.checkScalingOnMetrics
  server2.scalerExecutor.checkScalingOnMetrics = async function (podId) {
    server2Executions.push({ podId, timestamp: Date.now() })
    return originalExecute2.call(this, podId)
  }

  await sleep(300)

  assert.strictEqual(server1.isScalerLeader(), true, 'Server 1 should initially be the leader')
  assert.strictEqual(server2.isScalerLeader(), false, 'Server 2 should initially not be the leader')

  await server1.close()

  await sleep(500)

  assert.strictEqual(server2.isScalerLeader(), true, 'Server 2 should become the leader after server1 closes')

  await server2.close()
})
