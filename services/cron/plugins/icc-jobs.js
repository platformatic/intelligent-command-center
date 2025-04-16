'use strict'

const createError = require('@fastify/error')
const fp = require('fastify-plugin')

const notFound = createError('NOT_FOUND', 'Not found %s', 404)

async function plugin (app) {
  async function getICCJob (name) {
    const { entities } = app.platformatic
    const job = (await entities.job.find({
      where: {
        name: { eq: name },
        jobType: { eq: 'ICC' },
        applicationId: { eq: null }
      }
    }))?.[0]

    if (!job) {
      app.log.info({ name }, 'No job found')
      throw notFound(name)
    }

    const messages = await entities.message.find({
      where: {
        jobId: { eq: job.id }
      }
    })
    if (messages.length === 0) {
      app.log.info({ name }, 'No scheduled message found')
      throw notFound(name)
    }
    const message = messages[0]

    return {
      name,
      schedule: job.schedule,
      when: message.when,
      url: job.callbackUrl,
      method: job.method,
      maxRetries: job.maxRetries,
      paused: job.paused
    }
  }

  const getICCJobs = async () => {
    const JOB_NAMES = ['risk-service-dump', 'sync', 'ffc-recommender', 'trafficante']
    const jobs = await Promise.all(JOB_NAMES.map(getICCJob))
    return jobs
  }

  // Creates or update a ICC internal job
  async function saveICCJob ({ name, url, schedule, method = 'GET', maxRetries = 3, paused = false, body = {} }) {
    const entities = app.platformatic.entities

    // get or create the job
    let job = (await entities.job.find({
      where: {
        name: { eq: name },
        jobType: { eq: 'ICC' },
        applicationId: { eq: null }
      }
    }))?.[0]

    const input = {
      schedule,
      name,
      callbackUrl: url,
      method,
      maxRetries,
      body,
      paused,
      protected: true,
      jobType: 'ICC'
    }

    if (job) {
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

    const when = messages[0].when
    return { name, schedule, when, url: job.callbackUrl, method: job.method, maxRetries: job.maxRetries, paused: job.paused }
  }

  const changeICCJobSchedule = async (name, schedule) => {
    const entities = app.platformatic.entities

    let job = (await entities.job.find({
      where: {
        name: { eq: name },
        jobType: { eq: 'ICC' },
        applicationId: { eq: null }
      }
    }))?.[0]

    const jobId = job.id

    const input = {
      id: jobId
    }

    if (!schedule) {
      input.paused = true
    } else {
      input.schedule = schedule
      input.paused = false
    }

    job = await entities.job.save({
      input
    })

    const messages = await entities.message.find({
      where: {
        jobId: { eq: jobId },
        sentAt: { eq: null }
      }
    })

    const when = messages[0].when
    await app.notifyUpdateTimer()
    return {
      name,
      schedule,
      when,
      url: job.callbackUrl,
      method: job.method,
      maxRetries: job.maxRetries,
      paused: job.paused
    }
  }

  const iccJobAPIs = {
    getICCJob,
    getICCJobs,
    saveICCJob,
    changeICCJobSchedule
  }

  app.decorate('iccJobAPIs', iccJobAPIs)
}

module.exports = fp(plugin, {
  name: 'icc-jobs',
  dependencies: ['pg-hooks']
})
