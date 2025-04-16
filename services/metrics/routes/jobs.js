'use strict'

const {
  getJobsMetrics,
  getJobMetrics
} = require('../lib/jobs')

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  app.get('/apps/:appId/jobs', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            averageExecutionTime: { type: 'number' },
            successes: { type: 'number' },
            failures: { type: 'number' },
            sentMessages: { type: 'number' },
            totalRetries: { type: 'number' }
          }
        }
      }
    },
    handler: async (req) => {
      const { appId } = req.params
      app.log.info({ appId }, 'Getting application jobs metrics')
      return getJobsMetrics(appId)
    }
  })

  app.get('/jobs/:jobId', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            averageExecutionTime: { type: 'number' },
            successes: { type: 'number' },
            failures: { type: 'number' },
            sentMessages: { type: 'number' },
            totalRetries: { type: 'number' }
          }
        }
      }
    },
    handler: async (req) => {
      const { jobId } = req.params
      app.log.info({ jobId }, 'Getting application job metrics')
      return getJobMetrics(jobId)
    }
  })
}
