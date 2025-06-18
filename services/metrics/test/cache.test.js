'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { startMetrics, startPrometheusCache } = require('./helper')

test('cache metrics per application', async (t) => {
  const applicationId = 'test-application-id'

  await startPrometheusCache(t, applicationId)
  const server = await startMetrics(t)
  const res = await server.inject({
    method: 'GET',
    url: `/cache/apps/${applicationId}`
  })
  assert.equal(res.statusCode, 200)
  const metrics = res.json()

  const expected =
  [
    {
      date: '2024-07-16T09:38:06.143Z',
      hit: 10,
      miss: 2
    }
  ]

  assert.deepEqual(metrics, expected)
})

test('cache metrics', async (t) => {
  await startPrometheusCache(t)
  const server = await startMetrics(t)
  const res = await server.inject({
    method: 'GET',
    url: '/cache'
  })
  assert.equal(res.statusCode, 200)
  const metrics = res.json()

  const expected =
  [
    {
      date: '2024-07-16T09:38:06.143Z',
      hit: 100,
      miss: 20
    }
  ]

  assert.deepEqual(metrics, expected)
})
