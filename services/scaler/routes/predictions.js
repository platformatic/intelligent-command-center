'use strict'

const fp = require('fastify-plugin')

// One history row: which effects fired that day, referenced by the effect `id` declared on the
// suggestion's top-level `effects`, plus that day's fitted delta — no repeated `when` label.
// Predictions carry only the id — a flat future forecast's decomposition would just repeat the
// suggestion's own baseline/value/effects.
const historyRow = {
  type: 'object',
  properties: {
    id: { type: 'string' }, // DB uuid of the backing time_window_stats row
    baseline: { type: 'integer' },
    effects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' }, // → suggestion.effects[].id
          delta: { type: 'integer' }
        }
      }
    }
  }
}

// The display snapshot — identical shape on a candidate and an accepted suggestion, so the frontend
// renders both from `details` without caring which it is.
const details = {
  type: 'object',
  properties: {
    when: { type: 'string' }, // human recurrence + time window
    baseline: { type: 'integer' },
    confidence: { type: 'number' }, // min over included effects; 1 for the baseline (certain)
    // Every effect this suggestion references — its combination (included) plus co-firing extras seen
    // in history (included:false). History rows point back to these by id.
    effects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' }, // stable effect id (scope key), referenced by history rows
          when: { type: 'string' },
          delta: { type: 'integer' },
          confidence: { type: 'number' },
          included: { type: 'boolean' }
        }
      }
    }
  }
}

const suggestion = {
  type: 'object',
  properties: {
    slotOfDay: { type: 'integer' }, // identity: recurring slot index
    scopeKeys: { type: 'array', items: { type: 'string' } }, // identity: sorted combination scope keys
    value: { type: 'integer' }, // absolute floor = baseline + Σ included effects
    details,
    history: { type: 'array', items: historyRow },
    predictions: {
      type: 'array',
      items: { type: 'object', properties: { id: { type: 'string' } } } // DB uuid of the forecast row
    }
  }
}

module.exports = fp(async function (app) {
  // Generate and persist the pattern-predicted schedule for one application (the next
  // PLT_SCALER_PATTERN_PREDICTION_DAYS days, per time window, upserted into time_window_predictions).
  // Returns the number of prediction rows written.
  app.post('/applications/:applicationId/predictions', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: { written: { type: 'integer' } }
        }
      }
    },
    handler: async (req) => {
      const written = await app.updatePredictions(req.params.applicationId)
      return { written }
    }
  })

  // The per-window floor suggestions cached by the last updatePredictions run ({ suggestions: [...] };
  // each carries its own history + predictions rows inline). 404 until predictions have run once.
  app.get('/applications/:applicationId/suggestions', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            suggestions: { type: 'array', items: suggestion },
            computedAt: { type: 'integer' } // epoch ms of the run that produced these
          }
        },
        404: {
          type: 'object',
          properties: { message: { type: 'string' } }
        }
      }
    },
    handler: async (req, reply) => {
      const cached = await app.store.getSuggestions(req.params.applicationId)
      if (!cached) return reply.code(404).send({ message: 'No suggestions for this application yet' })
      return cached
    }
  })
}, { name: 'predictions-routes', dependencies: ['pattern-predictor', 'store'] })
