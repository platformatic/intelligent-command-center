'use strict'

const { test } = require('node:test')
const { buildServer, generateK8sHeader, valkeyConnectionString } = require('../helper')
const { randomUUID } = require('node:crypto')
const assert = require('node:assert')
const Redis = require('iovalkey')

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

// Helper function to create a valid alert
function createAlert (applicationId, serviceId) {
  return {
    id: randomUUID(),
    serviceId,
    service: serviceId,
    applicationId,
    currentHealth: {
      elu: 0.5,
      heapUsed: 100,
      heapTotal: 200
    },
    unhealthy: true,
    healthConfig: {
      enabled: true,
      interval: 60,
      gracePeriod: 120,
      maxUnhealthyChecks: 3,
      maxELU: 0.8,
      maxHeapUsed: 150,
      maxHeapTotal: 250
    }
  }
}

test('receive and save alert successfully', async (t) => {
  await cleanRedisData()

  const server = await buildServer(t)
  const podId = 'test-pod-id'
  const applicationId = randomUUID()
  const serviceId = 'test-service-id'
  const alert = createAlert(applicationId, serviceId)

  t.after(async () => {
    await server.close()
    await cleanRedisData()
  })

  const response = await server.inject({
    method: 'POST',
    url: '/alerts',
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    payload: JSON.stringify({
      applicationId,
      alert,
      healthHistory: [alert]
    })
  })

  assert.strictEqual(response.statusCode, 200)
  const responseBody = JSON.parse(response.body)
  assert.deepStrictEqual(responseBody, { success: true })

  // Verify alert was saved by applicationId
  const savedAlertsByApp = await server.store.getAlertsByApplicationId(applicationId)
  assert.strictEqual(savedAlertsByApp.length, 1)
  const savedAlertByApp = savedAlertsByApp[0]
  assert.strictEqual(savedAlertByApp.applicationId, applicationId)
  assert.strictEqual(savedAlertByApp.serviceId, serviceId)
  assert.strictEqual(savedAlertByApp.podId, podId)
  assert.strictEqual(savedAlertByApp.elu, alert.currentHealth.elu)
  assert.strictEqual(savedAlertByApp.heapUsed, alert.currentHealth.heapUsed)
  assert.strictEqual(savedAlertByApp.heapTotal, alert.currentHealth.heapTotal)

  // Verify alert was saved by podId
  const savedAlertsByPod = await server.store.getAlertsByPodId(podId)
  assert.strictEqual(savedAlertsByPod.length, 1)
  const savedAlertByPod = savedAlertsByPod[0]
  assert.strictEqual(savedAlertByPod.applicationId, applicationId)
  assert.strictEqual(savedAlertByPod.serviceId, serviceId)
  assert.strictEqual(savedAlertByPod.podId, podId)
  assert.strictEqual(savedAlertByPod.elu, alert.currentHealth.elu)
  assert.strictEqual(savedAlertByPod.heapUsed, alert.currentHealth.heapUsed)
  assert.strictEqual(savedAlertByPod.heapTotal, alert.currentHealth.heapTotal)
})

test('receive multiple alerts for the same pod', async (t) => {
  await cleanRedisData()

  const server = await buildServer(t)
  const podId = 'test-pod-multiple-alerts'
  const applicationId = randomUUID()
  const serviceId = 'test-service-id'

  t.after(async () => {
    await server.close()
    await cleanRedisData()
  })

  // Send first alert
  const alert1 = createAlert(applicationId, serviceId)
  alert1.currentHealth.elu = 0.3
  alert1.currentHealth.heapUsed = 80
  alert1.currentHealth.heapTotal = 160

  await server.inject({
    method: 'POST',
    url: '/alerts',
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    payload: JSON.stringify({
      applicationId,
      alert: alert1,
      healthHistory: [alert1]
    })
  })

  // Small delay to ensure different timestamps
  await new Promise(resolve => setTimeout(resolve, 50))

  // Send second alert with different health metrics
  const alert2 = createAlert(applicationId, serviceId)
  alert2.currentHealth.elu = 0.7
  alert2.currentHealth.heapUsed = 120
  alert2.currentHealth.heapTotal = 240

  await server.inject({
    method: 'POST',
    url: '/alerts',
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    payload: JSON.stringify({
      applicationId,
      alert: alert2,
      healthHistory: [alert1, alert2]
    })
  })

  // Verify alerts were saved correctly
  const savedAlerts = await server.store.getAlertsByPodId(podId)
  assert.strictEqual(savedAlerts.length, 2, 'Both alerts should be saved')

  const firstAlert = savedAlerts[0]
  const secondAlert = savedAlerts[1]

  assert.strictEqual(firstAlert.elu, alert1.currentHealth.elu)
  assert.strictEqual(firstAlert.heapUsed, alert1.currentHealth.heapUsed)
  assert.strictEqual(firstAlert.heapTotal, alert1.currentHealth.heapTotal)

  assert.strictEqual(secondAlert.elu, alert2.currentHealth.elu)
  assert.strictEqual(secondAlert.heapUsed, alert2.currentHealth.heapUsed)
  assert.strictEqual(secondAlert.heapTotal, alert2.currentHealth.heapTotal)

  assert.ok(firstAlert.timestamp, 'First alert should have a timestamp')
  assert.ok(secondAlert.timestamp, 'Second alert should have a timestamp')
  assert.ok(firstAlert.timestamp < secondAlert.timestamp, 'First alert should have an older timestamp')
})

test('fail when missing k8s context', async (t) => {
  await cleanRedisData()

  const server = await buildServer(t)
  const applicationId = randomUUID()
  const serviceId = 'test-service-id'
  const alert = createAlert(applicationId, serviceId)

  t.after(async () => {
    await server.close()
    await cleanRedisData()
  })

  const response = await server.inject({
    method: 'POST',
    url: '/alerts',
    headers: {
      'content-type': 'application/json'
      // No x-k8s header
    },
    payload: JSON.stringify({
      alert,
      healthHistory: [alert]
    })
  })

  assert.strictEqual(response.statusCode, 500)
  const errorBody = JSON.parse(response.body)
  assert.ok(errorBody.message.includes('Missing k8s context'))
})
