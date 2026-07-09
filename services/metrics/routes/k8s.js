'use strict'

const { getAppK8SMetrics, getAppRPSMetrics, getInfraK8SMetrics, getVersionRPSMetrics } = require('../lib/k8s')
const { getVersionInstance } = require('../lib/control-plane')

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  app.get('/kubernetes/apps/:appId', {
    handler: async (req) => {
      const { appId } = req.params
      const { versionLabel } = req.query
      // Resolve the version id to its workload instance (app.kubernetes.io/instance);
      // null -> whole-app metrics.
      const instance = await getVersionInstance(req.controlPlane, appId, versionLabel, app.log)
      app.log.info({ appId, versionLabel, instance }, 'Getting K8s metrics')
      return getAppK8SMetrics(appId, instance)
    }
  })

  app.get('/kubernetes/apps/:appId/rps', {
    handler: async (req) => {
      const { appId } = req.params
      const rps = await getAppRPSMetrics(appId)
      return { rps }
    }
  })

  // RPS for one version, keyed by its workload instance (app.kubernetes.io/instance
  // = the registry controllerName), which is globally unique per version and, unlike
  // plt.dev/version, is exposed by kube-state-metrics and present on every pod.
  app.get('/kubernetes/instances/:instance/rps', {
    schema: {
      params: {
        type: 'object',
        properties: {
          instance: { type: 'string' }
        },
        required: ['instance']
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
      const { instance } = req.params
      const { window: timeWindow } = req.query
      const rps = await getVersionRPSMetrics(instance, timeWindow)
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
