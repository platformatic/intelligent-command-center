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
    channels: [
      {
        channel: 'test_channel',
        onNotification: () => {}
      }
    ],
    log: {
      info: () => {},
      debug: () => {},
      warn: () => {},
      error: () => {}
    }
  })

  const testPayload = 'test-payload-123'
  await leaderElection.notify(testPayload, 'test_channel')

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
    channels: [
      {
        channel: 'test_channel',
        onNotification: () => {}
      }
    ],
    log: {
      info: () => {},
      debug: () => {},
      warn: () => {},
      error: () => {}
    }
  })

  const testPayload = { test: 'payload-123' }
  await leaderElection.notify(testPayload, 'test_channel')

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
    channels: [
      {
        channel: 'test_callback_channel',
        onNotification: (payload) => {
          callbackCount++
          callbackPayload = payload
        }
      }
    ],
    log: {
      info: () => {},
      debug: () => {},
      warn: () => {},
      error: () => {}
    }
  })

  leaderElector.start()

  await sleep(500)

  const testPayload = 'test-callback-payload'
  await leaderElector.notify(testPayload, 'test_callback_channel')

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
    poll: 200,
    channels: [
      {
        channel: 'test_re_election_channel',
        onNotification: () => {}
      }
    ],
    log: logger
  })

  // Start the first instance (this should become the leader)
  leaderElector1.start()
  await sleep(500)
  assert.ok(leaderElector1.isLeader())

  const leaderElector2 = createLeaderElector({
    db: pool2,
    lock: lockId,
    poll: 200,
    channels: [
      {
        channel: 'test_re_election_channel',
        onNotification: () => {}
      }
    ],
    log: logger
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
    poll: 100,
    channels: [
      {
        channel: testChannel,
        onNotification: () => {
          instance1Notifications++
        }
      }
    ],
    log: logger
  })

  const leaderElector2 = createLeaderElector({
    db: pool2,
    lock: lockId,
    poll: 100,
    channels: [
      {
        channel: testChannel,
        onNotification: () => {
          instance2Notifications++
        }
      }
    ],
    log: logger
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
  await leaderElector1.notify(testPayload1, testChannel)

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
  await leaderElector2.notify(testPayload2, testChannel)

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
  }, { message: 'channels array is required' })

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
    channels: [
      {
        channel: 'test_leadership_change',
        onNotification: () => {}
      }
    ],
    log: {
      info: () => {},
      debug: () => {},
      warn: () => {},
      error: () => {}
    },
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
    channels: [
      {
        channel: 'test_notification_error',
        onNotification: () => {
          throw new Error('Test notification error')
        }
      }
    ],
    log: {
      info: () => {},
      debug: () => {},
      warn: (data, msg) => logMessages.push({ level: 'warn', data, msg }),
      error: () => {}
    }
  })

  leaderElector.start()
  await sleep(500)

  await leaderElector.notify('test-error-payload', 'test_notification_error')
  await sleep(500)

  await leaderElector.stop()
  await pool.dispose()

  const warnLog = logMessages.find(log => log.level === 'warn' && log.data.err)
  assert.ok(warnLog)
  assert.strictEqual(warnLog.data.err.message, 'Test notification error')
})

test('should support multiple notification channels', async (t) => {
  const pool = createConnectionPool({
    connectionString,
    bigIntMode: 'bigint'
  })

  const channel1Notifications = []
  const channel2Notifications = []

  const leaderElector = createLeaderElector({
    db: pool,
    lock: 9999,
    poll: 200,
    channels: [
      {
        channel: 'test_channel_1',
        onNotification: (payload) => {
          channel1Notifications.push(payload)
        }
      },
      {
        channel: 'test_channel_2',
        onNotification: (payload) => {
          channel2Notifications.push(payload)
        }
      }
    ],
    log: {
      info: () => {},
      debug: () => {},
      warn: () => {},
      error: () => {}
    }
  })

  leaderElector.start()
  await sleep(500)

  // Notify on channel 1
  await leaderElector.notify({ message: 'hello from channel 1' }, 'test_channel_1')
  await sleep(300)

  // Notify on channel 2
  await leaderElector.notify({ message: 'hello from channel 2' }, 'test_channel_2')
  await sleep(300)

  // Notify on channel 1 again
  await leaderElector.notify({ message: 'second message on channel 1' }, 'test_channel_1')
  await sleep(300)

  await leaderElector.stop()
  await pool.dispose()

  // Verify channel 1 received 2 notifications
  assert.strictEqual(channel1Notifications.length, 2)
  assert.strictEqual(channel1Notifications[0].message, 'hello from channel 1')
  assert.strictEqual(channel1Notifications[1].message, 'second message on channel 1')

  // Verify channel 2 received 1 notification
  assert.strictEqual(channel2Notifications.length, 1)
  assert.strictEqual(channel2Notifications[0].message, 'hello from channel 2')
})

test('should route notifications to correct channel handler', async (t) => {
  const pool = createConnectionPool({
    connectionString,
    bigIntMode: 'bigint'
  })

  const receivedNotifications = []

  const leaderElector = createLeaderElector({
    db: pool,
    lock: 10000,
    poll: 200,
    channels: [
      {
        channel: 'channel_a',
        onNotification: (payload) => {
          receivedNotifications.push({ channel: 'a', payload })
        }
      },
      {
        channel: 'channel_b',
        onNotification: (payload) => {
          receivedNotifications.push({ channel: 'b', payload })
        }
      }
    ],
    log: {
      info: () => {},
      debug: () => {},
      warn: () => {},
      error: () => {}
    }
  })

  leaderElector.start()
  await sleep(500)

  await leaderElector.notify({ id: 1 }, 'channel_a')
  await sleep(300)
  await leaderElector.notify({ id: 2 }, 'channel_b')
  await sleep(300)
  await leaderElector.notify({ id: 3 }, 'channel_a')
  await sleep(300)

  await leaderElector.stop()
  await pool.dispose()

  assert.strictEqual(receivedNotifications.length, 3)
  assert.strictEqual(receivedNotifications[0].channel, 'a')
  assert.strictEqual(receivedNotifications[0].payload.id, 1)
  assert.strictEqual(receivedNotifications[1].channel, 'b')
  assert.strictEqual(receivedNotifications[1].payload.id, 2)
  assert.strictEqual(receivedNotifications[2].channel, 'a')
  assert.strictEqual(receivedNotifications[2].payload.id, 3)
})

test('should throw error when channels array has invalid entries', async (t) => {
  assert.throws(() => {
    createLeaderElector({
      db: {},
      lock: 123,
      log: { info: () => {} },
      channels: [
        { channel: 'test', onNotification: () => {} },
        { channel: 'test2' } // Missing onNotification
      ]
    })
  }, { message: 'onNotification is required for each notification channel' })

  assert.throws(() => {
    createLeaderElector({
      db: {},
      lock: 123,
      log: { info: () => {} },
      channels: [
        { onNotification: () => {} } // Missing channel
      ]
    })
  }, { message: 'channel is required for each notification channel' })
})
