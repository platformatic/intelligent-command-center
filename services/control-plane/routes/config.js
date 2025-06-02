/// <reference path="../global.d.ts" />

'use strict'

const errors = require('../plugins/errors')

/** @param {import('fastify').FastifyInstance} app */

module.exports = async function (app) {
  app.patch('/applications/:id/config', {
    logLevel: 'info',
    schema: {
      operationId: 'emitApplicationConfig',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
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

      const logger = req.log.child({ applicationId })
      const ctx = { req, logger }

      const application = await app.getApplicationById(applicationId)
      if (application === null) {
        throw new errors.ApplicationNotFound(applicationId)
      }

      await app.emitWattproConfig(application, ctx)
      return {}
    }
  })
}
