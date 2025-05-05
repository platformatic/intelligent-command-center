'use strict'

const test = require('node:test')
const { buildServer, valkeyConnectionString } = require('../helper')
const { randomUUID } = require('node:crypto')
const assert = require('node:assert')
const Redis = require('iovalkey')
const { setTimeout: sleep } = require('node:timers/promises')

// Helper function to clean Redis data
async function cleanRedisData () {
  const redis = new Redis(valkeyConnectionString)
  try {
    const keys = await redis.keys('scaler:*')
    if (keys.length > 0) {
      await redis.del(keys)
    }
  } finally {
    await redis.quit()
  }
}

test('should save alerts through the alertStore decorator', async (t) => {
  await cleanRedisData()

  const server = await buildServer(t)
  t.after(async () => {
    await server.close()
    await cleanRedisData()
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

  await server.alertStore.saveAlert(alert)

  const alerts = await server.alertStore.getAlerts(applicationId)
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
  await cleanRedisData()

  const server = await buildServer(t)
  t.after(async () => {
    await server.close()
    await cleanRedisData()
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
    await server.alertStore.saveAlert(alert)
    await sleep(50) // Small delay to ensure different timestamps
  }

  const retrievedAlerts = await server.alertStore.getAlerts(applicationId)
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

test('should get alerts by podId in chronological order', async (t) => {
  await cleanRedisData()

  const server = await buildServer(t)
  t.after(async () => {
    await server.close()
    await cleanRedisData()
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
    await server.alertStore.saveAlert(alert)
    await sleep(50) // Small delay to ensure different timestamps
  }

  // Also save an alert with a different podId to ensure filtering works
  await server.alertStore.saveAlert({
    applicationId: 'test:' + randomUUID(),
    serviceId: randomUUID(),
    podId: randomUUID(),
    elu: 50,
    heapUsed: 100,
    heapTotal: 200
  })

  const retrievedAlerts = await server.alertStore.getAlertByPodId(podId)
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

test('should store multiple alerts for the same pod/app/service', async (t) => {
  await cleanRedisData()

  const server = await buildServer(t)
  t.after(async () => {
    await server.close()
    await cleanRedisData()
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
    await server.alertStore.saveAlert(alert)
    await new Promise(resolve => setTimeout(resolve, 50)) // Small delay to ensure different timestamps
  }

  const appAlerts = await server.alertStore.getAlerts(applicationId)
  assert.strictEqual(appAlerts.length, 2, 'Should store both alerts for the same application')

  const podAlerts = await server.alertStore.getAlertByPodId(podId)
  assert.strictEqual(podAlerts.length, 2, 'Should store both alerts for the same pod')

  // Verify metrics match in reverse order (newest first)
  assert.strictEqual(podAlerts[0].elu, 75)
  assert.strictEqual(podAlerts[0].heapUsed, 150)
  assert.strictEqual(podAlerts[1].elu, 50)
  assert.strictEqual(podAlerts[1].heapUsed, 100)
})
