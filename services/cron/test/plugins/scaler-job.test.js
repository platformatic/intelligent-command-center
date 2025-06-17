'use strict'

const { test } = require('node:test')
const { equal, ok } = require('node:assert')
const { buildServer } = require('../helper')

test('scaler job is created with correct configuration', async (t) => {
  const app = await buildServer(t, {
    PLT_CRON_ICC_JOBS: 'SCALER',
    PLT_CRON_ICC_JOB_SCALER_NAME: 'scaler',
    PLT_CRON_ICC_JOB_SCALER_CRON: '0 */12 * * *',
    PLT_CRON_ICC_JOB_SCALER_URL: 'http://scaler.plt.local/predictions/calculate',
    PLT_CRON_ICC_JOB_SCALER_METHOD: 'POST',
    PLT_CRON_ICC_JOB_SCALER_MAX_RETRIES: 3
  })

  await app.listen({ port: 0 })

  const jobs = await app.platformatic.entities.job.find({
    where: {
      name: { eq: 'scaler' },
      jobType: { eq: 'ICC' }
    }
  })

  equal(jobs.length, 1, 'scaler job should be created')
  const job = jobs[0]

  equal(job.name, 'scaler')
  equal(job.schedule, '0 */12 * * *')
  equal(job.callbackUrl, 'http://scaler.plt.local/predictions/calculate')
  equal(job.method, 'POST')
  equal(job.maxRetries, 3)
  equal(job.jobType, 'ICC')
  equal(job.protected, true)
  equal(job.paused, false)

  const messages = await app.platformatic.entities.message.find({
    where: {
      jobId: { eq: job.id },
      sentAt: { eq: null }
    }
  })

  equal(messages.length, 1, 'initial message should be scheduled')
  ok(messages[0].when instanceof Date, 'message should have a scheduled time')
})

test('scaler job is included in getICCJob', async (t) => {
  const app = await buildServer(t, {
    PLT_CRON_ICC_JOBS: 'SCALER',
    PLT_CRON_ICC_JOB_SCALER_NAME: 'scaler',
    PLT_CRON_ICC_JOB_SCALER_CRON: '0 */12 * * *',
    PLT_CRON_ICC_JOB_SCALER_URL: 'http://scaler.plt.local/predictions/calculate',
    PLT_CRON_ICC_JOB_SCALER_METHOD: 'POST',
    PLT_CRON_ICC_JOB_SCALER_MAX_RETRIES: 3
  })

  await app.listen({ port: 0 })

  const scalerJob = await app.iccJobAPIs.getICCJob('scaler')

  ok(scalerJob, 'scaler job should exist')
  equal(scalerJob.name, 'scaler')
  equal(scalerJob.schedule, '0 */12 * * *')
  equal(scalerJob.url, 'http://scaler.plt.local/predictions/calculate')
  equal(scalerJob.method, 'POST')
  equal(scalerJob.maxRetries, 3)
  equal(scalerJob.paused, false)
})

test('multiple jobs including scaler are created', async (t) => {
  const app = await buildServer(t, {
    PLT_CRON_ICC_JOBS: 'RISK_SERVICE_DUMP, SCALER',
    PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_NAME: 'risk-service-dump',
    PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_CRON: '0 0 * * *',
    PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_URL: 'http://risk-service.plt.local/dump',
    PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_METHOD: 'GET',
    PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_MAX_RETRIES: 3,
    PLT_CRON_ICC_JOB_SCALER_NAME: 'scaler',
    PLT_CRON_ICC_JOB_SCALER_CRON: '0 */12 * * *',
    PLT_CRON_ICC_JOB_SCALER_URL: 'http://scaler.plt.local/predictions/calculate',
    PLT_CRON_ICC_JOB_SCALER_METHOD: 'POST',
    PLT_CRON_ICC_JOB_SCALER_MAX_RETRIES: 3
  })

  await app.listen({ port: 0 })

  const jobs = await app.platformatic.entities.job.find({
    where: {
      jobType: { eq: 'ICC' }
    }
  })

  equal(jobs.length, 2, 'two ICC jobs should be created')

  const jobNames = jobs.map(job => job.name).sort()
  equal(jobNames[0], 'risk-service-dump')
  equal(jobNames[1], 'scaler')
})
