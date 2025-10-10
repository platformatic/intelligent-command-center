'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { startMetrics, startPrometheus, startPrometheusWithNoValues } = require('./helper')

test('get services metrics', async (t) => {
  await startPrometheus(t)
  const server = await startMetrics(t)
  const applications = [
    {
      id: 'test-application-id',
      name: 'test-application'
    }
  ]

  const res = await server.inject({
    method: 'POST',
    url: '/services',
    body: { applications }
  })
  const metrics = res.json()
  assert.equal(res.statusCode, 200)
  const expected = {
    averageCallsCount: 666,
    overall50pLatency: 222,
    overall95pLatency: 333,
    servicesLinks: {
      X: {
        'test-application-test-service-id': {
          count: 111,
          latency: 1.783783783783784
        }
      }
    }
  }
  assert.deepEqual(metrics, expected)
})

test('get services metrics with undefined values from prometheus', async (t) => {
  await startPrometheusWithNoValues(t)
  const server = await startMetrics(t)
  const applications = [
    {
      id: 'test-application-id',
      name: 'test-application'
    }
  ]

  const res = await server.inject({
    method: 'POST',
    url: '/services',
    body: { applications }
  })
  const metrics = res.json()
  assert.equal(res.statusCode, 200)
  const expected = {
    averageCallsCount: 0,
    overall50pLatency: 0,
    overall95pLatency: 0,
    servicesLinks: {
      X: {}
    }
  }
  assert.deepEqual(metrics, expected)
})

test('get thread count per pod for an application', async (t) => {
  const appId = 'test-app-id'
  const prometheus = require('fastify')({ keepAliveTimeout: 1 })
  const formBody = require('@fastify/formbody')
  prometheus.register(formBody)
  t.after(() => prometheus.close())

  prometheus.post('/api/v1/query', async (req, reply) => {
    const { query } = req.body

    if (query.includes('nodejs_eventloop_utilization')) {
      return {
        status: 'success',
        data: {
          resultType: 'vector',
          result: [
            {
              metric: {
                applicationId: appId,
                serviceId: 'service-1',
                instanceId: 'pod-1'
              },
              value: [1721122686.143, 0.5]
            },
            {
              metric: {
                applicationId: appId,
                serviceId: 'service-1',
                instanceId: 'pod-1',
                workerId: '1'
              },
              value: [1721122686.143, 0.6]
            },
            {
              metric: {
                applicationId: appId,
                serviceId: 'service-1',
                instanceId: 'pod-2',
                workerId: '0'
              },
              value: [1721122686.143, 0.4]
            },
            {
              metric: {
                applicationId: appId,
                serviceId: 'service-2',
                instanceId: 'pod-3'
              },
              value: [1721122686.143, 0.7]
            }
          ]
        }
      }
    }

    return {
      status: 'success',
      data: { resultType: 'vector', result: [] }
    }
  })

  await prometheus.listen({ port: 4005 })

  const server = await startMetrics(t)

  const res = await server.inject({
    method: 'GET',
    url: `/apps/${appId}/threads`
  })

  assert.equal(res.statusCode, 200)
  const threadCounts = res.json()

  const expected = {
    'service-1': {
      'pod-1': 2,
      'pod-2': 1
    },
    'service-2': {
      'pod-3': 1
    }
  }

  assert.deepEqual(threadCounts, expected)
})

test('get thread count returns empty object when no data from prometheus', async (t) => {
  const appId = 'non-existent-app-id'
  const prometheus = require('fastify')({ keepAliveTimeout: 1 })
  const formBody = require('@fastify/formbody')
  prometheus.register(formBody)
  t.after(() => prometheus.close())

  prometheus.post('/api/v1/query', async (req, reply) => {
    return {
      status: 'success',
      data: {
        resultType: 'vector',
        result: []
      }
    }
  })

  await prometheus.listen({ port: 4005 })

  const server = await startMetrics(t)

  const res = await server.inject({
    method: 'GET',
    url: `/apps/${appId}/threads`
  })

  assert.equal(res.statusCode, 200)
  const body = res.json()
  assert.deepEqual(body, {})
})

test('get thread count returns 503 when prometheus is unavailable', async (t) => {
  const server = await startMetrics(t, null, {
    PLT_METRICS_PROMETHEUS_URL: 'http://localhost:9999'
  })

  const res = await server.inject({
    method: 'GET',
    url: '/apps/test-app-id/threads'
  })

  assert.equal(res.statusCode, 503)
  const body = res.json()
  assert.ok(body.message.includes('Failed to query Prometheus'))
})
