'use strict'

const fp = require('fastify-plugin')

const acceptedShape = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    applicationId: { type: 'string' },
    slotOfDay: { type: 'integer' },
    scopeKeys: { type: 'array', items: { type: 'string' } },
    value: { type: 'integer' },
    until: { type: ['string', 'null'] },
    details: { type: 'object', additionalProperties: true },
    status: { type: 'string' },
    acceptedAt: { type: 'string' },
    endedAt: { type: ['string', 'null'] }
  }
}

module.exports = fp(async function (app) {
  if (app.env.PLT_SCALER_ALGORITHM_VERSION === 'v1') return

  // Accept the current candidate for (slotOfDay, scopeKeys); freezes its value and creates/refreshes
  // the one active accepted suggestion for that identity.
  app.post('/applications/:applicationId/suggestions/accept', {
    schema: {
      body: {
        type: 'object',
        required: ['slotOfDay', 'scopeKeys'],
        properties: {
          slotOfDay: { type: 'integer' },
          scopeKeys: { type: 'array', items: { type: 'string' } },
          until: { type: ['string', 'null'] }
        }
      },
      response: { 200: acceptedShape }
    },
    handler: async (req) => {
      return app.acceptSuggestion(req.params.applicationId, req.body)
    }
  })

  // Cancel an accepted suggestion (kept as history) and rebuild the resolved horizon.
  app.post('/applications/:applicationId/suggestions/:id/cancel', {
    schema: {
      response: {
        200: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string' } } }
      }
    },
    handler: async (req) => {
      return app.cancelSuggestion(req.params.id)
    }
  })

  // The accepted suggestions for an app (optionally filtered by status).
  app.get('/applications/:applicationId/suggestions/accepted', {
    schema: {
      querystring: { type: 'object', properties: { status: { type: 'string' } } },
      response: { 200: { type: 'array', items: acceptedShape } }
    },
    handler: async (req) => {
      return app.listSuggestions(req.params.applicationId, { status: req.query.status })
    }
  })

  // The resolved scheduled floor per slot over a window (defaults to the prediction horizon).
  app.get('/applications/:applicationId/scheduled', {
    schema: {
      querystring: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } } },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              slotStart: { type: 'string' },
              slotEnd: { type: 'string' },
              slotOfDay: { type: 'integer' },
              value: { type: 'integer' },
              suggestionId: { type: 'string' }
            }
          }
        }
      }
    },
    handler: async (req) => {
      const now = Date.now()
      const horizonMs = Number(app.env.PLT_SCALER_PATTERN_PREDICTION_DAYS) * 24 * 60 * 60 * 1000
      const from = req.query.from ? Date.parse(req.query.from) : now
      const to = req.query.to ? Date.parse(req.query.to) : now + horizonMs
      return app.getScheduledSlots(req.params.applicationId, from, to)
    }
  })
}, { name: 'suggestions-routes', dependencies: ['suggestions'] })
