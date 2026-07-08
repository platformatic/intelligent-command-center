'use strict'

const fp = require('fastify-plugin')

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

  // The reviewable floor suggestions cached by the last updatePredictions run (flat scored list +
  // grouped runs). 404 until predictions have been generated at least once for the application.
  app.get('/applications/:applicationId/suggestions', {
    handler: async (req, reply) => {
      const cached = await app.store.getSuggestions(req.params.applicationId)
      if (!cached) return reply.code(404).send({ message: 'No suggestions for this application yet' })
      return cached
    }
  })

  // The concrete time windows (observed + 60-day forecast) that make up one grouped pattern, by its
  // id (from the suggestions list above). 404 if the id is unknown for this application.
  app.get('/applications/:applicationId/suggestions/:patternId/windows', {
    handler: async (req, reply) => {
      const all = await app.store.getSuggestionWindows(req.params.applicationId)
      const windows = all ? all[req.params.patternId] : null
      if (!windows) return reply.code(404).send({ message: 'No windows for this pattern' })
      return { windows }
    }
  })
}, { name: 'predictions-routes', dependencies: ['pattern-predictor', 'store'] })
