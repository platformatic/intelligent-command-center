'use strict'

const { test } = require('node:test')
const assert = require('node:assert')

const { buildServer, getJobFromName } = require('../helper')

test('Init the service engine dump schedule at startup using the defaults', async (t) => {
  const server = await buildServer(t, { PLT_CRON_ICC_JOBS: 'RISK_SERVICE_DUMP' })
  await server.listen({ port: 0 })
  const job = await getJobFromName(server.env.PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_NAME)
  assert.equal(job.name, server.env.PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_NAME)
  assert.equal(job.callback_url, server.env.PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_URL)
  assert.equal(job.method, server.env.PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_METHOD)
  assert.equal(job.max_retries, server.env.PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_MAX_RETRIES)

  const { entities } = server.platformatic
  const jobs = await entities.job.find({})

  // Chec tha the type is `ICC`
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].name, server.env.PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_NAME)
  assert.equal(jobs[0].jobType, 'ICC')
})

test('Shoud not init jobs', async (t) => {
  const server = await buildServer(t, { PLT_CRON_ICC_JOBS: '' })
  await server.listen({ port: 0 })
  const job = await getJobFromName(server.env.PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_NAME)
  assert.equal(!!job, false)
})
