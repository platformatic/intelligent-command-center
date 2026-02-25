'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { startMetrics, startPrometheusK8s, startPrometheusVersionRPS, getControlPlane } = require('./helper')

test('k8s metrics per infrastructure', async (t) => {
  const envOverride = { PLT_METRICS_PROMETHEUS_URL: 'http://localhost:4005/prometheus' }
  await startPrometheusK8s(t, null, '/prometheus/')
  const server = await startMetrics(t, null, envOverride)
  const res = await server.inject({
    method: 'GET',
    url: '/kubernetes/infra'
  })
  assert.equal(res.statusCode, 200)
  const metrics = res.json()
  const expected = {
    cpu: 3.14159,
    memory: 1.721122686,
    totalMemory: 2.721122686
  }
  assert.deepEqual(metrics, expected)
})

test('k8s metrics per application', async (t) => {
  const applicationId = 'test-application-id'
  const controlPlane = getControlPlane(applicationId)

  await startPrometheusK8s(t, applicationId)
  const server = await startMetrics(t, controlPlane)
  const res = await server.inject({
    method: 'GET',
    url: `/kubernetes/apps/${applicationId}`
  })
  assert.equal(res.statusCode, 200)
  const metrics = res.json()

  const expected = {
    cpu: {
      cpuAllAppsUsage: 50,
      cpuAllAppsUsageButApp: 10,
      cpuAppUsage: 40
    },
    memory: {
      avgMemoryAppUsage: 1.721122686,
      memoryAllAppsUsage: 1.721122686,
      memoryAllAppsUsageButApp: 3.721122686,
      memoryAppUsage: 3.721122686,
      totalMemory: 2.721122686
    },
    pods: {
      pods: 3,
      podsAll: 5
    },
    requests: {
      latency: 120
    },
    elu: {
      eluApp: 0
    }
  }
  assert.deepEqual(metrics, expected)
})

test('requests per second per application', async (t) => {
  const applicationId = 'test-application-id'
  const controlPlane = getControlPlane(applicationId)

  await startPrometheusK8s(t, applicationId)
  const server = await startMetrics(t, controlPlane)
  const res = await server.inject({
    method: 'GET',
    url: `/kubernetes/apps/${applicationId}/rps`
  })
  assert.equal(res.statusCode, 200)
  const metrics = res.json()

  const expected = {
    rps: 50.11
  }
  assert.deepEqual(metrics, expected)
})

test('request per second for a specific app version', async (t) => {
  await startPrometheusVersionRPS(t, 'my-app', 'v1', 42.5)
  const server = await startMetrics(t)
  const res = await server.inject({
    method: 'GET',
    url: '/kubernetes/versions/my-app/v1/rps?window=30m'
  })
  assert.equal(res.statusCode, 200)
  const metrics = res.json()
  assert.deepEqual(metrics, { rps: 42.5 })
})

test('request per second for a version with no traffic', async (t) => {
  await startPrometheusVersionRPS(t, 'my-app', 'v1', 0)
  const server = await startMetrics(t)
  const res = await server.inject({
    method: 'GET',
    url: '/kubernetes/versions/my-app/v1/rps?window=30m'
  })
  assert.equal(res.statusCode, 200)
  const metrics = res.json()
  assert.deepEqual(metrics, { rps: 0 })
})

test('request per second for a version with custom window', async (t) => {
  await startPrometheusVersionRPS(t, 'my-app', 'v2', 10.5)
  const server = await startMetrics(t)
  const res = await server.inject({
    method: 'GET',
    url: '/kubernetes/versions/my-app/v2/rps?window=24h'
  })
  assert.equal(res.statusCode, 200)
  const metrics = res.json()
  assert.deepEqual(metrics, { rps: 10.5 })
})
