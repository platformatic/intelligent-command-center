'use strict'

const { getServicesMetrics } = require('../lib/services')

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  app.post('/services', {
    schema: {
      body: {
        type: 'object',
        properties: {
          applications: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' }
              }
            }
          },
          start: { type: 'string', format: 'date-time' },
          end: { type: 'string', format: 'date-time' }
        },
        required: ['applications']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            averageCallsCount: { type: 'number' },
            overall50pLatency: { type: 'number' },
            overall95pLatency: { type: 'number' },
            servicesLinks: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                additionalProperties: {
                  type: 'object',
                  properties: {
                    count: { type: 'number' },
                    latency: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }

    },
    handler: async (req) => {
      const { applications } = req.body

      // if start is not provided, use the 5 minutes time window
      const fiveMinutesAgo = new Date(new Date() - 5 * 60 * 1000)

      const start = req.body.start ? new Date(req.body.start) : fiveMinutesAgo
      const end = req.body.end ? new Date(req.body.end) : new Date()

      app.log.info('Getting services metrics')
      return getServicesMetrics(applications, { start, end })
    }
  })
}
