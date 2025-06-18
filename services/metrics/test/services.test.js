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
