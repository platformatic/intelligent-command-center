/// <reference path="../global.d.ts" />

'use strict'

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  app.post('/routes', {
    schema: {
      operationId: 'saveUrlsRoutes',
      body: {
        type: 'object',
        properties: {
          routes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                applicationId: { type: 'string' },
                serviceId: { type: 'string' },
                url: { type: 'string' },
                route: { type: 'string' }
              },
              required: ['applicationId', 'serviceId', 'url', 'route']
            }
          }
        }
      }
    },
    handler: async (req) => {
      const { routes } = req.body

      const ctx = { logger: req.log, req }
      await app.saveRoutes(routes, ctx)
    }
  })
}
