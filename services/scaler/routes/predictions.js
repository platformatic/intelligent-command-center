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
}, { name: 'predictions-routes', dependencies: ['pattern-predictor'] })
