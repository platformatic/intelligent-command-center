'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { setTimeout: sleep } = require('node:timers/promises')
const { buildServer } = require('../helper')

test('should skip signal-scaler plugin when algorithm version is not v2', async (t) => {
  const server = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v1'
  })

  assert.strictEqual(typeof server.startScalerV2Trigger, 'undefined', 'startScalerV2Trigger should not be defined')
  assert.strictEqual(typeof server.stopScalerV2Trigger, 'undefined', 'stopScalerV2Trigger should not be defined')

  await server.close()
})

test('should register signal-scaler plugin when algorithm version is v2', async (t) => {
  const server = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v2'
  })

  assert.strictEqual(typeof server.startScalerV2Trigger, 'function', 'startScalerV2Trigger should be a function')
  assert.strictEqual(typeof server.stopScalerV2Trigger, 'function', 'stopScalerV2Trigger should be a function')

  await server.close()
})

test('should periodically trigger scaling check for v2 on leader instance', async (t) => {
  const periodicTriggerInterval = 0.1

  let checkAllCalls = 0

  const server = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v2',
    PLT_SCALER_LOCK: '12345',
    PLT_SCALER_LEADER_POLL: '50',
    PLT_SIGNALS_SCALER_PERIODIC_TRIGGER: periodicTriggerInterval
  })

  const originalCheckAll = server.signalScalerExecutor.checkScalingForAllApplications
  server.signalScalerExecutor.checkScalingForAllApplications = async function () {
    checkAllCalls++
    return originalCheckAll.call(this)
  }

  await sleep(periodicTriggerInterval * 3 * 1000)

  assert.strictEqual(server.isScalerLeader(), true, 'Server should be the leader')
  assert.ok(checkAllCalls > 0, 'checkScalingForAllApplications should be called at least once')

  await server.close()
})

test('should not trigger v2 scaling on non-leader instance', async (t) => {
  const lockId = Math.floor(Math.random() * 10000).toString()

  const server1 = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v2',
    PLT_SCALER_LOCK: lockId,
    PLT_SCALER_LEADER_POLL: '50',
    PLT_SIGNALS_SCALER_PERIODIC_TRIGGER: '0.1'
  })

  let server1Calls = 0
  const originalExecute1 = server1.signalScalerExecutor.checkScalingForAllApplications
  server1.signalScalerExecutor.checkScalingForAllApplications = async function () {
    server1Calls++
    return originalExecute1.call(this)
  }

  await sleep(200)

  const server2 = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v2',
    PLT_SCALER_LOCK: lockId,
    PLT_SCALER_LEADER_POLL: '50',
    PLT_SIGNALS_SCALER_PERIODIC_TRIGGER: '0.1'
  })

  let server2Calls = 0
  const originalExecute2 = server2.signalScalerExecutor.checkScalingForAllApplications
  server2.signalScalerExecutor.checkScalingForAllApplications = async function () {
    server2Calls++
    return originalExecute2.call(this)
  }

  await sleep(300)

  assert.strictEqual(server1.isScalerLeader(), true, 'Server 1 should be the leader')
  assert.strictEqual(server2.isScalerLeader(), false, 'Server 2 should not be the leader')

  assert.strictEqual(server2Calls, 0, 'Non-leader should not execute periodic triggers')
  assert.ok(server1Calls > 0, 'Leader should execute periodic triggers')

  await server1.close()
  await server2.close()
})

test('v2 leadership transfer should start/stop periodic triggers', async (t) => {
  const lockId = Math.floor(Math.random() * 10000).toString()

  const server1 = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v2',
    PLT_SCALER_LOCK: lockId,
    PLT_SCALER_LEADER_POLL: '50',
    PLT_SIGNALS_SCALER_PERIODIC_TRIGGER: '0.1'
  })

  let server1Calls = 0
  const originalExecute1 = server1.signalScalerExecutor.checkScalingForAllApplications
  server1.signalScalerExecutor.checkScalingForAllApplications = async function () {
    server1Calls++
    return originalExecute1.call(this)
  }

  const server2 = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v2',
    PLT_SCALER_LOCK: lockId,
    PLT_SCALER_LEADER_POLL: '50',
    PLT_SIGNALS_SCALER_PERIODIC_TRIGGER: '0.1'
  })

  let server2Calls = 0
  const originalExecute2 = server2.signalScalerExecutor.checkScalingForAllApplications
  server2.signalScalerExecutor.checkScalingForAllApplications = async function () {
    server2Calls++
    return originalExecute2.call(this)
  }

  await sleep(300)

  assert.strictEqual(server1.isScalerLeader(), true, 'Server 1 should initially be the leader')
  assert.strictEqual(server2.isScalerLeader(), false, 'Server 2 should initially not be the leader')
  assert.ok(server1Calls > 0, 'Server 1 should have executed triggers')

  const server2CallsBeforeTransfer = server2Calls

  await server1.close()

  await sleep(500)

  assert.strictEqual(server2.isScalerLeader(), true, 'Server 2 should become the leader after server1 closes')
  assert.ok(server2Calls > server2CallsBeforeTransfer, 'Server 2 should start executing triggers after becoming leader')

  await server2.close()
})

test('should handle errors in periodic v2 trigger gracefully', async (t) => {
  const server = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v2',
    PLT_SCALER_LOCK: '99999',
    PLT_SCALER_LEADER_POLL: '50',
    PLT_SIGNALS_SCALER_PERIODIC_TRIGGER: '0.1'
  })

  let callCount = 0
  let errorThrown = false
  const originalExecute = server.signalScalerExecutor.checkScalingForAllApplications
  server.signalScalerExecutor.checkScalingForAllApplications = async function () {
    callCount++
    if (callCount === 1) {
      errorThrown = true
      throw new Error('Simulated error in checkScalingForAllApplications')
    }
    return originalExecute.call(this)
  }

  await sleep(500)

  assert.strictEqual(errorThrown, true, 'Error should have been thrown')
  assert.ok(callCount >= 1, 'Should have attempted to execute at least once')

  await server.close()
})
