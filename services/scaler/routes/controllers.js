/// <reference path="../global.d.ts" />
'use strict'

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  app.post('/controllers', {
    schema: {
      operationId: 'savePodController',
      body: {
        type: 'object',
        properties: {
          applicationId: { type: 'string' },
          deploymentId: { type: 'string' },
          namespace: { type: 'string' },
          podId: { type: 'string' }
        },
        required: ['applicationId', 'deploymentId', 'namespace', 'podId']
      }
    },
    handler: async (req) => {
      const { applicationId, deploymentId, namespace, podId } = req.body

      const controller = await app.machinist.getPodController(podId, namespace)
      await app.saveDefaultScaleConfig(applicationId)

      await app.platformatic.entities.controller.save({
        input: {
          applicationId,
          deploymentId,
          namespace,
          k8SControllerId: controller.name,
          kind: controller.kind,
          apiVersion: controller.apiVersion,
          replicas: controller.replicas
        }
      })

      // Create initial scale event
      await app.platformatic.entities.scaleEvent.save({
        input: {
          applicationId,
          direction: 'up',
          replicas: controller.replicas,
          replicasDiff: controller.replicas,
          reason: 'Initial controller creation'
        }
      })
    }
  })
}
