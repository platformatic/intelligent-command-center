'use strict'

const { test } = require('node:test')
const assert = require('node:assert')

const { buildServer, getJobFromName } = require('../helper')

test('Init the service engine dump schedule at startup using the defaults', async (t) => {
  const server = await buildServer(t, { PLT_FEATURE_RISK_SERVICE_DUMP: true })
  await server.listen({ port: 0 })
  const job = await getJobFromName(server.env.PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_NAME)
  assert.equal(job.name, server.env.PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_NAME)
  assert.equal(job.callback_url, server.env.PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_URL)
  assert.equal(job.method, server.env.PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_METHOD)
  assert.equal(job.max_retries, server.env.PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_MAX_RETRIES)

  const { entities } = server.platformatic
  const jobs = await entities.job.find({ where: { jobType: { eq: 'ICC' } } })

  // Check that the type is `ICC` and we have the expected jobs
  assert.equal(jobs.length, 3) // SCALER, SYNC, RISK_SERVICE_DUMP
  const riskJob = jobs.find(j => j.name === server.env.PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_NAME)
  assert.ok(riskJob)
  assert.equal(riskJob.jobType, 'ICC')
})

test('Should not init risk service dump job when feature is disabled', async (t) => {
  const server = await buildServer(t, { PLT_FEATURE_RISK_SERVICE_DUMP: false })
  await server.listen({ port: 0 })

  const { entities } = server.platformatic
  const jobs = await entities.job.find({ where: { jobType: { eq: 'ICC' } } })

  // Should have SCALER and SYNC jobs only (not RISK_SERVICE_DUMP)
  assert.equal(jobs.length, 2)
  const riskJob = jobs.find(j => j.name === server.env.PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_NAME)
  assert.equal(!!riskJob, false)
})
