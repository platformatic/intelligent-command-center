'use strict'

const { getAppK8SMetrics, getAppRPSMetrics, getInfraK8SMetrics } = require('../lib/k8s')

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

  app.get('/kubernetes/infra', {
    handler: async () => {
      app.log.info('Getting infra K8s metrics')
      return getInfraK8SMetrics()
    }
  })
}
