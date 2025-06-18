'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { setUpEnvironment, connectionString } = require('../helper')
const { setTimeout: sleep } = require('node:timers/promises')
const pg = require('pg')
const createLeaderElector = require('../../lib/leader')
const createConnectionPool = require('@databases/pg')

setUpEnvironment()

test('should notify through PostgreSQL notification', async (t) => {
  const listenClient = new pg.Client(connectionString)
  await listenClient.connect()

  const pool = createConnectionPool({
    connectionString,
    bigIntMode: 'bigint'
  })

  const sql = createConnectionPool.sql

  let notificationReceived = false
  let receivedPayload = null

  listenClient.on('notification', (msg) => {
    if (msg.channel === 'test_channel') {
      notificationReceived = true
      receivedPayload = msg.payload
    }
  })

  await listenClient.query('LISTEN "test_channel"')

  // Create a leader elector instance
  const leaderElection = createLeaderElector({
    db: pool,
    sql,
    lock: 9999,
    channel: 'test_channel',
    log: {
      info: () => {},
      debug: () => {},
      warn: () => {},
      error: () => {}
    },
    onNotification: () => {}
  })

  const testPayload = 'test-payload-123'
  await leaderElection.notify(testPayload)

  await sleep(1000)

  await listenClient.end()
  await pool.dispose()

  assert.ok(notificationReceived, 'should receive notification on test_channel')
  assert.strictEqual(receivedPayload, testPayload, 'should receive correct payload')
})

test('leadedElector properly passes payload to callback', async (t) => {
  let callbackCount = 0
  let callbackPayload = null

  // Create a pool
  const pool = createConnectionPool({
    connectionString,
    bigIntMode: 'bigint'
  })

  // Create a leader election instance
  const leaderElector = createLeaderElector({
    db: pool,
    lock: 9999,
    poll: 200,
    channel: 'test_callback_channel',
    log: {
      info: () => {},
      debug: () => {},
      warn: () => {},
      error: () => {}
    },
    onNotification: (payload) => {
      callbackCount++
      callbackPayload = payload
    }
  })

  leaderElector.start()

  await sleep(500)

  const testPayload = 'test-callback-payload'
  await leaderElector.notify(testPayload)

  await sleep(1000)

  await leaderElector.stop()
  await pool.dispose()

  assert.strictEqual(callbackCount, 1, 'Notification callback should be called once')
  assert.strictEqual(callbackPayload, testPayload, 'Callback should receive correct payload')
})

test('if one instance is shut down, the other is elected', async (t) => {
  const pool1 = createConnectionPool({
    connectionString,
    bigIntMode: 'bigint'
  })

  const pool2 = createConnectionPool({
    connectionString,
    bigIntMode: 'bigint'
  })

  // Use a unique lock ID for this test to avoid conflicts
  const lockId = Math.floor(Math.random() * 1000) + 7000

  t.after(async () => {
    try {
      if (pool1) await pool1.dispose()
      if (pool2) await pool2.dispose()
    } catch (err) {}
  })

  const logger = {
    info: () => {},
    debug: () => {},
    warn: () => {},
    error: () => {}
  }

  const sql = pool1.sql
  await pool1.query(sql`SELECT pg_advisory_unlock_all();`)
  await pool2.query(sql`SELECT pg_advisory_unlock_all();`)

  const leaderElector1 = createLeaderElector({
    db: pool1,
    lock: lockId,
    poll: 200, // Fast polling for test
    channel: 'test_re_election_channel',
    log: logger,
    onNotification: () => {}
  })

  // Start the first instance (this should become the leader)
  leaderElector1.start()
  await sleep(500)
  assert.ok(leaderElector1.isLeader(), 'First instance should be the leader')

  const leaderElector2 = createLeaderElector({
    db: pool2,
    lock: lockId,
    poll: 200, // Fast polling for test
    channel: 'test_re_election_channel',
    log: logger,
    onNotification: () => {}
  })

  leaderElector2.start()
  await sleep(500)

  // First instance should still be leader, second should not
  assert.ok(leaderElector1.isLeader(), 'First instance should still be leader')
  assert.ok(!leaderElector2.isLeader(), 'Second instance should not be leader')

  // Now stop the first instance (leader)
  await leaderElector1.stop()
  await sleep(500)
  await pool1.dispose()

  await sleep(500)

  const elected2 = leaderElector2.isLeader()
  assert.ok(elected2, 'Second instance should become leader after first instance is stopped')

  await leaderElector2.stop()
})

test('only the leader instance executes notification callbacks and leadership transfers properly', async (t) => {
  const pool1 = createConnectionPool({
    connectionString,
    bigIntMode: 'bigint'
  })

  const pool2 = createConnectionPool({
    connectionString,
    bigIntMode: 'bigint'
  })

  // Use a unique lock ID for this test to avoid conflicts
  const lockId = Math.floor(Math.random() * 1000) + 7000
  const testChannel = `test_leader_notifications_${lockId}`

  t.after(async () => {
    try {
      if (pool1) await pool1.dispose().catch(() => {})
      if (pool2) await pool2.dispose().catch(() => {})
    } catch (err) {}
  })

  const logger = {
    info: () => {},
    debug: () => {},
    warn: () => {},
    error: () => {}
  }

  const sql = pool1.sql
  await pool1.query(sql`SELECT pg_advisory_unlock_all();`)
  await pool2.query(sql`SELECT pg_advisory_unlock_all();`)

  let instance1Notifications = 0
  let instance2Notifications = 0

  const leaderElector1 = createLeaderElector({
    db: pool1,
    lock: lockId,
    poll: 100, // Even faster polling for test
    channel: testChannel,
    log: logger,
    onNotification: () => {
      instance1Notifications++
    }
  })

  const leaderElector2 = createLeaderElector({
    db: pool2,
    lock: lockId,
    poll: 100, // Even faster polling for test
    channel: testChannel,
    log: logger,
    onNotification: () => {
      instance2Notifications++
    }
  })

  // Start both instances
  leaderElector1.start()
  await sleep(300)
  leaderElector2.start()
  await sleep(300)

  // Verify initial leadership state
  assert.ok(leaderElector1.isLeader(), 'First instance should be the leader')
  assert.ok(!leaderElector2.isLeader(), 'Second instance should not be leader')

  const testPayload1 = 'test-notification-payload-1'
  await leaderElector1.notify(testPayload1)

  await sleep(300)

  assert.strictEqual(instance1Notifications, 1, 'Leader instance should receive 1 notification')
  assert.strictEqual(instance2Notifications, 0, 'Non-leader instance should not receive notifications')

  // Now stop the first instance (leader)
  await leaderElector1.stop()
  await sleep(500)
  await pool1.dispose()

  await sleep(500)
  const elected2 = leaderElector2.isLeader()
  assert.ok(elected2, 'Second instance should become leader after first instance is stopped')

  // Send a notification while instance2 is now leader
  const testPayload2 = 'test-notification-payload-2'
  await leaderElector2.notify(testPayload2)

  await sleep(300)

  assert.strictEqual(instance1Notifications, 1, 'First instance should still have only 1 notification')
  assert.strictEqual(instance2Notifications, 1, 'New leader should now receive notifications')

  // Clean up
  await leaderElector2.stop()
})
