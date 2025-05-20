/// <reference path="../global.d.ts" />

'use strict'

const fp = require('fastify-plugin')
const errors = require('../plugins/errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  app.get('/applications/:id/k8s/state', {
    logLevel: 'info',
    schema: {
      operationId: 'getApplicationK8sState',
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
          properties: {
            pods: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  status: { type: 'string' },
                  startTime: { type: 'string' },
                  resources: {
                    type: 'object',
                    properties: {
                      limits: {
                        type: 'object',
                        properties: {
                          cpu: { type: 'string' },
                          memory: { type: 'string' }
                        }
                      },
                      requests: {
                        type: 'object',
                        properties: {
                          cpu: { type: 'string' },
                          memory: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    handler: async (req) => {
      const { id: applicationId } = req.params

      const application = await app.getApplicationById(applicationId)
      if (application === null) {
        throw new errors.ApplicationNotFound(applicationId)
      }

      const logger = req.log.child({ applicationId })
      const ctx = { req, logger }

      return app.getApplicationK8sState(application, ctx)
    }
  })
})
