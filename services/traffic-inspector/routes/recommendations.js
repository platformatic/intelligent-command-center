/// <reference path="../global.d.ts" />

'use strict'

const errors = require('../plugins/errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  app.patch('/recommendations/:id', {
    schema: {
      operationId: 'updateRecommendationStatus',
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
          status: { type: 'string' }
        },
        required: ['status']
      }
    },
    handler: async (req) => {
      const { id } = req.params
      const { status } = req.body

      const recommendation = await app.getRecommendationById(id)
      if (recommendation === null) {
        throw new errors.RecommendationNotFound(id)
      }

      const logger = req.log.child({ id })
      const ctx = { logger, req }

      return app.updateRecommendationStatus(recommendation, status, ctx)
    }
  })

  app.post('/recommendations', {
    schema: {
      operationId: 'generateRecommendation'
    },
    handler: async (req) => {
      const ctx = { logger: req.log, req }
      return app.generateRecommendation(ctx)
    }
  })

  app.post('/recommendations/apply', {
    schema: {
      operationId: 'applyApplicationRecommendation',
      query: {
        type: 'object',
        properties: {
          applicationId: { type: 'string' },
          saveInterceptorConfig: { type: 'boolean', default: false }
        },
        required: ['applicationId']
      }
    },
    handler: async (req) => {
      const { applicationId, saveInterceptorConfig } = req.query
      const ctx = { logger: req.log, req }

      const recommendation = await app.getLatestRecommendation()
      if (recommendation === null) {
        throw new errors.NoRecommendationToApply()
      }

      const opts = { saveInterceptorConfig }
      await app.applyRecommendation(recommendation, applicationId, opts, ctx)
    }
  })

  app.patch('/recommendations/:recommendationId/routes/:routeId', {
    schema: {
      operationId: 'changeRecommendationRoute',
      params: {
        type: 'object',
        properties: {
          recommendationId: { type: 'string' }
        },
        required: ['recommendationId']
      },
      body: {
        type: 'object',
        properties: {
          selected: { type: 'boolean' },
          ttl: { type: 'integer' },
          cacheTag: { type: 'string' },
          varyHeaders: { type: 'array', items: { type: 'string' } }
        },
        additionalProperties: false
      }
    },
    handler: async (req) => {
      const { recommendationId, routeId } = req.params

      const recommendation = await app.getRecommendationById(recommendationId)
      if (recommendation === null) {
        throw new errors.RecommendationNotFound(recommendationId)
      }

      const route = await app.getRecommendationRouteById(routeId)
      if (route === null) {
        throw new errors.RecommendationRouteNotFound(recommendationId)
      }

      const logger = req.log.child({ recommendationId, routeId })
      const ctx = { logger, req }

      const routeConfig = req.body

      return app.updateRecommendationRoute(recommendation, route, routeConfig, ctx)
    }
  })
}
