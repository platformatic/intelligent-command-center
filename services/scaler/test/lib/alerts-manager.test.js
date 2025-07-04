'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const AlertsManager = require('../../lib/alerts-manager')
const { randomUUID } = require('node:crypto')
const { valkeyConnectionString, cleanValkeyData } = require('../helper')
const Redis = require('iovalkey')

test('AlertsManager clearRecentTriggers', async (t) => {
  await cleanValkeyData()

  const mockValkey = new Redis(valkeyConnectionString)
  const mockStore = { valkey: mockValkey }
  const mockApp = {
    log: { debug: () => {}, info: () => {} },
    store: mockStore
  }
  const manager = new AlertsManager(mockApp)

  await mockValkey.set('scaler:triggered-pods:pod1', Date.now(), 'EX', 30)
  await mockValkey.set('scaler:triggered-pods:pod2', Date.now(), 'EX', 30)

  const initialKeys = await mockValkey.keys('scaler:triggered-pods:*')
  assert.strictEqual(initialKeys.length, 2)

  await manager.clearRecentTriggers()

  const remainingKeys = await mockValkey.keys('scaler:triggered-pods:*')
  assert.strictEqual(remainingKeys.length, 0)

  await mockValkey.quit()
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
  await cleanValkeyData()

  const mockValkey = new Redis(valkeyConnectionString)
  const mockStore = { valkey: mockValkey }
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
  const ttl = await mockValkey.ttl(key)
  assert.ok(ttl > 0, 'Key should have a TTL')

  await mockValkey.quit()
})

test('AlertsManager processAlert - unhealthy alert triggers scaler', async (t) => {
  await cleanValkeyData()

  const notifyScalerCalled = []
  const savedAlerts = []
  const mockValkey = new Redis(valkeyConnectionString)

  const mockApp = {
    log: {
      debug: () => {},
      info: () => {}
    },
    store: {
      valkey: mockValkey,
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
  const exists = await mockValkey.exists(key)
  assert.strictEqual(exists, 1, 'Should have a Redis key for the triggered pod')

  await mockValkey.quit()
})

test('AlertsManager processAlert - debounces subsequent unhealthy alerts', async (t) => {
  await cleanValkeyData()

  const notifyScalerCalled = []
  const debugLogs = []
  const mockValkey = new Redis(valkeyConnectionString)

  const mockApp = {
    log: {
      debug: (data, msg) => {
        debugLogs.push({ data, msg })
      },
      info: () => {}
    },
    store: {
      valkey: mockValkey,
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

  const exists = await mockValkey.exists(`scaler:triggered-pods:${podId}`)
  assert.strictEqual(exists, 1, 'Valkey should have the pod key')

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

  await mockValkey.quit()
})

test('AlertsManager processAlert - allows trigger after debounce window', async (t) => {
  await cleanValkeyData()

  const notifyScalerCalled = []
  const mockValkey = new Redis(valkeyConnectionString)

  const mockApp = {
    log: {
      debug: () => {},
      info: () => {}
    },
    store: {
      valkey: mockValkey,
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

  await mockValkey.quit()
})

test('AlertsManager handles Redis errors gracefully', async (t) => {
  await cleanValkeyData()

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

test('AlertsManager handles _deleteTriggeredPodKeys Redis error gracefully', async (t) => {
  await cleanValkeyData()

  const errorLogs = []
  const errorRedis = {
    keys: async () => { throw new Error('Redis keys error') }
  }

  const mockApp = {
    log: {
      debug: () => {},
      info: () => {},
      error: (data, msg) => {
        errorLogs.push({ data, msg })
      }
    },
    store: {
      valkey: errorRedis
    }
  }

  const manager = new AlertsManager(mockApp)

  const result = await manager.clearRecentTriggers()

  assert.strictEqual(result, 0)

  const errorLog = errorLogs.find(log =>
    log.msg === 'Failed to delete triggered pod keys from Redis' &&
    log.data.err.message === 'Redis keys error'
  )
  assert.ok(errorLog, 'Should log error when Redis operation fails')
})
