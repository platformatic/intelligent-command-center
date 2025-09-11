'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { startMetrics, startPrometheusK8s, getControlPlane } = require('./helper')

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
