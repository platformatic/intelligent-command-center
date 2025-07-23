'use strict'

const { test } = require('node:test')
const { buildServer, cleanValkeyData } = require('../helper')
const { randomUUID } = require('node:crypto')
const assert = require('node:assert')
const { setTimeout: sleep } = require('node:timers/promises')

test('should save alerts through the store decorator', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  const applicationId = 'test:' + randomUUID()
  const serviceId = randomUUID()
  const podId = randomUUID()

  const alert = {
    applicationId,
    serviceId,
    podId,
    elu: 85,
    heapUsed: 170,
    heapTotal: 340
  }

  await server.store.saveAlert(alert)

  const alerts = await server.store.getAlertsByApplicationId(applicationId)
  assert.strictEqual(alerts.length, 1)

  // Check main properties
  const savedAlert = alerts[0]
  assert.strictEqual(savedAlert.applicationId, alert.applicationId)
  assert.strictEqual(savedAlert.serviceId, alert.serviceId)
  assert.strictEqual(savedAlert.podId, alert.podId)
  assert.strictEqual(savedAlert.elu, alert.elu)
  assert.strictEqual(savedAlert.heapUsed, alert.heapUsed)
  assert.strictEqual(savedAlert.heapTotal, alert.heapTotal)

  // Verify timestamp was added
  assert.ok(savedAlert.timestamp, 'Alert should have a timestamp')
})

test('should get alerts by applicationId in chronological order', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

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

  // Save alerts with a delay between them
  for (const alert of alerts) {
    await server.store.saveAlert(alert)
    await sleep(50) // Small delay to ensure different timestamps
  }

  const retrievedAlerts = await server.store.getAlertsByApplicationId(applicationId)
  assert.strictEqual(retrievedAlerts.length, 2)

  // Verify all alerts have timestamps
  for (const alert of retrievedAlerts) {
    assert.ok(alert.timestamp, 'Alert should have a timestamp')
  }

  // Verify the alerts are in chronological order (oldest first)
  assert.ok(retrievedAlerts[0].timestamp < retrievedAlerts[1].timestamp,
    'Alerts should be in chronological order')

  // Verify service/pod IDs match our original alerts
  const serviceIds = retrievedAlerts.map(a => a.serviceId)
  const podIds = retrievedAlerts.map(a => a.podId)

  assert.ok(alerts.every(a => serviceIds.includes(a.serviceId)), 'All original service IDs should be present')
  assert.ok(alerts.every(a => podIds.includes(a.podId)), 'All original pod IDs should be present')
})

test('should get alerts by podId in chronological order', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

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

  // Save alerts with a delay between them
  for (const alert of alerts) {
    await server.store.saveAlert(alert)
    await sleep(50) // Small delay to ensure different timestamps
  }

  // Also save an alert with a different podId to ensure filtering works
  await server.store.saveAlert({
    applicationId: 'test:' + randomUUID(),
    serviceId: randomUUID(),
    podId: randomUUID(),
    elu: 50,
    heapUsed: 100,
    heapTotal: 200
  })

  const retrievedAlerts = await server.store.getAlertsByPodId(podId)
  assert.strictEqual(retrievedAlerts.length, 2)

  // Verify all alerts have timestamps
  for (const alert of retrievedAlerts) {
    assert.ok(alert.timestamp, 'Alert should have a timestamp')
  }

  // Verify the alerts are in chronological order (oldest first)
  assert.ok(retrievedAlerts[0].timestamp < retrievedAlerts[1].timestamp,
    'Alerts should be in chronological order')

  // Verify application IDs match our original alerts
  const applicationIds = retrievedAlerts.map(a => a.applicationId)
  const serviceIds = retrievedAlerts.map(a => a.serviceId)

  assert.ok(alerts.every(a => applicationIds.includes(a.applicationId)), 'All original application IDs should be present')
  assert.ok(alerts.every(a => serviceIds.includes(a.serviceId)), 'All original service IDs should be present')
})

test('should store multiple alerts for the same pod/app/service', async (t) => {
  await cleanValkeyData()

  const server = await buildServer(t)
  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  const applicationId = 'test:' + randomUUID()
  const serviceId = randomUUID()
  const podId = randomUUID()

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
    await server.store.saveAlert(alert)
    await sleep(50) // Small delay to ensure different timestamps
  }

  const appAlerts = await server.store.getAlertsByApplicationId(applicationId)
  assert.strictEqual(appAlerts.length, 2, 'Should store both alerts for the same application')

  const podAlerts = await server.store.getAlertsByPodId(podId)
  assert.strictEqual(podAlerts.length, 2, 'Should store both alerts for the same pod')

  // Verify metrics match in chronological order (oldest first)
  assert.strictEqual(podAlerts[0].elu, 50)
  assert.strictEqual(podAlerts[0].heapUsed, 100)
  assert.strictEqual(podAlerts[1].elu, 75)
  assert.strictEqual(podAlerts[1].heapUsed, 150)
})

test('should trigger scaler when alert is unhealthy', async (t) => {
  await cleanValkeyData()

  const notifications = []
  const server = await buildServer(t)

  const originalNotifyScaler = server.notifyScaler
  server.notifyScaler = async function (podId) {
    notifications.push(podId)
    await originalNotifyScaler(podId)
  }

  t.after(async () => {
    server.notifyScaler = originalNotifyScaler
    await server.close()
    await cleanValkeyData()
  })

  const applicationId = randomUUID()
  const serviceId = randomUUID()
  const podId = randomUUID()

  const unhealthyAlert = {
    applicationId,
    serviceId,
    podId,
    elu: 95,
    heapUsed: 190,
    heapTotal: 380,
    unhealthy: true
  }

  await server.processAlert(unhealthyAlert)

  assert.strictEqual(notifications.length, 1, 'The scaler should have been notified')
  assert.strictEqual(notifications[0], podId, 'The scaler should have been notified with the correct podId')

  notifications.length = 0 // Clear the array

  const healthyAlert = {
    applicationId,
    serviceId,
    podId,
    elu: 50,
    heapUsed: 100,
    heapTotal: 200,
    unhealthy: false
  }

  await server.processAlert(healthyAlert)

  assert.strictEqual(notifications.length, 0, 'The scaler should not have been notified for a healthy alert')
})

test('should debounce multiple unhealthy alerts for the same pod', async (t) => {
  await cleanValkeyData()

  const notifications = []
  const server = await buildServer(t)

  server.alertsManager.clearRecentTriggers()

  // Set a shorter debounce window for testing
  server.alertsManager.setDebounceWindow(5000) // 5 seconds

  const originalNotifyScaler = server.notifyScaler
  server.notifyScaler = async function (podId) {
    notifications.push(podId)
    await originalNotifyScaler(podId)
  }

  t.after(async () => {
    server.notifyScaler = originalNotifyScaler
    await server.close()
    await cleanValkeyData()
  })

  const applicationId = randomUUID()
  const serviceId = randomUUID()
  const podId = randomUUID()

  const unhealthyAlert = {
    applicationId,
    serviceId,
    podId,
    elu: 95,
    heapUsed: 190,
    heapTotal: 380,
    unhealthy: true
  }

  // First unhealthy alert should trigger the scaler
  await server.processAlert(unhealthyAlert)
  assert.strictEqual(notifications.length, 1, 'The scaler should have been notified for the first unhealthy alert')

  // Second unhealthy alert for the same pod within the debounce window should not trigger
  await server.processAlert({ ...unhealthyAlert, elu: 97 })
  assert.strictEqual(notifications.length, 1, 'The scaler should not have been notified again within debounce window')

  // Different pod should still trigger even within debounce window
  const differentPodId = randomUUID()
  await server.processAlert({ ...unhealthyAlert, podId: differentPodId })
  assert.strictEqual(notifications.length, 2, 'The scaler should be notified for a different pod')
  assert.strictEqual(notifications[1], differentPodId, 'The second notification should be for the different pod')

  // Set an older timestamp for podId to simulate passage of time
  const now = Date.now()
  const oldTimestamp = now - server.alertsManager.debounceWindow - 1000 // 1 second past the window
  await server.alertsManager.setLastTriggeredTime(podId, oldTimestamp)

  notifications.length = 0

  // Now the next alert should trigger again because it's outside the debounce window
  await server.processAlert(unhealthyAlert)
  assert.strictEqual(notifications.length, 1, 'The scaler should be notified after debounce window expires')
})
