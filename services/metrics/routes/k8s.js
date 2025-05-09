'use strict'

const { getAppK8SMetrics, getAppK8sRPS, getInfraK8SMetrics } = require('../lib/k8s')
const { getDeployment } = require('../lib/control-plane')

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  app.get('/kubernetes/apps/:appId', {
    handler: async (req) => {
      const { appId } = req.params
      app.log.info({ appId }, 'Getting K8s metrics')
      const { controlPlane } = req
      const deployment = await getDeployment(controlPlane, appId, app.log)
      if (!deployment) {
        throw new Error(`No deployment found for application ${appId}`)
      }
      const machineId = deployment.machineId
      return getAppK8SMetrics(machineId, appId)
    }
  })

  app.get('/kubernetes/apps/:appId/rps', {
    handler: async (req) => {
      const { appId } = req.params
      const { controlPlane } = req
      const deployment = await getDeployment(controlPlane, appId, app.log)
      if (!deployment) {
        throw new Error(`No deployment found for application ${appId}`)
      }
      const machineId = deployment.machineId

      return getAppK8sRPS(machineId)
    }
  })

  app.get('/kubernetes/infra', {
    handler: async () => {
      app.log.info('Getting infra K8s metrics')
      return getInfraK8SMetrics()
    }
  })
}
