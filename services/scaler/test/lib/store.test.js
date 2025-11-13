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
  const time = await store.getLastScalingTime('app-1')
  assert.strictEqual(time, 0)
})

test('saveLastScalingTime and getLastScalingTime store and retrieve data correctly', async (t) => {
  const store = await setup(t)
  const testTime = 1620000000

  await store.saveLastScalingTime('app-1', testTime)
  const loadedTime = await store.getLastScalingTime('app-1')

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

  const time = await store.getLastScalingTime('test-app')

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

  await store.saveLastScalingTime('test-app', 123456)

  // Should log error
  assert.strictEqual(logCalls.length, 1)
  assert.strictEqual(logCalls[0].level, 'error')
  assert.strictEqual(logCalls[0].message, 'Failed to save last scaling time')
})

// Test predictions functionality
test('savePredictions and getPredictions - store and retrieve predictions correctly', async (t) => {
  const store = await setup(t)

  const predictions = [
    {
      applicationId: 'app-1',
      absoluteTime: 1620000000,
      action: 'up',
      pods: 2,
      confidence: 0.9,
      reasons: { event_count: 10 }
    },
    {
      applicationId: 'app-2',
      absoluteTime: 1620000100,
      action: 'down',
      pods: 1,
      confidence: 0.8,
      reasons: { event_count: 5 }
    }
  ]

  await store.savePredictions(predictions)
  const loadedPredictions = await store.getPredictions()

  assert.deepStrictEqual(loadedPredictions, predictions)
})

test('getPredictions - returns empty array when no predictions exist', async (t) => {
  const store = await setup(t)

  const predictions = await store.getPredictions()
  assert.deepStrictEqual(predictions, [])
})

test('savePredictions - filters out predictions without applicationId and sorts by absoluteTime', async (t) => {
  const store = await setup(t)

  const predictions = [
    {
      applicationId: 'app-1',
      absoluteTime: 1620000200,
      action: 'up',
      pods: 3
    },
    {
      // Missing applicationId - should be filtered out
      absoluteTime: 1620000150,
      action: 'down',
      pods: 1
    },
    {
      applicationId: 'app-2',
      absoluteTime: 1620000100,
      action: 'up',
      pods: 2
    }
  ]

  await store.savePredictions(predictions)
  const loadedPredictions = await store.getPredictions()

  // Should have only 2 predictions (filtered out the one without applicationId)
  assert.strictEqual(loadedPredictions.length, 2)

  // Should be sorted by absoluteTime
  assert.strictEqual(loadedPredictions[0].applicationId, 'app-2')
  assert.strictEqual(loadedPredictions[0].absoluteTime, 1620000100)
  assert.strictEqual(loadedPredictions[1].applicationId, 'app-1')
  assert.strictEqual(loadedPredictions[1].absoluteTime, 1620000200)
})

test('getApplicationPredictions - returns predictions for specific application', async (t) => {
  const store = await setup(t)

  const predictions = [
    {
      applicationId: 'app-1',
      absoluteTime: 1620000000,
      action: 'up',
      pods: 2
    },
    {
      applicationId: 'app-2',
      absoluteTime: 1620000100,
      action: 'down',
      pods: 1
    },
    {
      applicationId: 'app-1',
      absoluteTime: 1620000200,
      action: 'down',
      pods: 1
    }
  ]

  await store.savePredictions(predictions)

  const app1Predictions = await store.getApplicationPredictions('app-1')
  assert.strictEqual(app1Predictions.length, 2)
  assert.ok(app1Predictions.every(p => p.applicationId === 'app-1'))

  const app2Predictions = await store.getApplicationPredictions('app-2')
  assert.strictEqual(app2Predictions.length, 1)
  assert.strictEqual(app2Predictions[0].applicationId, 'app-2')

  const nonExistentPredictions = await store.getApplicationPredictions('app-3')
  assert.strictEqual(nonExistentPredictions.length, 0)
})

test('getNextPrediction - returns first prediction from sorted list', async (t) => {
  const store = await setup(t)

  const predictions = [
    {
      applicationId: 'app-1',
      absoluteTime: 1620000200,
      action: 'up',
      pods: 3
    },
    {
      applicationId: 'app-2',
      absoluteTime: 1620000100,
      action: 'up',
      pods: 2
    }
  ]

  await store.savePredictions(predictions)

  const nextPrediction = await store.getNextPrediction()
  assert.ok(nextPrediction)
  assert.strictEqual(nextPrediction.applicationId, 'app-2')
  assert.strictEqual(nextPrediction.absoluteTime, 1620000100)
})

test('getNextPrediction - returns null when no predictions exist', async (t) => {
  const store = await setup(t)

  const nextPrediction = await store.getNextPrediction()
  assert.strictEqual(nextPrediction, null)
})

test('removePrediction - removes matching prediction', async (t) => {
  const store = await setup(t)

  const predictions = [
    {
      applicationId: 'app-1',
      absoluteTime: 1620000000,
      action: 'up',
      pods: 2
    },
    {
      applicationId: 'app-2',
      absoluteTime: 1620000100,
      action: 'down',
      pods: 1
    }
  ]

  await store.savePredictions(predictions)

  const predictionToRemove = {
    applicationId: 'app-1',
    absoluteTime: 1620000000,
    action: 'up',
    pods: 2
  }

  const remainingPredictions = await store.removePrediction(predictionToRemove)

  assert.strictEqual(remainingPredictions.length, 1)
  assert.strictEqual(remainingPredictions[0].applicationId, 'app-2')

  // Verify it was actually removed from storage
  const storedPredictions = await store.getPredictions()
  assert.strictEqual(storedPredictions.length, 1)
  assert.strictEqual(storedPredictions[0].applicationId, 'app-2')
})

test('replaceApplicationPredictions - replaces predictions for specific application', async (t) => {
  const store = await setup(t)

  const initialPredictions = [
    {
      applicationId: 'app-1',
      absoluteTime: 1620000000,
      action: 'up',
      pods: 2
    },
    {
      applicationId: 'app-2',
      absoluteTime: 1620000100,
      action: 'down',
      pods: 1
    }
  ]

  await store.savePredictions(initialPredictions)

  const newApp1Predictions = [
    {
      absoluteTime: 1620000300,
      action: 'up',
      pods: 3
    },
    {
      absoluteTime: 1620000400,
      action: 'down',
      pods: 2
    }
  ]

  const result = await store.replaceApplicationPredictions('app-1', newApp1Predictions)

  // Should have 3 predictions total (1 for app-2, 2 new for app-1)
  assert.strictEqual(result.length, 3)

  // Verify the new predictions have applicationId added
  const app1Predictions = result.filter(p => p.applicationId === 'app-1')
  assert.strictEqual(app1Predictions.length, 2)
  assert.ok(app1Predictions.every(p => p.applicationId === 'app-1'))

  // Verify app-2 prediction is still there
  const app2Predictions = result.filter(p => p.applicationId === 'app-2')
  assert.strictEqual(app2Predictions.length, 1)

  // Verify it was actually updated in storage
  const storedPredictions = await store.getPredictions()
  assert.strictEqual(storedPredictions.length, 3)
})

// Test error handling for predictions
test('savePredictions - handles Redis errors gracefully', async (t) => {
  const logCalls = []
  const mockLogger = {
    error: (data, message) => logCalls.push({ level: 'error', data, message }),
    info: () => {},
    warn: () => {}
  }

  const store = new Store(valkeyConnectionString, mockLogger)

  // Close the connection to simulate an error
  await store.valkey.quit()

  await store.savePredictions([{ applicationId: 'test', absoluteTime: 123 }])

  // Should log error
  assert.strictEqual(logCalls.length, 1)
  assert.strictEqual(logCalls[0].level, 'error')
  assert.strictEqual(logCalls[0].message, 'Failed to save predictions')
})

test('getPredictions - handles Redis errors gracefully', async (t) => {
  const logCalls = []
  const mockLogger = {
    error: (data, message) => logCalls.push({ level: 'error', data, message }),
    info: () => {},
    warn: () => {}
  }

  const store = new Store(valkeyConnectionString, mockLogger)

  // Close the connection to simulate an error
  await store.valkey.quit()

  const predictions = await store.getPredictions()

  // Should return empty array and log error
  assert.deepStrictEqual(predictions, [])
  assert.strictEqual(logCalls.length, 1)
  assert.strictEqual(logCalls[0].level, 'error')
  assert.strictEqual(logCalls[0].message, 'Failed to get predictions')
})

test('removePrediction - handles Redis errors gracefully', async (t) => {
  const logCalls = []
  const mockLogger = {
    error: (data, message) => logCalls.push({ level: 'error', data, message }),
    info: () => {},
    warn: () => {}
  }

  const store = new Store(valkeyConnectionString, mockLogger)

  // Close the connection to simulate an error
  await store.valkey.quit()

  const result = await store.removePrediction({ applicationId: 'test', absoluteTime: 123, action: 'up', pods: 1 })

  // Should return empty array and log error (may be from getPredictions or savePredictions)
  assert.deepStrictEqual(result, [])
  assert.ok(logCalls.length >= 1, 'Should have at least one error log')
  // The error could be from getPredictions or savePredictions since removePrediction calls both
  const errorMessages = logCalls.map(log => log.message)
  assert.ok(
    errorMessages.includes('Failed to get predictions') ||
    errorMessages.includes('Failed to save predictions') ||
    errorMessages.includes('Failed to remove prediction'),
    'Should log a relevant error message'
  )
})

test('replaceApplicationPredictions - handles Redis errors gracefully', async (t) => {
  const logCalls = []
  const mockLogger = {
    error: (data, message) => logCalls.push({ level: 'error', data, message }),
    info: () => {},
    warn: () => {}
  }

  const store = new Store(valkeyConnectionString, mockLogger)

  // Close the connection immediately to simulate Redis error
  await store.valkey.quit()

  const result = await store.replaceApplicationPredictions('test-app', [{ absoluteTime: 123, action: 'up', pods: 1 }])

  // Since getPredictions and savePredictions handle their own errors internally,
  // the method continues and returns the new predictions despite errors
  assert.deepStrictEqual(result, [{ absoluteTime: 123, action: 'up', pods: 1, applicationId: 'test-app' }])
  assert.ok(logCalls.length >= 2, 'Should have at least two error logs')
  // There should be errors from both getPredictions and savePredictions
  const errorMessages = logCalls.map(log => log.message)
  assert.ok(
    errorMessages.includes('Failed to get predictions'),
    'Should log getPredictions error'
  )
  assert.ok(
    errorMessages.includes('Failed to save predictions'),
    'Should log savePredictions error'
  )
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
