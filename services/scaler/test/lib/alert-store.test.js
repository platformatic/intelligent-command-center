'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { randomUUID } = require('node:crypto')
const AlertStore = require('../../lib/alert-store')
const { valkeyConnectionString } = require('../helper')

async function setup (t) {
  const mockLogger = { error: () => {} }
  const alertStore = new AlertStore(valkeyConnectionString, mockLogger)

  // Clear Redis data before each test
  const keys = await alertStore.redis.keys('scaler:*')
  if (keys.length > 0) {
    await alertStore.redis.del(keys)
  }

  t.after(async () => {
    // Clear Redis data after each test
    const keys = await alertStore.redis.keys('scaler:*')
    if (keys.length > 0) {
      await alertStore.redis.del(keys)
    }
    await alertStore.close()
  })

  return alertStore
}

// Tests
test('constructor - validates required parameters', async (t) => {
  try {
    // eslint-disable-next-line no-new
    new AlertStore(null, { error: () => {} })
    assert.fail('Should have thrown an error for missing redisUrl')
  } catch (err) {
    assert.strictEqual(err.message, 'Redis URL is required')
  }

  try {
    // eslint-disable-next-line no-new
    new AlertStore('redis://localhost:6343', null)
    assert.fail('Should have thrown an error for missing logger')
  } catch (err) {
    assert.strictEqual(err.message, 'Logger is required')
  }
})

test('saveAlert - saves an alert to Redis with timestamp', async (t) => {
  const alertStore = await setup(t)

  const alert = {
    applicationId: 'test:' + randomUUID(),
    serviceId: randomUUID(),
    podId: randomUUID(),
    elu: 75,
    heapUsed: 100,
    heapTotal: 200
  }

  await alertStore.saveAlert(alert)

  // Verify alert was saved in the application's list
  const appAlertsList = `scaler:${alert.applicationId}:alerts`
  const savedAppAlerts = await alertStore.redis.lrange(appAlertsList, 0, -1)
  assert.strictEqual(savedAppAlerts.length, 1)

  const savedAlert = JSON.parse(savedAppAlerts[0])
  assert.strictEqual(savedAlert.applicationId, alert.applicationId)
  assert.strictEqual(savedAlert.serviceId, alert.serviceId)
  assert.strictEqual(savedAlert.podId, alert.podId)
  assert.strictEqual(savedAlert.elu, alert.elu)
  assert.strictEqual(savedAlert.heapUsed, alert.heapUsed)
  assert.strictEqual(savedAlert.heapTotal, alert.heapTotal)
  assert.ok(savedAlert.timestamp, 'Alert should have a timestamp')
})

test('getAlerts - returns all alerts for an application in chronological order', async (t) => {
  const alertStore = await setup(t)

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

  // Save alerts with a small delay between them
  for (const alert of alerts) {
    await alertStore.saveAlert(alert)
    await new Promise(resolve => setTimeout(resolve, 50)) // Small delay to ensure different timestamps
  }

  const retrievedAlerts = await alertStore.getAlerts(applicationId)
  assert.strictEqual(retrievedAlerts.length, 2)

  // Verify all alerts have timestamps
  for (const alert of retrievedAlerts) {
    assert.ok(alert.timestamp, 'Alert should have a timestamp')
  }

  // Verify the alerts are in reverse chronological order (newest first)
  assert.ok(retrievedAlerts[0].timestamp > retrievedAlerts[1].timestamp,
    'Alerts should be in reverse chronological order')

  // Verify service/pod IDs match our original alerts
  const serviceIds = retrievedAlerts.map(a => a.serviceId)
  const podIds = retrievedAlerts.map(a => a.podId)

  assert.ok(alerts.every(a => serviceIds.includes(a.serviceId)), 'All original service IDs should be present')
  assert.ok(alerts.every(a => podIds.includes(a.podId)), 'All original pod IDs should be present')
})

test('getAlerts - returns empty array for non-existent application', async (t) => {
  const alertStore = await setup(t)

  const nonExistentId = 'test:' + randomUUID()
  const alerts = await alertStore.getAlerts(nonExistentId)
  assert.deepStrictEqual(alerts, [])
})

test('getAlertByPodId - returns all alerts for a podId in chronological order', async (t) => {
  const alertStore = await setup(t)

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

  // Save alerts with a small delay between them
  for (const alert of alerts) {
    await alertStore.saveAlert(alert)
    await new Promise(resolve => setTimeout(resolve, 50)) // Small delay to ensure different timestamps
  }

  // Also save an alert with a different podId to ensure filtering works
  await alertStore.saveAlert({
    applicationId: 'test:' + randomUUID(),
    serviceId: randomUUID(),
    podId: randomUUID(),
    elu: 50,
    heapUsed: 100,
    heapTotal: 200
  })

  const retrievedAlerts = await alertStore.getAlertByPodId(podId)
  assert.strictEqual(retrievedAlerts.length, 2)

  // Verify all alerts have timestamps
  for (const alert of retrievedAlerts) {
    assert.ok(alert.timestamp, 'Alert should have a timestamp')
  }

  // Verify the alerts are in reverse chronological order (newest first)
  assert.ok(retrievedAlerts[0].timestamp > retrievedAlerts[1].timestamp,
    'Alerts should be in reverse chronological order')

  // Verify application IDs match our original alerts
  const applicationIds = retrievedAlerts.map(a => a.applicationId)
  const serviceIds = retrievedAlerts.map(a => a.serviceId)

  assert.ok(alerts.every(a => applicationIds.includes(a.applicationId)), 'All original application IDs should be present')
  assert.ok(alerts.every(a => serviceIds.includes(a.serviceId)), 'All original service IDs should be present')
})

test('getAlertByPodId - returns empty array for non-existent podId', async (t) => {
  const alertStore = await setup(t)
  const alerts = await alertStore.getAlertByPodId(randomUUID())
  assert.deepStrictEqual(alerts, [])
})

test('saveAlert and getAlerts - multiple alerts for same pod/app/service combination', async (t) => {
  const alertStore = await setup(t)

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
    await alertStore.saveAlert(alert)
    await new Promise(resolve => setTimeout(resolve, 50)) // Small delay to ensure different timestamps
  }

  // Get alerts by application ID
  const appAlerts = await alertStore.getAlerts(applicationId)
  assert.strictEqual(appAlerts.length, 2, 'Should store both alerts for the same application')

  // Get alerts by pod ID
  const podAlerts = await alertStore.getAlertByPodId(podId)
  assert.strictEqual(podAlerts.length, 2, 'Should store both alerts for the same pod')
})
