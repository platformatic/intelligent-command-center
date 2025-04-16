/// <reference path="../global.d.ts" />

'use strict'

const errors = require('../plugins/errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  app.get('/graph', {
    schema: {
      operationId: 'getGenerationGraph',
      querystring: {
        type: 'object',
        properties: {
          generationId: { type: 'string' }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            applications: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  services: {
                    type: 'array',
                    items: {
                      type: 'object',
                      additionalProperties: true
                    }
                  }
                },
                required: ['id', 'name', 'services'],
                additionalProperties: false
              }
            },
            links: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  source: {
                    type: 'object',
                    properties: {
                      applicationId: { type: 'string', nullable: true },
                      serviceId: { type: 'string', nullable: true },
                      telemetryId: { type: 'string' }
                    },
                    required: ['applicationId', 'serviceId', 'telemetryId'],
                    additionalProperties: false
                  },
                  target: {
                    type: 'object',
                    properties: {
                      applicationId: { type: 'string', nullable: true },
                      serviceId: { type: 'string', nullable: true },
                      telemetryId: { type: 'string' }
                    },
                    required: ['applicationId', 'serviceId', 'telemetryId'],
                    additionalProperties: false
                  },
                  requestsAmount: { type: 'string' },
                  responseTime: { type: 'string' }
                },
                required: ['source', 'target', 'requestsAmount', 'responseTime'],
                additionalProperties: false
              }
            }
          },
          required: ['applications', 'links'],
          additionalProperties: false
        }
      }
    },
    handler: async (req) => {
      const logger = req.log
      const ctx = { req, logger }

      const generationId = req.query.generationId

      const lastGeneration = await app.getLatestGeneration(ctx)
      if (lastGeneration === null) {
        throw errors.NoGenerationsFound()
      }

      if (
        generationId === undefined ||
        generationId === lastGeneration.id
      ) {
        return app.getMainGraph(lastGeneration, ctx)
      }

      const generation = await app.getGenerationById(generationId)
      if (generation === null) {
        throw errors.GenerationNotFound(generationId)
      }

      return app.getHistoryGraph(generation)
    }
  })
}
