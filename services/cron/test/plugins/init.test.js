'use strict'

const { test } = require('node:test')
const assert = require('node:assert')

const { buildServer, getJobFromName } = require('../helper')

test('Init the service engine dump schedule at startup using the defaults', async (t) => {
  const server = await buildServer(t, {
    PLT_FEATURE_SCALER_TRENDS_LEARNING: true,
    PLT_FEATURE_RISK_SERVICE_DUMP: true
  })
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
  const server = await buildServer(t, {
    PLT_FEATURE_SCALER_TRENDS_LEARNING: false,
    PLT_FEATURE_RISK_SERVICE_DUMP: false
  })
  await server.listen({ port: 0 })

  const { entities } = server.platformatic
  const jobs = await entities.job.find({ where: { jobType: { eq: 'ICC' } } })

  // Should have only SYNC job (not SCALER or RISK_SERVICE_DUMP)
  assert.equal(jobs.length, 1)
  const riskJob = jobs.find(j => j.name === server.env.PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_NAME)
  assert.equal(!!riskJob, false)
})

test('Should pause existing scaler job when PLT_FEATURE_SCALER_TRENDS_LEARNING is false', async (t) => {
  // First create a server with trends learning enabled to create the scaler job
  const server1 = await buildServer(t, {
    PLT_FEATURE_SCALER_TRENDS_LEARNING: true,
    PLT_FEATURE_RISK_SERVICE_DUMP: false
  })
  await server1.listen({ port: 0 })

  // Verify scaler job exists and is not paused
  const { entities } = server1.platformatic
  const jobs = await entities.job.find({ where: { jobType: { eq: 'ICC' } } })
  assert.equal(jobs.length, 2) // SCALER and SYNC

  const scalerJob = jobs.find(j => j.name === 'scaler')
  assert.ok(scalerJob)
  assert.equal(scalerJob.paused, false)

  await server1.close()

  // Now create a server with trends learning disabled
  const server2 = await buildServer(t, {
    PLT_FEATURE_SCALER_TRENDS_LEARNING: false,
    PLT_FEATURE_RISK_SERVICE_DUMP: false
  })
  await server2.listen({ port: 0 })

  // Verify scaler job is now paused
  const { entities: entities2 } = server2.platformatic
  const jobs2 = await entities2.job.find({ where: { jobType: { eq: 'ICC' } } })

  const scalerJob2 = jobs2.find(j => j.name === 'scaler')
  assert.ok(scalerJob2)
  assert.equal(scalerJob2.paused, true)

  await server2.close()
})

test('Should not pause scaler job when PLT_FEATURE_SCALER_TRENDS_LEARNING is true', async (t) => {
  // First create a server with trends learning enabled
  const server1 = await buildServer(t, {
    PLT_FEATURE_SCALER_TRENDS_LEARNING: true,
    PLT_FEATURE_RISK_SERVICE_DUMP: false
  })
  await server1.listen({ port: 0 })

  // Verify scaler job exists and is not paused
  const { entities } = server1.platformatic
  const jobs = await entities.job.find({ where: { jobType: { eq: 'ICC' } } })
  assert.equal(jobs.length, 2) // SCALER and SYNC

  const scalerJob = jobs.find(j => j.name === 'scaler')
  assert.ok(scalerJob)
  assert.equal(scalerJob.paused, false)

  await server1.close()

  // Create another server with trends learning still enabled
  const server2 = await buildServer(t, {
    PLT_FEATURE_SCALER_TRENDS_LEARNING: true,
    PLT_FEATURE_RISK_SERVICE_DUMP: false
  })
  await server2.listen({ port: 0 })

  // Verify scaler job is still not paused
  const { entities: entities2 } = server2.platformatic
  const jobs2 = await entities2.job.find({ where: { jobType: { eq: 'ICC' } } })

  const scalerJob2 = jobs2.find(j => j.name === 'scaler')
  assert.ok(scalerJob2)
  assert.equal(scalerJob2.paused, false)

  await server2.close()
})

test('Should handle case when scaler job does not exist', async (t) => {
  // Start with no scaler job (trends learning disabled, no ICC jobs)
  const server = await buildServer(t, {
    PLT_FEATURE_SCALER_TRENDS_LEARNING: false,
    PLT_FEATURE_RISK_SERVICE_DUMP: false,
    PLT_CRON_ICC_JOBS: 'SYNC' // Only sync job, no scaler
  })

  // Should start without errors even though scaler job doesn't exist
  await server.listen({ port: 0 })

  const { entities } = server.platformatic
  const jobs = await entities.job.find({ where: { jobType: { eq: 'ICC' } } })

  // Should have only SYNC job
  assert.equal(jobs.length, 1)
  const syncJob = jobs.find(j => j.name === server.env.PLT_CRON_ICC_JOB_SYNC_NAME)
  assert.ok(syncJob)

  // No scaler job should exist
  const scalerJob = jobs.find(j => j.name === 'scaler')
  assert.equal(scalerJob, undefined)

  await server.close()
})

test('Should handle case when scaler job is already paused', async (t) => {
  // First create a server with trends learning enabled
  const server1 = await buildServer(t, {
    PLT_FEATURE_SCALER_TRENDS_LEARNING: true,
    PLT_FEATURE_RISK_SERVICE_DUMP: false
  })
  await server1.listen({ port: 0 })

  // Manually pause the scaler job
  const { entities } = server1.platformatic
  const jobs = await entities.job.find({ where: { jobType: { eq: 'ICC' } } })
  const scalerJob = jobs.find(j => j.name === 'scaler')
  assert.ok(scalerJob)

  // Pause the job manually
  await entities.job.save({
    input: {
      id: scalerJob.id,
      paused: true
    }
  })

  await server1.close()

  // Now create a server with trends learning disabled
  const server2 = await buildServer(t, {
    PLT_FEATURE_SCALER_TRENDS_LEARNING: false,
    PLT_FEATURE_RISK_SERVICE_DUMP: false
  })

  // Should start without errors even though scaler job is already paused
  await server2.listen({ port: 0 })

  const { entities: entities2 } = server2.platformatic
  const jobs2 = await entities2.job.find({ where: { jobType: { eq: 'ICC' } } })

  const scalerJob2 = jobs2.find(j => j.name === 'scaler')
  assert.ok(scalerJob2)
  assert.equal(scalerJob2.paused, true)

  await server2.close()
})

test('Should unpause scaler job when PLT_FEATURE_SCALER_TRENDS_LEARNING changes from false to true', async (t) => {
  // First create a server with trends learning enabled to create the scaler job
  const server1 = await buildServer(t, {
    PLT_FEATURE_SCALER_TRENDS_LEARNING: true,
    PLT_FEATURE_RISK_SERVICE_DUMP: false
  })
  await server1.listen({ port: 0 })

  // Verify scaler job exists and is not paused
  const { entities } = server1.platformatic
  const jobs = await entities.job.find({ where: { jobType: { eq: 'ICC' } } })
  const scalerJob = jobs.find(j => j.name === 'scaler')
  assert.ok(scalerJob)
  assert.equal(scalerJob.paused, false)

  await server1.close()

  // Create a server with trends learning disabled to pause the job
  const server2 = await buildServer(t, {
    PLT_FEATURE_SCALER_TRENDS_LEARNING: false,
    PLT_FEATURE_RISK_SERVICE_DUMP: false
  })
  await server2.listen({ port: 0 })

  // Verify scaler job is paused
  const { entities: entities2 } = server2.platformatic
  const jobs2 = await entities2.job.find({ where: { jobType: { eq: 'ICC' } } })
  const scalerJob2 = jobs2.find(j => j.name === 'scaler')
  assert.ok(scalerJob2)
  assert.equal(scalerJob2.paused, true)

  await server2.close()

  // Now create a server with trends learning enabled again
  const server3 = await buildServer(t, {
    PLT_FEATURE_SCALER_TRENDS_LEARNING: true,
    PLT_FEATURE_RISK_SERVICE_DUMP: false
  })
  await server3.listen({ port: 0 })

  // Verify scaler job is unpaused
  const { entities: entities3 } = server3.platformatic
  const jobs3 = await entities3.job.find({ where: { jobType: { eq: 'ICC' } } })
  const scalerJob3 = jobs3.find(j => j.name === 'scaler')
  assert.ok(scalerJob3)
  assert.equal(scalerJob3.paused, false)

  await server3.close()
})

test('Should not log error when scaler job is not found', async (t) => {
  // Create a server with trends learning disabled and no scaler job
  const server = await buildServer(t, {
    PLT_FEATURE_SCALER_TRENDS_LEARNING: false,
    PLT_FEATURE_RISK_SERVICE_DUMP: false,
    PLT_CRON_ICC_JOBS: 'SYNC' // Only sync job
  })

  let errorLogged = false
  const originalLogError = server.log.error
  server.log.error = (data, msg) => {
    if (msg === 'Error checking scaler job status') {
      errorLogged = true
    }
    originalLogError.call(server.log, data, msg)
  }

  // Server should start without throwing and should NOT log error for NOT_FOUND
  await server.listen({ port: 0 })

  assert.equal(errorLogged, false)

  // Restore original method
  server.log.error = originalLogError

  await server.close()
})
