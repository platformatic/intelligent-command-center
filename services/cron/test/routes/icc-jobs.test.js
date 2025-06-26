'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { EventEmitter } = require('events')
const Fastify = require('fastify')

const { buildServer } = require('../helper')

test('GET job by name that does not exist must return 404', async (t) => {
  const server = await buildServer(t)

  const res = await server.inject({
    method: 'GET',
    url: '/icc-jobs/test'
  })
  const { statusCode } = res
  assert.equal(statusCode, 404)
})

test('Change a job schedule', async (t) => {
  const server = await buildServer(t, { PLT_FEATURE_RISK_SERVICE_DUMP: true })
  const jobName = 'risk-service-dump'

  const ee = new EventEmitter()

  const target = Fastify()
  target.post('/', async (req, reply) => {
    ee.emit('called')
    return { ok: true }
  })

  const newSchedule = '* * */1 * * *'
  const res = await server.inject({
    method: 'PUT',
    url: `/icc-jobs/${jobName}`,
    payload: {
      schedule: newSchedule
    }
  })
  const { statusCode, body } = res
  const job = JSON.parse(body)

  assert.equal(statusCode, 200)
  assert.equal(job.schedule, newSchedule)
})

test('GET job by name', async (t) => {
  const server = await buildServer(t, {
    PLT_FEATURE_CACHE_RECOMMENDATIONS: true,
    PLT_FEATURE_RISK_SERVICE_DUMP: true,
    PLT_FEATURE_FFC: true
  })

  const res = await server.inject({
    method: 'GET',
    url: '/icc-jobs/risk-service-dump'
  })
  const { statusCode, body } = res
  assert.equal(statusCode, 200)
  const job = JSON.parse(body)
  assert.equal(job.name, 'risk-service-dump')
  assert.equal(job.schedule, '0 0 * * *')
  assert.equal(job.url, 'http://risk-service.plt.local/dump')
  assert.equal(job.method, 'GET')
  assert.equal(job.maxRetries, 3)
  assert.equal(job.paused, false)
  assert.ok(job.when)
})

test('GET all jobs', async (t) => {
  const server = await buildServer(t, {
    PLT_FEATURE_CACHE_RECOMMENDATIONS: true,
    PLT_FEATURE_RISK_SERVICE_DUMP: true,
    PLT_FEATURE_FFC: true
  })

  const res = await server.inject({
    method: 'GET',
    url: '/icc-jobs'
  })
  const { statusCode, body } = res
  const jobs = JSON.parse(body)
  assert.equal(statusCode, 200)

  const jobNames = jobs.map(job => job.name).sort()
  const expectedJobs = ['ffc-recommender', 'risk-service-dump', 'scaler', 'sync', 'trafficante']
  assert.deepEqual(jobNames, expectedJobs)

  jobs.forEach(job => {
    assert.ok(job.name)
    assert.ok(job.schedule !== undefined)
    assert.ok(job.url)
    assert.ok(job.method)
    assert.ok(job.maxRetries !== undefined)
    assert.ok(job.paused !== undefined)
    assert.ok(job.when)
  })
})

test('Change multiple jobs schedules', async (t) => {
  const server = await buildServer(t, {
    PLT_FEATURE_CACHE_RECOMMENDATIONS: true,
    PLT_FEATURE_RISK_SERVICE_DUMP: true,
    PLT_FEATURE_FFC: true
  })

  const jobs = {
    'risk-service-dump': '* * */2 * * *',
    sync: '* * */2 * * *'
  }

  const res = await server.inject({
    method: 'PUT',
    url: '/icc-jobs',
    payload: jobs
  })
  const { statusCode, body } = res
  const changed = JSON.parse(body)

  assert.equal(statusCode, 200)
  const riskServiceDump = changed.find((job) => job.name === 'risk-service-dump')
  assert.equal(riskServiceDump.schedule, '* * */2 * * *')
  const sync = changed.find((job) => job.name === 'sync')
  assert.equal(sync.schedule, '* * */2 * * *')
})
