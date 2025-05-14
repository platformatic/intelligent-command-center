'use strict'

const test = require('node:test')
const assert = require('node:assert')
const AlertsManager = require('../../lib/alerts-manager')
const { randomUUID } = require('node:crypto')
const { valkeyConnectionString } = require('../helper')
const Redis = require('iovalkey')

// Helper function to clean Redis data
async function cleanRedisData () {
  const redis = new Redis(valkeyConnectionString)
  try {
    const keys = await redis.keys('scaler:triggered-pods:*')
    if (keys.length > 0) {
      await redis.del(keys)
    }
  } finally {
    await redis.quit()
  }
}

test('AlertsManager clearRecentTriggers', async (t) => {
  await cleanRedisData()

  const mockRedis = new Redis(valkeyConnectionString)
  const mockStore = { redis: mockRedis }
  const mockApp = {
    log: { debug: () => {}, info: () => {} },
    store: mockStore
  }
  const manager = new AlertsManager(mockApp)

  await mockRedis.set('scaler:triggered-pods:pod1', Date.now(), 'EX', 30)
  await mockRedis.set('scaler:triggered-pods:pod2', Date.now(), 'EX', 30)

  const initialKeys = await mockRedis.keys('scaler:triggered-pods:*')
  assert.strictEqual(initialKeys.length, 2)

  await manager.clearRecentTriggers()

  const remainingKeys = await mockRedis.keys('scaler:triggered-pods:*')
  assert.strictEqual(remainingKeys.length, 0)

  await mockRedis.quit()
})

test('AlertsManager setDebounceWindow', async (t) => {
  const mockApp = { log: { debug: () => {}, info: () => {} } }
  const manager = new AlertsManager(mockApp)

  const initialWindow = manager.debounceWindow
  const newWindow = initialWindow + 10000

  manager.setDebounceWindow(newWindow)
  assert.strictEqual(manager.debounceWindow, newWindow)
})

test('AlertsManager getLastTriggeredTime and setLastTriggeredTime', async (t) => {
  await cleanRedisData()

  const mockRedis = new Redis(valkeyConnectionString)
  const mockStore = { redis: mockRedis }
  const mockApp = {
    log: { debug: () => {}, info: () => {} },
    store: mockStore
  }
  const manager = new AlertsManager(mockApp)

  const podId = 'test-pod-' + randomUUID()
  const timestamp = Date.now()

  const initialValue = await manager.getLastTriggeredTime(podId)
  assert.strictEqual(initialValue, null)

  await manager.setLastTriggeredTime(podId, timestamp)

  const retrievedValue = await manager.getLastTriggeredTime(podId)
  assert.strictEqual(retrievedValue, timestamp)

  const key = `scaler:triggered-pods:${podId}`
  const ttl = await mockRedis.ttl(key)
  assert.ok(ttl > 0, 'Key should have a TTL')

  await mockRedis.quit()
})

test('AlertsManager processAlert - unhealthy alert triggers scaler', async (t) => {
  await cleanRedisData()

  const notifyScalerCalled = []
  const savedAlerts = []
  const mockRedis = new Redis(valkeyConnectionString)

  const mockApp = {
    log: {
      debug: () => {},
      info: () => {}
    },
    store: {
      redis: mockRedis,
      saveAlert: async (alert) => {
        savedAlerts.push(alert)
      }
    },
    notifyScaler: async (podId) => {
      notifyScalerCalled.push(podId)
    }
  }

  const manager = new AlertsManager(mockApp)

  const unhealthyAlert = {
    applicationId: randomUUID(),
    serviceId: randomUUID(),
    podId: randomUUID(),
    elu: 95,
    heapUsed: 190,
    heapTotal: 380,
    unhealthy: true
  }

  await manager.processAlert(unhealthyAlert)

  assert.strictEqual(savedAlerts.length, 1)
  assert.strictEqual(savedAlerts[0].podId, unhealthyAlert.podId)
  assert.strictEqual(notifyScalerCalled.length, 1)
  assert.strictEqual(notifyScalerCalled[0], unhealthyAlert.podId)

  const key = `scaler:triggered-pods:${unhealthyAlert.podId}`
  const exists = await mockRedis.exists(key)
  assert.strictEqual(exists, 1, 'Should have a Redis key for the triggered pod')

  await mockRedis.quit()
})

test('AlertsManager processAlert - debounces subsequent unhealthy alerts', async (t) => {
  await cleanRedisData()

  const notifyScalerCalled = []
  const debugLogs = []
  const mockRedis = new Redis(valkeyConnectionString)

  const mockApp = {
    log: {
      debug: (data, msg) => {
        debugLogs.push({ data, msg })
      },
      info: () => {}
    },
    store: {
      redis: mockRedis,
      saveAlert: async () => {}
    },
    notifyScaler: async (podId) => {
      notifyScalerCalled.push(podId)
    }
  }

  const manager = new AlertsManager(mockApp)
  manager.setDebounceWindow(5000) // 5 seconds

  const podId = randomUUID()

  const firstAlert = {
    applicationId: randomUUID(),
    serviceId: randomUUID(),
    podId,
    elu: 95,
    heapUsed: 190,
    heapTotal: 380,
    unhealthy: true
  }

  await manager.processAlert(firstAlert)
  assert.strictEqual(notifyScalerCalled.length, 1)

  const exists = await mockRedis.exists(`scaler:triggered-pods:${podId}`)
  assert.strictEqual(exists, 1, 'Redis should have the pod key')

  const secondAlert = {
    applicationId: randomUUID(),
    serviceId: randomUUID(),
    podId,
    elu: 97,
    heapUsed: 195,
    heapTotal: 390,
    unhealthy: true
  }

  await manager.processAlert(secondAlert)
  assert.strictEqual(notifyScalerCalled.length, 1)

  const skipLogEntry = debugLogs.find(log =>
    log.msg === 'Skipping scaler trigger for recently triggered pod' &&
    log.data.podId === podId
  )
  assert.ok(skipLogEntry, 'Should log about skipping the trigger')

  await mockRedis.quit()
})

test('AlertsManager processAlert - allows trigger after debounce window', async (t) => {
  await cleanRedisData()

  const notifyScalerCalled = []
  const mockRedis = new Redis(valkeyConnectionString)

  const mockApp = {
    log: {
      debug: () => {},
      info: () => {}
    },
    store: {
      redis: mockRedis,
      saveAlert: async () => {}
    },
    notifyScaler: async (podId) => {
      notifyScalerCalled.push(podId)
    }
  }

  const manager = new AlertsManager(mockApp)
  const debounceWindow = 1000 // 1 second for testing
  manager.setDebounceWindow(debounceWindow)

  const podId = randomUUID()

  const now = Date.now()

  const oldTimestamp = now - debounceWindow - 500
  await manager.setLastTriggeredTime(podId, oldTimestamp)

  const unhealthyAlert = {
    applicationId: randomUUID(),
    serviceId: randomUUID(),
    podId,
    elu: 95,
    heapUsed: 190,
    heapTotal: 380,
    unhealthy: true
  }

  await manager.processAlert(unhealthyAlert)

  assert.strictEqual(notifyScalerCalled.length, 1, 'Should notify again after debounce window')
  assert.strictEqual(notifyScalerCalled[0], podId)

  await mockRedis.quit()
})

test('AlertsManager handles Redis errors gracefully', async (t) => {
  await cleanRedisData()

  const errorRedis = {
    get: async () => { throw new Error('Redis get error') },
    set: async () => { throw new Error('Redis set error') },
    keys: async () => { throw new Error('Redis keys error') },
    del: async () => { throw new Error('Redis del error') }
  }

  const mockApp = {
    log: {
      debug: () => {},
      info: () => {},
      error: () => {}
    },
    store: {
      redis: errorRedis,
      saveAlert: async () => {}
    },
    notifyScaler: async () => {}
  }

  const manager = new AlertsManager(mockApp)

  const podId = randomUUID()

  const time = await manager.getLastTriggeredTime(podId)
  assert.strictEqual(time, null)

  const unhealthyAlert = {
    applicationId: randomUUID(),
    serviceId: randomUUID(),
    podId,
    elu: 95,
    heapUsed: 190,
    heapTotal: 380,
    unhealthy: true
  }

  await manager.processAlert(unhealthyAlert)

  assert.ok(true)
})
