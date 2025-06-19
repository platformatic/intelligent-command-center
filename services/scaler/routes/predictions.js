/// <reference path="../global.d.ts" />
'use strict'

const TrendsLearningAlgorithm = require('../lib/trends-learning-algorithm')

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  const trendsAlgorithm = new TrendsLearningAlgorithm(app)

  app.get('/predictions/:applicationId', {
    schema: {
      operationId: 'getApplicationPredictions',
      params: {
        type: 'object',
        properties: {
          applicationId: { type: 'string' }
        },
        required: ['applicationId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            applicationId: { type: 'string' },
            predictions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  timeOfDay: { type: 'number' },
                  absoluteTime: { type: 'number' },
                  action: { type: 'string' },
                  pods: { type: 'number' },
                  confidence: { type: 'number' },
                  reasons: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  applicationId: { type: 'string' }
                }
              }
            }
          },
          required: ['applicationId', 'predictions']
        }
      }
    },
    handler: async (req, reply) => {
      const { applicationId } = req.params

      try {
        const predictions = await app.store.getApplicationPredictions(applicationId)

        app.log.info({
          applicationId,
          predictionsCount: predictions.length
        }, 'Application predictions retrieved from store')

        return {
          applicationId,
          predictions
        }
      } catch (err) {
        app.log.error({ err, applicationId }, 'Error getting application predictions')
        throw new Error('Failed to get application predictions')
      }
    }
  })

  app.get('/predictions', {
    schema: {
      operationId: 'getAllPredictions',
      response: {
        200: {
          type: 'object',
          properties: {
            predictions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  timeOfDay: { type: 'number' },
                  absoluteTime: { type: 'number' },
                  action: { type: 'string' },
                  pods: { type: 'number' },
                  confidence: { type: 'number' },
                  reasons: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  applicationId: { type: 'string' }
                }
              }
            },
            totalPredictions: { type: 'number' },
            nextPrediction: {
              oneOf: [
                {
                  type: 'object',
                  properties: {
                    timeOfDay: { type: 'number' },
                    absoluteTime: { type: 'number' },
                    action: { type: 'string' },
                    pods: { type: 'number' },
                    confidence: { type: 'number' },
                    reasons: {
                      type: 'array',
                      items: { type: 'string' }
                    },
                    applicationId: { type: 'string' }
                  }
                },
                { type: 'null' }
              ]
            }
          },
          required: ['predictions', 'totalPredictions']
        }
      }
    },
    handler: async (req, reply) => {
      try {
        const predictions = await app.store.getPredictions()
        const nextPrediction = await app.store.getNextPrediction()

        app.log.info({
          totalPredictions: predictions.length,
          hasNextPrediction: !!nextPrediction
        }, 'All predictions retrieved from store')

        return {
          predictions,
          totalPredictions: predictions.length,
          nextPrediction
        }
      } catch (err) {
        app.log.error({ err }, 'Error getting all predictions')
        throw new Error('Failed to get all predictions')
      }
    }
  })

  app.post('/predictions/calculate', {
    schema: {
      operationId: 'calculatePredictions',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            processedApplications: { type: 'number' },
            totalPredictions: { type: 'number' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  applicationId: { type: 'string' },
                  error: { type: 'string' }
                }
              }
            }
          },
          required: ['success', 'processedApplications', 'totalPredictions']
        }
      }
    },
    handler: async (req, reply) => {
      try {
        const result = await app.platformatic.db.query(app.platformatic.sql`
          SELECT DISTINCT application_id FROM performance_history
        `)

        const errors = []
        let totalPredictions = 0
        let processedApplications = 0

        /* c8 ignore next */
        const rows = result.rows || result || []

        for (const row of rows) {
          const applicationId = row.application_id
          try {
            const result = await trendsAlgorithm.runAnalysis(applicationId)

            if (result.success && result.predictions && result.predictions.length > 0) {
              const predictionsWithAppId = result.predictions.map(p => ({
                ...p,
                applicationId
              }))

              await app.store.replaceApplicationPredictions(applicationId, predictionsWithAppId)

              totalPredictions += predictionsWithAppId.length
              processedApplications++

              app.log.info({
                applicationId,
                predictionsCount: predictionsWithAppId.length
              }, 'Predictions calculated and saved')
            }
          } catch (err) {
            app.log.error({ err, applicationId }, 'Error calculating predictions')
            errors.push({
              applicationId,
              error: err.message
            })
          }
        }

        if (app.isScalerLeader() && app.scheduleNextPrediction) {
          app.log.info('Rescheduling predictions after recalculation')
          await app.scheduleNextPrediction()
        }

        return {
          success: true,
          processedApplications,
          totalPredictions,
          errors
        }
      } catch (err) {
        app.log.error({ err }, 'Error calculating predictions for all applications')
        throw new Error('Failed to calculate predictions')
      }
    }
  })
}
