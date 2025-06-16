/// <reference path="../global.d.ts" />
'use strict'

const TrendsLearningAlgorithm = require('../lib/trends-learning-algorithm')

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  let trendsAlgorithm
  try {
    trendsAlgorithm = new TrendsLearningAlgorithm(app)
  } catch (err) {
    app.log.error({ err }, 'Failed to initialize TrendsLearningAlgorithm')
    throw err
  }

  app.get('/predictions/:applicationId', {
    logLevel: 'info',
    schema: {
      operationId: 'getPredictionAnalysis',
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
            success: { type: 'boolean' },
            predictions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  timeSlot: { type: 'number' },
                  confidence: { type: 'number' },
                  podsToAdd: { type: 'number' },
                  reason: { type: 'string' },
                  absoluteTime: { type: 'number' },
                  targetTime: { type: 'string' }
                }
              }
            },
            analysisTime: { type: 'number' },
            error: { type: 'string' }
          },
          required: ['success']
        }
      }
    },
    handler: async (req, reply) => {
      const { applicationId } = req.params

      try {
        const result = await trendsAlgorithm.runAnalysis(applicationId)

        app.log.info({
          applicationId,
          predictionsCount: result.predictions?.length || 0,
          success: result.success
        }, 'Prediction analysis requested')

        return result
      } catch (err) {
        app.log.error({ err, applicationId }, 'Error getting prediction analysis')
        throw new Error('Failed to get prediction analysis', { applicationId, error: err.message })
      }
    }
  })

  app.get('/predictions/:applicationId/current', {
    logLevel: 'info',
    schema: {
      operationId: 'getCurrentPrediction',
      params: {
        type: 'object',
        properties: {
          applicationId: { type: 'string' }
        },
        required: ['applicationId']
      },
      querystring: {
        type: 'object',
        properties: {
          time: {
            type: 'number',
            description: 'Timestamp in milliseconds (defaults to current time)'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            prediction: {
              oneOf: [
                {
                  type: 'object',
                  properties: {
                    timeSlot: { type: 'number' },
                    confidence: { type: 'number' },
                    podsToAdd: { type: 'number' },
                    reason: { type: 'string' },
                    absoluteTime: { type: 'number' },
                    targetTime: { type: 'string' }
                  }
                },
                { type: 'null' }
              ]
            },
            requestedTime: { type: 'number' },
            applicationId: { type: 'string' }
          },
          required: ['prediction', 'requestedTime', 'applicationId']
        }
      }
    },
    handler: async (req, reply) => {
      const { applicationId } = req.params
      const currentTime = req.query.time || Date.now()

      try {
        const prediction = await trendsAlgorithm.getCurrentPrediction(applicationId, currentTime)

        app.log.info({
          applicationId,
          requestedTime: currentTime,
          hasPrediction: !!prediction
        }, 'Current prediction requested')

        return {
          prediction,
          requestedTime: currentTime,
          applicationId
        }
      } catch (err) {
        app.log.error({ err, applicationId, requestedTime: currentTime }, 'Error getting current prediction')
        throw new Error('Failed to get current prediction', { applicationId, requestedTime: currentTime, error: err.message })
      }
    }
  })

  app.get('/predictions/:applicationId/summary', {
    logLevel: 'info',
    schema: {
      operationId: 'getPredictionSummary',
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
            success: { type: 'boolean' },
            applicationId: { type: 'string' },
            totalPredictions: { type: 'number' },
            highConfidencePredictions: { type: 'number' },
            averageConfidence: { type: 'number' },
            totalPodsToAdd: { type: 'number' },
            analysisTime: { type: 'number' },
            nextPrediction: {
              oneOf: [
                {
                  type: 'object',
                  properties: {
                    timeSlot: { type: 'number' },
                    confidence: { type: 'number' },
                    podsToAdd: { type: 'number' },
                    reason: { type: 'string' },
                    absoluteTime: { type: 'number' },
                    targetTime: { type: 'string' }
                  }
                },
                { type: 'null' }
              ]
            },
            error: { type: 'string' }
          },
          required: ['success', 'applicationId']
        }
      }
    },
    handler: async (req, reply) => {
      const { applicationId } = req.params

      try {
        const result = await trendsAlgorithm.runAnalysis(applicationId)

        if (!result.success) {
          return {
            success: false,
            applicationId,
            error: result.error
          }
        }

        const predictions = result.predictions || []
        const now = Date.now()

        // Calculate statistics
        const totalPredictions = predictions.length
        const highConfidencePredictions = predictions.filter(p => p.confidence > 0.8).length
        const averageConfidence = totalPredictions > 0
          ? predictions.reduce((sum, p) => sum + p.confidence, 0) / totalPredictions
          : 0
        const totalPodsToAdd = predictions.reduce((sum, p) => sum + p.podsToAdd, 0)

        // Find next prediction
        const nextPrediction = predictions
          .filter(p => p.absoluteTime > now)
          .sort((a, b) => a.absoluteTime - b.absoluteTime)[0] || null

        const summary = {
          success: true,
          applicationId,
          totalPredictions,
          highConfidencePredictions,
          averageConfidence: Math.round(averageConfidence * 100) / 100, // Round to 2 decimal places
          totalPodsToAdd,
          analysisTime: result.analysisTime,
          nextPrediction
        }

        app.log.info({
          applicationId,
          ...summary
        }, 'Prediction summary requested')

        return summary
      } catch (err) {
        app.log.error({ err, applicationId }, 'Error getting prediction summary')
        throw new Error('Failed to get prediction summary', { applicationId, error: err.message })
      }
    }
  })
}
