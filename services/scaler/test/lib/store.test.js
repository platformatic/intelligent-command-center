'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { randomUUID } = require('node:crypto')
const { setTimeout } = require('node:timers/promises')
const Store = require('../../lib/store')
const { valkeyConnectionString } = require('../helper')
const { ALERTS_PREFIX } = require('../../lib/store-constants')
const { scanKeys } = require('../../../../lib/redis-utils')

async function setup (t) {
  const mockLogger = {
    error: () => {},
    info: () => {}
  }
  const store = new Store(valkeyConnectionString, mockLogger)

  const keys = await scanKeys(store.valkey, 'scaler:*')
  if (keys.length > 0) {
    await store.valkey.del(...keys)
  }

  t.after(async () => {
    const keys = await scanKeys(store.valkey, 'scaler:*')
    if (keys.length > 0) {
      await store.valkey.del(...keys)
    }
    await store.close()
  })

  return store
}

test('saveAlert - saves an alert to Redis with timestamp', async (t) => {
  const store = await setup(t)

  const alert = {
    applicationId: 'test:' + randomUUID(),
    serviceId: randomUUID(),
    podId: randomUUID(),
    elu: 75,
    heapUsed: 100,
    heapTotal: 200
  }

  await store.saveAlert(alert)

  const appAlertKeys = await scanKeys(store.valkey, `${ALERTS_PREFIX}{app:${alert.applicationId}}:*`)
  assert.strictEqual(appAlertKeys.length, 1, 'Should have one app alert key')

  const podAlertKeys = await scanKeys(store.valkey, `${ALERTS_PREFIX}{app:*}:pod:${alert.podId}:*`)
  assert.strictEqual(podAlertKeys.length, 1, 'Should have one pod alert key')

  const alertKey = appAlertKeys[0]
  assert.ok(alertKey, 'Alert key should exist')

  const alertData = await store.valkey.get(alertKey)
  assert.ok(alertData, 'Alert data should exist')

  const savedAlert = JSON.parse(alertData)
  assert.strictEqual(savedAlert.applicationId, alert.applicationId)
  assert.strictEqual(savedAlert.serviceId, alert.serviceId)
  assert.strictEqual(savedAlert.podId, alert.podId)
  assert.strictEqual(savedAlert.elu, alert.elu)
  assert.strictEqual(savedAlert.heapUsed, alert.heapUsed)
  assert.strictEqual(savedAlert.heapTotal, alert.heapTotal)
  assert.ok(savedAlert.timestamp, 'Alert should have a timestamp')

  const alertTtl = await store.valkey.ttl(alertKey)
  assert.ok(alertTtl > 0 && alertTtl <= 120, 'Alert data should have expiry set')
})

test('getAlertsByApplicationId - returns all alerts for an application in chronological order', async (t) => {
  const store = await setup(t)

  const applicationId = 'test:' + randomUUID()
  const alerts = [
    {
      applicationId,
      serviceId: randomUUID(),
      podId: randomUUID(),
      elu: 50,
      heapUsed: 100,
      heapTotal: 200
    },
    {
      applicationId,
      serviceId: randomUUID(),
      podId: randomUUID(),
      elu: 75,
      heapUsed: 150,
      heapTotal: 300
    }
  ]

  for (const alert of alerts) {
    await store.saveAlert(alert)
    await setTimeout(50)
  }

  const retrievedAlerts = await store.getAlertsByApplicationId(applicationId)
  assert.strictEqual(retrievedAlerts.length, 2)

  // Verify all alerts have timestamps
  for (const alert of retrievedAlerts) {
    assert.ok(alert.timestamp, 'Alert should have a timestamp')
  }

  // Verify service/pod IDs match our original alerts
  const serviceIds = retrievedAlerts.map(a => a.serviceId)
  const podIds = retrievedAlerts.map(a => a.podId)

  assert.ok(alerts.every(a => serviceIds.includes(a.serviceId)), 'All original service IDs should be present')
  assert.ok(alerts.every(a => podIds.includes(a.podId)), 'All original pod IDs should be present')
})

test('getAlertsByApplicationId - filters alerts by timeWindow', async (t) => {
  const store = await setup(t)

  const applicationId = 'test:' + randomUUID()
  const alerts = [
    {
      applicationId,
      serviceId: randomUUID(),
      podId: randomUUID(),
      elu: 50,
      heapUsed: 100,
      heapTotal: 200
    },
    {
      applicationId,
      serviceId: randomUUID(),
      podId: randomUUID(),
      elu: 75,
      heapUsed: 150,
      heapTotal: 300
    }
  ]

  await store.saveAlert(alerts[0])
  await setTimeout(500)
  await store.saveAlert(alerts[1])

  const allAlerts = await store.getAlertsByApplicationId(applicationId)
  assert.strictEqual(allAlerts.length, 2, 'Should return all alerts without timeWindow')

  const timeWindow = 500 // 500ms
  const recentAlerts = await store.getAlertsByApplicationId(applicationId, timeWindow)

  assert.strictEqual(recentAlerts.length, 1, 'Should return only the most recent alert within the time window')
  assert.strictEqual(recentAlerts[0].elu, 75, 'Should return the most recent alert')
})

test('getAlertsByApplicationId - returns empty array for non-existent application', async (t) => {
  const store = await setup(t)

  const nonExistentId = 'test:' + randomUUID()
  const alerts = await store.getAlertsByApplicationId(nonExistentId)
  assert.deepStrictEqual(alerts, [])
})

test('getAlertsByPodId - returns all alerts for a podId in chronological order', async (t) => {
  const store = await setup(t)

  const podId = randomUUID()
  const alerts = [
    {
      applicationId: 'test:' + randomUUID(),
      serviceId: randomUUID(),
      podId,
      elu: 85,
      heapUsed: 170,
      heapTotal: 340
    },
    {
      applicationId: 'test:' + randomUUID(),
      serviceId: randomUUID(),
      podId,
      elu: 90,
      heapUsed: 180,
      heapTotal: 350
    }
  ]

  for (const alert of alerts) {
    await store.saveAlert(alert)
    await setTimeout(50)
  }

  await store.saveAlert({
    applicationId: 'test:' + randomUUID(),
    serviceId: randomUUID(),
    podId: randomUUID(),
    elu: 50,
    heapUsed: 100,
    heapTotal: 200
  })

  const retrievedAlerts = await store.getAlertsByPodId(podId)
  assert.strictEqual(retrievedAlerts.length, 2)

  for (const alert of retrievedAlerts) {
    assert.ok(alert.timestamp, 'Alert should have a timestamp')
  }

  const applicationIds = retrievedAlerts.map(a => a.applicationId)
  const serviceIds = retrievedAlerts.map(a => a.serviceId)

  assert.ok(alerts.every(a => applicationIds.includes(a.applicationId)), 'All original application IDs should be present')
  assert.ok(alerts.every(a => serviceIds.includes(a.serviceId)), 'All original service IDs should be present')
})

test('getAlertsByPodId - filters alerts by timeWindow', async (t) => {
  const store = await setup(t)

  const podId = randomUUID()
  const alerts = [
    {
      applicationId: 'test:' + randomUUID(),
      serviceId: randomUUID(),
      podId,
      elu: 85,
      heapUsed: 170,
      heapTotal: 340
    },
    {
      applicationId: 'test:' + randomUUID(),
      serviceId: randomUUID(),
      podId,
      elu: 90,
      heapUsed: 180,
      heapTotal: 350
    }
  ]

  await store.saveAlert(alerts[0])
  await setTimeout(1000)
  await store.saveAlert(alerts[1])

  // First, verify both alerts are returned without time window
  const allAlerts = await store.getAlertsByPodId(podId)
  assert.strictEqual(allAlerts.length, 2, 'Should return all alerts without timeWindow')

  // Now get only the most recent alert with a short time window
  const timeWindow = 500 // 500ms
  const recentAlerts = await store.getAlertsByPodId(podId, timeWindow)

  assert.strictEqual(recentAlerts.length, 1, 'Should return only the most recent alert within the time window')
  assert.strictEqual(recentAlerts[0].elu, 90, 'Should return the most recent alert')
})

test('getAlertsByPodId - returns empty array for non-existent podId', async (t) => {
  const store = await setup(t)
  const alerts = await store.getAlertsByPodId(randomUUID())
  assert.deepStrictEqual(alerts, [])
})

test('saveAlert and getAlertsByApplicationId - multiple alerts for same pod/app/service combination', async (t) => {
  const store = await setup(t)

  const applicationId = 'test:' + randomUUID()
  const serviceId = randomUUID()
  const podId = randomUUID()

  // Create and save multiple alerts for the same pod with different metrics
  const alerts = [
    {
      applicationId,
      serviceId,
      podId,
      elu: 50,
      heapUsed: 100,
      heapTotal: 200
    },
    {
      applicationId,
      serviceId,
      podId,
      elu: 75,
      heapUsed: 150,
      heapTotal: 300
    }
  ]

  for (const alert of alerts) {
    await store.saveAlert(alert)
    await setTimeout(50) // Small delay to ensure different timestamps
  }

  const appAlerts = await store.getAlertsByApplicationId(applicationId)
  assert.strictEqual(appAlerts.length, 2, 'Should store both alerts for the same application')

  const podAlerts = await store.getAlertsByPodId(podId)
  assert.strictEqual(podAlerts.length, 2, 'Should store both alerts for the same pod')
})

test('saveAlert - saves alert with healthHistory array', async (t) => {
  const store = await setup(t)

  const applicationId = 'test:' + randomUUID()
  const serviceId = randomUUID()
  const podId = randomUUID()

  // Create sample health history
  const healthHistory = [
    {
      id: randomUUID(),
      service: serviceId,
      currentHealth: {
        elu: 0.4,
        heapUsed: 90,
        heapTotal: 180
      },
      unhealthy: false,
      healthConfig: {
        enabled: true,
        interval: 60,
        maxELU: 0.8
      }
    },
    {
      id: randomUUID(),
      service: serviceId,
      currentHealth: {
        elu: 0.6,
        heapUsed: 110,
        heapTotal: 190
      },
      unhealthy: true,
      healthConfig: {
        enabled: true,
        interval: 60,
        maxELU: 0.8
      }
    }
  ]

  const alert = {
    applicationId,
    serviceId,
    podId,
    elu: 75,
    heapUsed: 120,
    heapTotal: 200,
    unhealthy: true,
    healthHistory
  }

  await store.saveAlert(alert)

  const alerts = await store.getAlertsByPodId(podId)
  assert.strictEqual(alerts.length, 1, 'Should have one alert')

  const savedAlert = alerts[0]
  assert.ok(Array.isArray(savedAlert.healthHistory), 'healthHistory should be an array')
  assert.strictEqual(savedAlert.healthHistory.length, 2, 'healthHistory should have 2 items')
  assert.strictEqual(savedAlert.healthHistory[0].id, healthHistory[0].id, 'healthHistory items should match')
  assert.strictEqual(savedAlert.healthHistory[1].id, healthHistory[1].id, 'healthHistory items should match')
  assert.strictEqual(savedAlert.healthHistory[0].currentHealth.elu, healthHistory[0].currentHealth.elu, 'healthHistory details should match')
  assert.strictEqual(savedAlert.healthHistory[1].unhealthy, healthHistory[1].unhealthy, 'healthHistory unhealthy flag should match')
})

test('loadPerfHistory returns empty array when no data exists', async (t) => {
  const store = await setup(t)
  const history = await store.loadPerfHistory('app-1')
  assert.deepStrictEqual(history, [])
})

test('savePerfHistory and loadPerfHistory store and retrieve data correctly', async (t) => {
  const store = await setup(t)
  const testHistory = [
    { timestamp: 1620000000, podsAdded: 1, preEluMean: 0.8 },
    { timestamp: 1620000600, podsAdded: 2, preEluMean: 0.9 }
  ]

  await store.savePerfHistory('app-1', testHistory)
  const loadedHistory = await store.loadPerfHistory('app-1')

  assert.deepStrictEqual(loadedHistory, testHistory)
})

test('addPerfHistoryEvent trims history to maxHistoryEvents', async (t) => {
  const store = await setup(t)
  const maxHistoryEvents = 3

  for (let i = 1; i <= 5; i++) {
    await store.addPerfHistoryEvent('app-1', {
      timestamp: 1620000000 + i * 100,
      podsAdded: i
    }, maxHistoryEvents)
  }

  const history = await store.loadPerfHistory('app-1')

  assert.strictEqual(history.length, 3)
  assert.strictEqual(history[0].podsAdded, 5)
  assert.strictEqual(history[1].podsAdded, 4)
  assert.strictEqual(history[2].podsAdded, 3)
})

test('loadClusters returns empty array when no data exists', async (t) => {
  const store = await setup(t)
  const clusters = await store.loadClusters('app-1')
  assert.deepStrictEqual(clusters, [])
})

test('saveClusters and loadClusters store and retrieve data correctly', async (t) => {
  const store = await setup(t)
  const testClusters = [
    {
      eluMean: 0.8,
      heapMean: 0.7,
      eluTrendMean: 0.05,
      heapTrendMean: 0.03,
      performanceScore: 0.9,
      weight: 1
    }
  ]

  await store.saveClusters('app-1', testClusters)
  const loadedClusters = await store.loadClusters('app-1')

  assert.deepStrictEqual(loadedClusters, testClusters)
})

test('getLastScalingTime returns 0 when no data exists', async (t) => {
  const store = await setup(t)
  const time = await store.getLastScalingTime('app-1', 'up')
  assert.strictEqual(time, 0)
})

test('saveLastScalingTime and getLastScalingTime store and retrieve data correctly', async (t) => {
  const store = await setup(t)
  const testTime = 1620000000

  await store.saveLastScalingTime('app-1', testTime, 'up')
  const loadedTime = await store.getLastScalingTime('app-1', 'up')

  assert.strictEqual(loadedTime, testTime)
})

// Test error handling and edge cases
test('saveAlert - throws error when applicationId is missing', async (t) => {
  const store = await setup(t)

  const alert = {
    serviceId: randomUUID(),
    podId: randomUUID(),
    elu: 75,
    heapUsed: 100,
    heapTotal: 200
  }

  await assert.rejects(
    () => store.saveAlert(alert),
    { message: 'Missing required fields: applicationId' }
  )
})

test('saveAlert - throws error when podId is missing', async (t) => {
  const store = await setup(t)

  const alert = {
    applicationId: 'test:' + randomUUID(),
    serviceId: randomUUID(),
    elu: 75,
    heapUsed: 100,
    heapTotal: 200
  }

  await assert.rejects(
    () => store.saveAlert(alert),
    { message: 'Missing required fields: podId' }
  )
})

test('saveAlert - throws error when both applicationId and podId are missing', async (t) => {
  const store = await setup(t)

  const alert = {
    serviceId: randomUUID(),
    elu: 75,
    heapUsed: 100,
    heapTotal: 200
  }

  await assert.rejects(
    () => store.saveAlert(alert),
    { message: 'Missing required fields: applicationId, podId' }
  )
})

test('saveAlert - converts non-array healthHistory to empty array with warning', async (t) => {
  // Create a mock logger that captures log calls
  const logCalls = []
  const mockLogger = {
    error: () => {},
    info: () => {},
    warn: (data, message) => logCalls.push({ level: 'warn', data, message })
  }

  // Create a new store with the mock logger
  const storeWithMockLogger = new Store(valkeyConnectionString, mockLogger)

  t.after(async () => {
    await storeWithMockLogger.close()
  })

  const alert = {
    applicationId: 'test:' + randomUUID(),
    serviceId: randomUUID(),
    podId: randomUUID(),
    elu: 75,
    heapUsed: 100,
    heapTotal: 200,
    healthHistory: 'not an array' // Invalid healthHistory
  }

  await storeWithMockLogger.saveAlert(alert)

  // Verify warning was logged
  assert.strictEqual(logCalls.length, 1)
  assert.strictEqual(logCalls[0].level, 'warn')
  assert.strictEqual(logCalls[0].message, 'healthHistory is not an array, converting to empty array')

  // Verify alert was saved with empty array
  const alerts = await storeWithMockLogger.getAlertsByApplicationId(alert.applicationId)
  assert.strictEqual(alerts.length, 1)
  assert.ok(Array.isArray(alerts[0].healthHistory))
  assert.strictEqual(alerts[0].healthHistory.length, 0)
})

test('getAlertsByPattern - handles JSON parse errors gracefully', async (t) => {
  const store = await setup(t)

  // Create a mock logger that captures error calls
  const logCalls = []
  const mockLogger = {
    error: (data, message) => logCalls.push({ level: 'error', data, message }),
    info: () => {},
    warn: () => {}
  }

  // Create a new store with the mock logger
  const storeWithMockLogger = new Store(valkeyConnectionString, mockLogger)

  t.after(async () => {
    await storeWithMockLogger.close()
  })

  const applicationId = 'test:' + randomUUID()
  const alertKey = `${ALERTS_PREFIX}{app:${applicationId}}:pod:${randomUUID()}:${Date.now().toString().padStart(13, '0')}`

  // Manually insert invalid JSON data
  await store.valkey.set(alertKey, 'invalid json data', 'EX', 60)

  // Try to get alerts - should handle the parse error gracefully
  const alerts = await storeWithMockLogger.getAlertsByApplicationId(applicationId)

  // Should return empty array despite the invalid data
  assert.strictEqual(alerts.length, 0)

  // Should have logged the error
  assert.strictEqual(logCalls.length, 1)
  assert.strictEqual(logCalls[0].level, 'error')
  assert.strictEqual(logCalls[0].message, 'Failed to parse alert')
})

test('getAlertsByApplicationId - returns empty array when applicationId is missing', async (t) => {
  const store = await setup(t)

  const alerts = await store.getAlertsByApplicationId('')
  assert.deepStrictEqual(alerts, [], 'Should return empty array for empty applicationId')

  const alerts2 = await store.getAlertsByApplicationId(null)
  assert.deepStrictEqual(alerts2, [], 'Should return empty array for null applicationId')

  const alerts3 = await store.getAlertsByApplicationId(undefined)
  assert.deepStrictEqual(alerts3, [], 'Should return empty array for undefined applicationId')
})

test('getAlertsByPodId - returns empty array when podId is missing', async (t) => {
  const store = await setup(t)

  const alerts = await store.getAlertsByPodId('')
  assert.deepStrictEqual(alerts, [], 'Should return empty array for empty podId')

  const alerts2 = await store.getAlertsByPodId(null)
  assert.deepStrictEqual(alerts2, [], 'Should return empty array for null podId')

  const alerts3 = await store.getAlertsByPodId(undefined)
  assert.deepStrictEqual(alerts3, [], 'Should return empty array for undefined podId')
})

// Test error handling for all Redis operations
test('loadPerfHistory - handles Redis errors gracefully', async (t) => {
  const logCalls = []
  const mockLogger = {
    error: (data, message) => logCalls.push({ level: 'error', data, message }),
    info: () => {},
    warn: () => {}
  }

  const store = new Store(valkeyConnectionString, mockLogger)

  // Close the connection to simulate an error
  await store.valkey.quit()

  const history = await store.loadPerfHistory('test-app')

  // Should return empty array and log error
  assert.deepStrictEqual(history, [])
  assert.strictEqual(logCalls.length, 1)
  assert.strictEqual(logCalls[0].level, 'error')
  assert.strictEqual(logCalls[0].message, 'Failed to load performance history')
})

test('savePerfHistory - handles Redis errors gracefully', async (t) => {
  const logCalls = []
  const mockLogger = {
    error: (data, message) => logCalls.push({ level: 'error', data, message }),
    info: () => {},
    warn: () => {}
  }

  const store = new Store(valkeyConnectionString, mockLogger)

  // Close the connection to simulate an error
  await store.valkey.quit()

  await store.savePerfHistory('test-app', [{ timestamp: 123, event: 'test' }])

  // Should log error
  assert.strictEqual(logCalls.length, 1)
  assert.strictEqual(logCalls[0].level, 'error')
  assert.strictEqual(logCalls[0].message, 'Failed to save performance history')
})

test('loadClusters - handles Redis errors gracefully', async (t) => {
  const logCalls = []
  const mockLogger = {
    error: (data, message) => logCalls.push({ level: 'error', data, message }),
    info: () => {},
    warn: () => {}
  }

  const store = new Store(valkeyConnectionString, mockLogger)

  // Close the connection to simulate an error
  await store.valkey.quit()

  const clusters = await store.loadClusters('test-app')

  // Should return empty array and log error
  assert.deepStrictEqual(clusters, [])
  assert.strictEqual(logCalls.length, 1)
  assert.strictEqual(logCalls[0].level, 'error')
  assert.strictEqual(logCalls[0].message, 'Failed to load clusters')
})

test('saveClusters - handles Redis errors gracefully', async (t) => {
  const logCalls = []
  const mockLogger = {
    error: (data, message) => logCalls.push({ level: 'error', data, message }),
    info: () => {},
    warn: () => {}
  }

  const store = new Store(valkeyConnectionString, mockLogger)

  // Close the connection to simulate an error
  await store.valkey.quit()

  await store.saveClusters('test-app', [{ cluster: 'test' }])

  // Should log error
  assert.strictEqual(logCalls.length, 1)
  assert.strictEqual(logCalls[0].level, 'error')
  assert.strictEqual(logCalls[0].message, 'Failed to save clusters')
})

test('getLastScalingTime - handles Redis errors gracefully', async (t) => {
  const logCalls = []
  const mockLogger = {
    error: (data, message) => logCalls.push({ level: 'error', data, message }),
    info: () => {},
    warn: () => {}
  }

  const store = new Store(valkeyConnectionString, mockLogger)

  // Close the connection to simulate an error
  await store.valkey.quit()

  const time = await store.getLastScalingTime('test-app', 'up')

  // Should return 0 and log error
  assert.strictEqual(time, 0)
  assert.strictEqual(logCalls.length, 1)
  assert.strictEqual(logCalls[0].level, 'error')
  assert.strictEqual(logCalls[0].message, 'Failed to get last scaling time')
})

test('saveLastScalingTime - handles Redis errors gracefully', async (t) => {
  const logCalls = []
  const mockLogger = {
    error: (data, message) => logCalls.push({ level: 'error', data, message }),
    info: () => {},
    warn: () => {}
  }

  const store = new Store(valkeyConnectionString, mockLogger)

  // Close the connection to simulate an error
  await store.valkey.quit()

  await store.saveLastScalingTime('test-app', 123456, 'up')

  // Should log error
  assert.strictEqual(logCalls.length, 1)
  assert.strictEqual(logCalls[0].level, 'error')
  assert.strictEqual(logCalls[0].message, 'Failed to save last scaling time')
})

test('Store constructor - sets custom alertRetention option', async (t) => {
  const mockLogger = {
    error: () => {},
    info: () => {},
    warn: () => {}
  }

  const customRetention = 120 // 2 minutes
  const store = new Store(valkeyConnectionString, mockLogger, { alertRetention: customRetention })

  t.after(async () => {
    await store.close()
  })

  assert.strictEqual(store.alertRetention, customRetention)
})

test('Store constructor - uses default alertRetention when not specified', async (t) => {
  const mockLogger = {
    error: () => {},
    info: () => {},
    warn: () => {}
  }

  const store = new Store(valkeyConnectionString, mockLogger)

  t.after(async () => {
    await store.close()
  })

  assert.strictEqual(store.alertRetention, 60) // default value
})
