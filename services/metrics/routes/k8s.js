'use strict'

const { getAppK8SMetrics, getAppRPSMetrics, getInfraK8SMetrics, getVersionRPSMetrics } = require('../lib/k8s')

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  app.get('/kubernetes/apps/:appId', {
    handler: async (req) => {
      const { appId } = req.params
      app.log.info({ appId }, 'Getting K8s metrics')
      return getAppK8SMetrics(appId)
    }
  })

  app.get('/kubernetes/apps/:appId/rps', {
    handler: async (req) => {
      const { appId } = req.params
      const rps = await getAppRPSMetrics(appId)
      return { rps }
    }
  })

  app.get('/kubernetes/versions/:appLabel/:versionLabel/rps', {
    schema: {
      params: {
        type: 'object',
        properties: {
          appLabel: { type: 'string' },
          versionLabel: { type: 'string' }
        },
        required: ['appLabel', 'versionLabel']
      },
      querystring: {
        type: 'object',
        properties: {
          window: { type: 'string' }
        },
        required: ['window']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            rps: { type: 'number' }
          },
          required: ['rps'],
          additionalProperties: false
        }
      }
    },
    handler: async (req) => {
      const { appLabel, versionLabel } = req.params
      const { window: timeWindow } = req.query
      const rps = await getVersionRPSMetrics(appLabel, versionLabel, timeWindow)
      return { rps }
    }
  })

  app.get('/kubernetes/infra', {
    handler: async () => {
      app.log.info('Getting infra K8s metrics')
      return getInfraK8SMetrics()
    }
  })
}
