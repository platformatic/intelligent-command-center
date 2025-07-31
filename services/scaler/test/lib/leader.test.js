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

  assert.ok(notificationReceived)
  assert.strictEqual(JSON.parse(receivedPayload), testPayload)
})

test('leaderElector notifies through PostgreSQL notification with an object', async (t) => {
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

  const testPayload = { test: 'payload-123' }
  await leaderElection.notify(testPayload)

  await sleep(1000)

  await listenClient.end()
  await pool.dispose()

  assert.ok(notificationReceived)
  assert.deepStrictEqual(JSON.parse(receivedPayload), testPayload)
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

  assert.strictEqual(callbackCount, 1)
  assert.strictEqual(callbackPayload, testPayload)
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
  assert.ok(leaderElector1.isLeader())

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
  assert.ok(leaderElector1.isLeader())
  assert.ok(!leaderElector2.isLeader())

  // Now stop the first instance (leader)
  await leaderElector1.stop()
  await sleep(500)
  await pool1.dispose()

  await sleep(500)

  const elected2 = leaderElector2.isLeader()
  assert.ok(elected2)

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
  assert.ok(leaderElector1.isLeader())
  assert.ok(!leaderElector2.isLeader(), 'Second instance should not be leader')

  const testPayload1 = 'test-notification-payload-1'
  await leaderElector1.notify(testPayload1)

  await sleep(300)

  assert.strictEqual(instance1Notifications, 1)
  assert.strictEqual(instance2Notifications, 0)

  // Now stop the first instance (leader)
  await leaderElector1.stop()
  await sleep(500)
  await pool1.dispose()

  await sleep(500)
  const elected2 = leaderElector2.isLeader()
  assert.ok(elected2)

  // Send a notification while instance2 is now leader
  const testPayload2 = 'test-notification-payload-2'
  await leaderElector2.notify(testPayload2)

  await sleep(300)

  assert.strictEqual(instance1Notifications, 1)
  assert.strictEqual(instance2Notifications, 1)

  // Clean up
  await leaderElector2.stop()
})

test('should throw error when required parameters are missing', async (t) => {
  assert.throws(() => {
    createLeaderElector({ log: { info: () => {} }, lock: 123 })
  }, { message: 'db is required' })

  assert.throws(() => {
    createLeaderElector({ db: {}, log: { info: () => {} } })
  }, { message: 'lock is required' })

  assert.throws(() => {
    createLeaderElector({ db: {}, lock: 123, log: { info: () => {} } })
  }, { message: 'onNotification is required' })

  assert.throws(() => {
    createLeaderElector({})
  })
})

test('should trigger onLeadershipChange callback when leadership changes', async (t) => {
  const pool = createConnectionPool({
    connectionString,
    bigIntMode: 'bigint'
  })

  const leadershipChanges = []

  const leaderElector = createLeaderElector({
    db: pool,
    lock: 8888,
    poll: 200,
    channel: 'test_leadership_change',
    log: {
      info: () => {},
      debug: () => {},
      warn: () => {},
      error: () => {}
    },
    onNotification: () => {},
    onLeadershipChange: (isLeader) => {
      leadershipChanges.push(isLeader)
    }
  })

  leaderElector.start()
  await sleep(500)

  assert.ok(leaderElector.isLeader())
  assert.strictEqual(leadershipChanges.length, 1)
  assert.strictEqual(leadershipChanges[0], true)

  await leaderElector.stop()
  await pool.dispose()
})

test('should handle errors in onNotification callback', async (t) => {
  const pool = createConnectionPool({
    connectionString,
    bigIntMode: 'bigint'
  })

  const logMessages = []
  const leaderElector = createLeaderElector({
    db: pool,
    lock: 7777,
    poll: 200,
    channel: 'test_notification_error',
    log: {
      info: () => {},
      debug: () => {},
      warn: (data, msg) => logMessages.push({ level: 'warn', data, msg }),
      error: () => {}
    },
    onNotification: () => {
      throw new Error('Test notification error')
    }
  })

  leaderElector.start()
  await sleep(500)

  await leaderElector.notify('test-error-payload')
  await sleep(500)

  await leaderElector.stop()
  await pool.dispose()

  const warnLog = logMessages.find(log => log.level === 'warn' && log.data.err)
  assert.ok(warnLog)
  assert.strictEqual(warnLog.data.err.message, 'Test notification error')
})
