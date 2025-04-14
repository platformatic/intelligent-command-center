/// <reference path="../../global.d.ts" />
'use strict'

const { request } = require('undici')

const activitySchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    createdAt: { type: 'string' },
    data: {
      type: 'object',
      additionalProperties: true
    },
    objectId: { type: 'string' },
    action: { type: 'string' },
    userId: { type: 'string' },
    username: { type: 'string' },
    event: { type: 'string' },
    description: { type: 'string' },
    applicationId: { type: 'string' }
  }
}

const activitiesQuerySchema = {
  type: 'object',
  properties: {
    userId: { type: 'string' },
    search: { type: 'string' },
    limit: { type: 'number' },
    offset: { type: 'number' }
  },
  additionalProperties: true,
  required: ['limit', 'offset']
}

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  // This might be in config, but it's probably useless since it won't change.
  // Can be overridden for tests
  const pltActivitiesHost = process.env.PLT_ACTIVITIES_URL || 'http://activities.plt.local'
  const activitiesUrl = pltActivitiesHost + '/events'

  app.get('/events', {
    schema: {
      query: activitiesQuerySchema,
      response: {
        200: {
          type: 'array',
          items: activitySchema
        }
      }
    },
    handler: async (req, reply) => {
      const query = req.query
      const { statusCode, body, headers } = await request(activitiesUrl, {
        method: 'GET',
        headers: {
          'content-type': 'application/json',
          ...req.toUserHeader()
        },
        query
      })

      /* istanbul ignore next */
      if (statusCode !== 200) {
        const error = await body.text()
        app.log.error({ error }, 'Error getting Activities')
        throw new Error(error)
      }

      const totalCount = headers['x-total-count']
      const activities = await body.json()

      reply.header('X-Total-Count', totalCount)
      return activities
    }
  })
}
