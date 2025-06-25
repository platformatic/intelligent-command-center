'use strict'

const fp = require('fastify-plugin')

async function plugin (app) {
  async function setupICCInternalJob (jobConfigName) {
    const job = {
      name: app.env[`PLT_CRON_ICC_JOB_${jobConfigName}_NAME`],
      schedule: app.env[`PLT_CRON_ICC_JOB_${jobConfigName}_CRON`],
      url: app.env[`PLT_CRON_ICC_JOB_${jobConfigName}_URL`],
      method: app.env[`PLT_CRON_ICC_JOB_${jobConfigName}_METHOD`],
      maxRetries: app.env[`PLT_CRON_ICC_JOB_${jobConfigName}_MAX_RETRIES`]
    }

    app.log.info(`Setting up job ${job.name} with cron ${job.schedule} and url ${job.url}`)
    let iccJob
    try {
      iccJob = await app.iccJobAPIs.getICCJob(job.name)
    } catch (e) {
      if (e.code !== 'NOT_FOUND') {
        throw e
      }
    }
    // We create the job if missing. Note that we do not update the job if it exists because
    // users can now change it through the ICC settings UI.
    if (!iccJob) {
      iccJob = await app.iccJobAPIs.saveICCJob(job)
    }
    app.log.info(`Scheduler ${iccJob.name} set up with cron ${iccJob.schedule} and url ${iccJob.url}`)
  }

  app.addHook('onReady', async function () {
    if (!app.env.PLT_CRON_ICC_JOBS) {
      app.log.info('No jobs to set up')
      return
    }
    const jobs = app.env.PLT_CRON_ICC_JOBS.split(',').map(s => s.trim())
    for (const job of jobs) {
      await setupICCInternalJob(job)
    }
  })
}

module.exports = fp(plugin, {
  name: 'init',
  dependencies: ['icc-jobs', 'env']
})
