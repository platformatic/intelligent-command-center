/// <reference path="../global.d.ts" />

'use strict'

const errors = require('../plugins/errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  // Create an application with no deployment yet, and issue its first deploy
  // token (named "<name>-deploy-token", never expires). The plaintext token is
  // returned once; deploy with it to bring the application online. Uses a
  // dedicated sub-path so it does not collide with the entity's auto-generated
  // POST /applications, which only inserts a bare row (no config, no lock).
  app.post('/applications/create', {
    logLevel: 'info',
    schema: {
      operationId: 'createApplication',
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 }
        },
        required: ['name'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            application: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' }
              },
              additionalProperties: true
            },
            token: { type: 'string' },
            deployToken: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                applicationId: { type: 'string' },
                name: { type: 'string' },
                expiresAt: { type: ['string', 'null'] },
                createdAt: { type: ['string', 'null'] }
              },
              additionalProperties: true
            }
          },
          required: ['application', 'token', 'deployToken'],
          additionalProperties: false
        }
      }
    },
    handler: async (req) => {
      const name = req.body.name.trim()
      const logger = req.log.child({ name })
      const ctx = { req, logger }

      if (name.length === 0) {
        throw new errors.InvalidApplicationName()
      }

      const existing = await app.getApplicationByName(name, ctx)
      if (existing !== null) {
        throw new errors.ApplicationAlreadyExists(name)
      }

      const application = await app.createApplicationWithoutDeployment(name, ctx)

      const { token, record } = await app.issueDeployToken(application.id, {
        name: `${name}-deploy-token`,
        expiresAt: null
      }, ctx)

      return { application, token, deployToken: record }
    }
  })
}
