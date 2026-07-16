'use strict'

const fp = require('fastify-plugin')

// A suggestion as the frontend sees it. `scopeKeys` travels as an OPAQUE identity token — the client
// echoes it back but never interprets it; the calendar rules stay on the server.
const suggestion = {
  type: 'object',
  properties: {
    id: { type: 'string' }, // the ROW
    identity: { type: 'string' }, // the PATTERN — shared by a candidate and its accepted row
    slotOfDay: { type: 'integer' },
    scopeKeys: { type: 'array', items: { type: 'string' } },
    status: { type: 'string' }, // suggested | active | cancelled | expired
    value: { type: 'integer' }, // the floor
    details: {
      type: 'object',
      properties: {
        when: { type: 'string' },
        baseline: { type: 'integer' },
        confidence: { type: 'number' },
        effects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              when: { type: 'string' },
              delta: { type: 'integer' },
              confidence: { type: 'number' },
              included: { type: 'boolean' }
            }
          }
        }
      }
    },
    until: { type: ['string', 'null'] },
    acceptedAt: { type: ['string', 'null'] },
    endedAt: { type: ['string', 'null'] }
  }
}

module.exports = fp(async function (app) {
  if (app.env.PLT_SCALER_ALGORITHM_VERSION === 'v1') return

  // Candidates and accepted suggestions in ONE list, told apart by `status`. Never carries the per-day
  // distribution — that is the bulky part and only goes out on /details.
  app.get('/applications/:applicationId/suggestions', {
    schema: { response: { 200: { type: 'array', items: suggestion } } },
    handler: async (req) => app.listSuggestions(req.params.applicationId)
  })

  // The drill-in: the slot ids to highlight (generated, not queried) + the per-day redistribution.
  app.get('/applications/:applicationId/suggestions/:id/details', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            occurrences: { type: 'array', items: { type: 'string' } }, // slot row ids, past + future
            distribution: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string' },
                  baseline: { type: 'integer' },
                  effects: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: { id: { type: 'string' }, delta: { type: 'integer' } }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    handler: async (req) => app.getSuggestionDetails(req.params.id)
  })

  app.post('/applications/:applicationId/suggestions/:id/accept', {
    schema: {
      body: { type: 'object', properties: { until: { type: ['string', 'null'] } } },
      response: { 200: suggestion }
    },
    handler: async (req) => app.acceptSuggestion(req.params.id, req.body ?? {})
  })

  app.post('/applications/:applicationId/suggestions/:id/cancel', {
    schema: {
      response: {
        200: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string' } } }
      }
    },
    handler: async (req) => app.cancelSuggestion(req.params.id)
  })

  // The floor actually in force per slot over the horizon, after most-specific-wins resolution across
  // every accepted suggestion. Not derivable from any single suggestion.
  app.get('/applications/:applicationId/scheduled', {
    schema: {
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
      return app.getScheduledSlots(req.params.applicationId, now, now + horizonMs)
    }
  })
}, { name: 'suggestions-routes', dependencies: ['suggestions'] })
