'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { startMetrics, startPrometheusJobs, startPrometheusJob } = require('./helper')

test('jobs metrics', async (t) => {
  const appId = 'test-application-id'
  await startPrometheusJobs(t, appId)
  const server = await startMetrics(t)
  const res = await server.inject({
    method: 'GET',
    url: `/apps/${appId}/jobs`
  })
  assert.equal(res.statusCode, 200)
  const metrics = res.json()

  const expected = {
    sentMessages: 100,
    failures: 10,
    successes: 90,
    totalRetries: 5,
    averageExecutionTime: 2.5
  }
  assert.deepEqual(metrics, expected)
})

test('jobs metric', async (t) => {
  const jobId = 'test-job-id'
  await startPrometheusJob(t, jobId)
  const server = await startMetrics(t)
  const res = await server.inject({
    method: 'GET',
    url: `/jobs/${jobId}`
  })
  assert.equal(res.statusCode, 200)
  const metrics = res.json()

  const expected = {
    sentMessages: 200,
    failures: 20,
    successes: 180,
    totalRetries: 10,
    averageExecutionTime: 5.5
  }
  assert.deepEqual(metrics, expected)
})
