'use strict'

const fp = require('fastify-plugin')
const errors = require('../lib/errors')

const scheduleBody = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    dtstart: { type: 'string' },
    dtend: { type: 'string' },
    rrule: { type: ['string', 'null'] },
    timezone: { type: 'string' },
    minPods: { type: ['integer', 'null'] },
    maxPods: { type: ['integer', 'null'] },
    priority: { type: 'integer' },
    enabled: { type: 'boolean' }
  }
}

module.exports = fp(async function (app) {
  app.post('/applications/:applicationId/schedules', {
    schema: { body: scheduleBody },
    handler: async (req) => app.createSchedule(req.params.applicationId, req.body)
  })

  app.get('/applications/:applicationId/schedules', {
    handler: async (req) => app.listSchedules(req.params.applicationId)
  })

  app.get('/schedules/:id', {
    handler: async (req) => {
      const schedule = await app.getSchedule(req.params.id)
      if (!schedule) throw new errors.SCHEDULE_NOT_FOUND(req.params.id)
      return schedule
    }
  })

  app.patch('/schedules/:id', {
    schema: { body: scheduleBody },
    handler: async (req) => app.updateSchedule(req.params.id, req.body)
  })

  app.delete('/schedules/:id', {
    handler: async (req) => {
      const schedule = await app.getSchedule(req.params.id)
      if (!schedule) throw new errors.SCHEDULE_NOT_FOUND(req.params.id)
      await app.deleteSchedule(req.params.id)
      return { success: true }
    }
  })
}, { name: 'schedules-routes', dependencies: ['scheduler'] })
