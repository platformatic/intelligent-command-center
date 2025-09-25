'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const {
  startControlPlane,
  startActivities,
  startMetrics,
  startMachinist,
  startMainService,
  startCompliance,
  startTrafficInspector,
  startScaler,
  generateK8sHeader
} = require('./helper')

test('should return trafficante URL for apiVersion v2', async (t) => {
  const applicationName = 'test-app'
  const podId = randomUUID()
  const imageId = randomUUID()

  await startActivities(t)
  await startCompliance(t)
  await startMetrics(t)
  await startScaler(t)
  await startMainService(t)
  await startTrafficInspector(t)
  await startMachinist(t, {
    getPodDetails: () => ({ image: imageId })
  })

  const controlPlane = await startControlPlane(t)

  // Test with apiVersion v2 (default)
  const { statusCode: statusCodeV2, body: bodyV2 } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: { applicationName, apiVersion: 'v2' }
  })

  assert.strictEqual(statusCodeV2, 200, bodyV2)
  const responseV2 = JSON.parse(bodyV2)

  // For v2, should have trafficante key
  assert.ok(responseV2.iccServices.trafficante, 'Should have trafficante key for v2')
  assert.strictEqual(responseV2.iccServices.trafficante.url, 'http://localhost:3033')
  assert.ok(!responseV2.iccServices.trafficInspector, 'Should not have trafficInspector key for v2')
})

test('should return trafficInspector URL for apiVersion v3', async (t) => {
  const applicationName = 'test-app-v3'
  const podId = randomUUID()
  const imageId = randomUUID()

  await startActivities(t)
  await startCompliance(t)
  await startMetrics(t)
  await startScaler(t)
  await startMainService(t)
  await startTrafficInspector(t)
  await startMachinist(t, {
    getPodDetails: () => ({ image: imageId })
  })

  const controlPlane = await startControlPlane(t)

  // Test with apiVersion v3
  const { statusCode: statusCodeV3, body: bodyV3 } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: { applicationName, apiVersion: 'v3' }
  })

  assert.strictEqual(statusCodeV3, 200, bodyV3)
  const responseV3 = JSON.parse(bodyV3)

  // For v3, should have trafficInspector key
  assert.ok(responseV3.iccServices.trafficInspector, 'Should have trafficInspector key for v3')
  assert.strictEqual(responseV3.iccServices.trafficInspector.url, 'http://localhost:3033')
  assert.ok(!responseV3.iccServices.trafficante, 'Should not have trafficante key for v3')
})

test('should default to v2 when apiVersion is not provided', async (t) => {
  const applicationName = 'test-app-default'
  const podId = randomUUID()
  const imageId = randomUUID()

  await startActivities(t)
  await startCompliance(t)
  await startMetrics(t)
  await startScaler(t)
  await startMainService(t)
  await startTrafficInspector(t)
  await startMachinist(t, {
    getPodDetails: () => ({ image: imageId })
  })

  const controlPlane = await startControlPlane(t)

  // Test without apiVersion (should default to v2)
  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: { applicationName }
  })

  assert.strictEqual(statusCode, 200, body)
  const response = JSON.parse(body)

  // Should default to v2, so should have trafficante key
  assert.ok(response.iccServices.trafficante, 'Should have trafficante key for default (v2)')
  assert.strictEqual(response.iccServices.trafficante.url, 'http://localhost:3033')
  assert.ok(!response.iccServices.trafficInspector, 'Should not have trafficInspector key for default (v2)')
})

test('should keep other service URLs unchanged for both apiVersions', async (t) => {
  const podIdV2 = randomUUID()
  const podIdV3 = randomUUID()
  const applicationNameV2 = 'test-app-services-v2'
  const applicationNameV3 = 'test-app-services-v3'
  const imageId = randomUUID()

  await startActivities(t)
  await startCompliance(t)
  await startMetrics(t)
  await startScaler(t)
  await startMainService(t)
  await startTrafficInspector(t)
  await startMachinist(t, {
    getPodDetails: () => ({ image: imageId })
  })

  const controlPlane = await startControlPlane(t)

  // Test v2
  const { statusCode: statusV2, body: bodyV2 } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podIdV2}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podIdV2)
    },
    body: { applicationName: applicationNameV2, apiVersion: 'v2' }
  })

  assert.strictEqual(statusV2, 200, bodyV2)
  const responseV2 = JSON.parse(bodyV2)

  // Test v3
  const { statusCode: statusV3, body: bodyV3 } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podIdV3}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podIdV3)
    },
    body: { applicationName: applicationNameV3, apiVersion: 'v3' }
  })

  assert.strictEqual(statusV3, 200, bodyV3)
  const responseV3 = JSON.parse(bodyV3)

  // Check that all other services remain unchanged
  const commonServices = ['activities', 'compliance', 'cron', 'metrics', 'riskEngine', 'riskManager', 'riskService', 'scaler', 'userManager']

  for (const service of commonServices) {
    assert.ok(responseV2.iccServices[service], `v2 should have ${service}`)
    assert.ok(responseV3.iccServices[service], `v3 should have ${service}`)
    assert.strictEqual(responseV2.iccServices[service].url, responseV3.iccServices[service].url, `${service} URLs should match`)
  }
})
