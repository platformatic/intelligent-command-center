/// <reference path="../global.d.ts" />

'use strict'

const errors = require('../plugins/errors')

/** @param {import('fastify').FastifyInstance} app */

module.exports = async function (app) {
  app.post('/applications/:id/resources', {
    logLevel: 'info',
    schema: {
      operationId: 'setApplicationResources',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          threads: { type: 'number' },
          heap: { type: 'number' },
          services: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                heap: { type: 'number' },
                threads: { type: 'number' }
              },
              additionalProperties: false
            }
          }
        },
        required: ['threads', 'heap', 'services'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: false
        }
      }
    },
    handler: async (req) => {
      const applicationId = req.params.id
      const resources = req.body

      const logger = req.log.child({ applicationId })
      const ctx = { req, logger }

      const application = await app.getApplicationById(applicationId)
      if (application === null) {
        throw new errors.ApplicationNotFound(applicationId)
      }

      await app.setApplicationConfig(application, { resources }, ctx)
    }
  })
}
