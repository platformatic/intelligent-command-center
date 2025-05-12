'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async function (app) {
  app.get('/applications/:applicationId/scale-configs', {
    operationId: 'getScaleConfig',
    handler: async (req) => {
      const applicationId = req.params.applicationId
      return app.getScaleConfig(applicationId)
    }
  })

  app.post('/applications/:applicationId/scale-configs', {
    operationId: 'saveScaleConfig',
    schema: {
      body: {
        type: 'object',
        properties: {
          minPods: { type: 'integer' },
          maxPods: { type: 'integer' }
        }
      }
    },
    handler: async (req) => {
      const applicationId = req.params.applicationId
      const scalerConfig = req.body

      await app.saveScaleConfig(applicationId, scalerConfig)

      return { success: true }
    }
  })
})
