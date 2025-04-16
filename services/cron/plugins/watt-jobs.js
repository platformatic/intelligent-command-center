'use strict'

const fp = require('fastify-plugin')

async function plugin (app) {
  // Creates or update a Wattjob
  async function saveWattJob ({
    name,
    callbackUrl,
    schedule,
    method = 'GET',
    maxRetries = 3,
    paused = false,
    body = {},
    headers = {},
    applicationId = null
  }) {
    const entities = app.platformatic.entities

    // get or create the job
    let job = (await entities.job.find({
      where: {
        name: { eq: name },
        jobType: { eq: 'WATT' },
        applicationId: { eq: applicationId }
      }
    }))?.[0]

    const input = {
      schedule,
      name,
      callbackUrl,
      method,
      maxRetries,
      body,
      headers,
      paused,
      protected: true,
      jobType: 'WATT',
      applicationId
    }

    if (job) {
      // Check if any fields have changed
      const hasChanged =
          schedule !== job.schedule ||
          callbackUrl !== job.callbackUrl ||
          method !== job.method ||
          maxRetries !== job.maxRetries ||
          JSON.stringify(body) !== job.body ||
          JSON.stringify(headers) !== JSON.stringify(job.headers) ||
          applicationId !== job.applicationId

      if (!hasChanged) {
        // If nothing changed, return the existing job without updating
        const messages = await entities.message.find({
          where: {
            jobId: { eq: job.id },
            sentAt: { eq: null }
          }
        })

        const when = messages[0]?.when

        return {
          name,
          schedule: job.schedule,
          when,
          url: job.callbackUrl,
          method: job.method,
          maxRetries: job.maxRetries,
          paused: job.paused,
          applicationId: job.applicationId,
          jobType: job.jobType,
          updatedAt: job.updatedAt
        }
      }
      input.id = job.id
    }

    job = await entities.job.save({
      input
    })
    const jobId = job.id

    const messages = await entities.message.find({
      where: {
        jobId: { eq: jobId },
        sentAt: { eq: null }
      }
    })

    const when = messages[0]?.when
    return {
      name,
      schedule,
      when,
      url: job.callbackUrl,
      method: job.method,
      maxRetries: job.maxRetries,
      paused: job.paused,
      applicationId: job.applicationId,
      jobType: job.jobType,
      updatedAt: job.updatedAt
    }
  }

  const wattJobAPIs = {
    saveWattJob
  }

  app.decorate('wattJobAPIs', wattJobAPIs)
}

module.exports = fp(plugin, {
  name: 'watt-jobs',
  dependencies: ['pg-hooks']
})
