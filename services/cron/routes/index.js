'use strict'

module.exports = async function (app) {
  app.get('/icc-jobs/:name', {
    handler: async (request) => {
      const { name } = request.params
      return app.iccJobAPIs.getICCJob(name)
    }
  })

  app.get('/icc-jobs', {
    handler: async (request) => {
      return app.iccJobAPIs.getICCJobs()
    }
  })

  // change the schedule of a icc-job. set the schedule to null to pause the job
  app.put('/icc-jobs/:name', {
    schema: {
      body: {
        type: 'object',
        properties: {
          schedule: { type: 'string', nullable: true }
        },
        required: ['schedule']
      }
    },
    handler: async (request) => {
      const { name } = request.params
      const { schedule } = request.body
      return app.iccJobAPIs.changeICCJobSchedule(name, schedule)
    }
  })

  // Change the schedule of multiple icc-jobs
  app.put('/icc-jobs', {
    schema: {
      body: {
        type: 'object',
        additionalProperties: { type: 'string' }
      }
    },
    handler: async (request) => {
      const names = Object.keys(request.body)
      const updates = []
      for (const name of names) {
        updates.push(app.iccJobAPIs.changeICCJobSchedule(name, request.body[name]))
      }
      await Promise.all(updates)
      return app.iccJobAPIs.getICCJobs()
    }
  })

  app.get('/jobs/:id/run', {
    handler: async (request) => {
      const { id } = request.params
      app.log.info({ id }, 'Triggered schedule manually')
      return app.runNow(Number(id))
    }
  })

  app.get('/jobs/:id/pause', {
    handler: async (request) => {
      const { id } = request.params
      app.log.info({ id }, 'Pausing job')
      return app.pause(Number(id))
    }
  })

  app.get('/jobs/:id/resume', {
    handler: async (request) => {
      const { id } = request.params
      app.log.info({ id }, 'Resuming job')
      return app.resume(Number(id))
    }
  })

  app.get('/messages/:id/cancel', {
    handler: async (request) => {
      const { id } = request.params
      app.log.info({ id }, 'Cancel retrying message')
      return app.cancelRetryingMessage(Number(id))
    }
  })

  app.put('/watt-jobs', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          callbackUrl: { type: 'string' },
          schedule: { type: 'string' },
          method: { type: 'string', nullable: true },
          maxRetries: { type: 'number', nullable: true },
          body: { type: 'object', nullable: true },
          headers: { type: 'object', nullable: true },
          applicationId: { type: 'string', nullable: true }
        },
        required: ['schedule']
      }
    },
    handler: async (request) => {
      const job = request.body
      return app.wattJobAPIs.saveWattJob(job)
    }
  })
}
