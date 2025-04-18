/// <reference path="../global.d.ts" />

'use strict'

const errors = require('../plugins/errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  app.post('/ui/applications', {
    schema: {
      operationId: 'getApplications',
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        required: ['name']
      }
    },
    handler: async (req, res) => {
      const { name } = req.body
      const ctx = { req, logger: req.log }

      const application = await app.saveApplication(name, ctx)
      res.send(application)
    }
  })
}
