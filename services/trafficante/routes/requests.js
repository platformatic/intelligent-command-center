/// <reference path="../global.d.ts" />

'use strict'

const errors = require('../plugins/errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  app.post('/requests/hash', {
    schema: {
      operationId: 'saveRequestHash',
      headers: {
        type: 'object',
        properties: {
          'x-labels': { type: 'string' }
        },
        required: ['x-labels']
      },
      body: {
        type: 'object',
        properties: {
          applicationId: { type: 'string' },
          timestamp: { type: 'number' },
          request: {
            type: 'object',
            properties: {
              url: { type: 'string' }
            },
            required: ['url']
          },
          response: {
            type: 'object',
            properties: {
              bodySize: { type: 'number' },
              bodyHash: { type: 'string' }
            },
            required: ['bodySize', 'bodyHash']
          }
        },
        required: ['timestamp', 'request', 'response']
      }
    },
    handler: async (req) => {
      const labels = req.headers['x-labels']
      const { timestamp, request, response } = req.body

      let applicationId = null
      try {
        ({ applicationId } = JSON.parse(labels))
      } catch {
        throw new errors.FailedToParseJsonHeader(labels)
      }

      const logger = req.log.child({ applicationId })
      const ctx = { logger, req }

      await app.saveRequestHash(
        applicationId,
        timestamp,
        request,
        response,
        ctx
      )
    }
  })

  app.post('/requests', {
    schema: {
      operationId: 'saveRequest',
      headers: {
        type: 'object',
        properties: {
          'x-labels': { type: 'string' },
          'x-request-data': { type: 'string' },
          'x-response-data': { type: 'string' }
        },
        required: ['x-labels', 'x-request-data', 'x-response-data']
      }
    },
    handler: async (req) => {
      const {
        'x-labels': labels,
        'x-request-data': requestData,
        'x-response-data': responseData
      } = req.headers

      let applicationId = null
      try {
        ({ applicationId } = JSON.parse(labels))
      } catch {
        throw new errors.FailedToParseJsonHeader(labels)
      }
      if (!applicationId) {
        throw new errors.MissingApplicationId()
      }

      let request = null
      try {
        request = JSON.parse(requestData)
      } catch {
        throw new errors.FailedToParseJsonHeader(requestData)
      }
      if (!request.url) {
        throw new errors.MissingRequestUrl()
      }
      if (!request.headers) {
        throw new errors.MissingRequestHeaders()
      }

      let response = null
      try {
        response = JSON.parse(responseData)
      } catch {
        throw new errors.FailedToParseJsonHeader(responseData)
      }
      if (!response.headers) {
        throw new errors.MissingResponseHeaders()
      }

      const logger = req.log.child({ applicationId })
      const ctx = { logger, req }

      response.body = req.body

      await app.saveRequest(
        applicationId,
        request,
        response,
        ctx
      )
    }
  })
}
