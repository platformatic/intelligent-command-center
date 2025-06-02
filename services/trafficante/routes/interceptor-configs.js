/// <reference path="../global.d.ts" />

'use strict'

const errors = require('../plugins/errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  app.get('/recommendations/:recommendationId/interceptor-configs/:applicationId', {
    schema: {
      operationId: 'getInterceptorConfig',
      params: {
        type: 'object',
        properties: {
          recommendationId: { type: 'string' },
          applicationId: { type: 'string' }
        },
        required: ['recommendationId', 'applicationId']
      }
    },
    handler: async (req) => {
      const { recommendationId, applicationId } = req.params

      const logger = req.log.child({ recommendationId, applicationId })
      const ctx = { logger, req }

      const recommendation = await app.getRecommendationById(recommendationId)
      if (recommendation === null) {
        throw new errors.RecommendationNotFound(recommendationId)
      }

      return app.getInterceptorConfig(
        recommendation,
        applicationId,
        ctx
      )
    }
  })

  app.post('/recommendations/:recommendationId/interceptor-configs/:applicationId', {
    schema: {
      operationId: 'saveInterceptorConfig',
      params: {
        type: 'object',
        properties: {
          recommendationId: { type: 'string' },
          applicationId: { type: 'string' }
        },
        required: ['recommendationId', 'applicationId']
      }
    },
    handler: async (req) => {
      const { recommendationId, applicationId } = req.params

      const logger = req.log.child({ recommendationId, applicationId })
      const ctx = { logger, req }

      const recommendation = await app.getRecommendationById(recommendationId)
      if (recommendation === null) {
        throw new errors.RecommendationNotFound(recommendationId)
      }

      return app.saveInterceptorConfig(
        recommendation,
        applicationId,
        ctx
      )
    }
  })
}
