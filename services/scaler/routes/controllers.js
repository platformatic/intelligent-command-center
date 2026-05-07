/// <reference path="../global.d.ts" />
'use strict'

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  app.put('/controllers/:namespace/:k8sControllerId/scaling-disabled', {
    schema: {
      params: {
        type: 'object',
        properties: {
          namespace: { type: 'string' },
          k8sControllerId: { type: 'string' }
        },
        required: ['namespace', 'k8sControllerId']
      },
      body: {
        type: 'object',
        properties: {
          disabled: { type: 'boolean' }
        },
        required: ['disabled']
      }
    },
    handler: async (req) => {
      const { namespace, k8sControllerId } = req.params
      const { disabled } = req.body
      const controllers = await app.platformatic.entities.controller.find({
        where: {
          namespace: { eq: namespace },
          controllerId: { eq: k8sControllerId }
        }
      })
      if (controllers.length === 0) {
        return { success: false, error: 'controller not found' }
      }
      await app.platformatic.entities.controller.save({
        input: { id: controllers[0].id, scalingDisabled: disabled }
      })
      return { success: true }
    }
  })

  app.post('/controllers', {
    schema: {
      operationId: 'saveMachineController',
      body: {
        type: 'object',
        properties: {
          applicationId: { type: 'string' },
          deploymentId: { type: 'string' },
          namespace: { type: 'string' },
          machineId: { type: 'string' }
        },
        required: ['applicationId', 'deploymentId', 'namespace', 'machineId']
      }
    },
    handler: async (req) => {
      const { applicationId, deploymentId, namespace, machineId } = req.body

      const controller = await app.machinist.getPodController(machineId, namespace)
      await app.saveDefaultScaleConfig(applicationId)

      await app.platformatic.entities.controller.save({
        input: {
          applicationId,
          deploymentId,
          namespace,
          controllerId: controller.name,
          // Opaque per-provider info (e.g. K8s: { kind, apiVersion }; ECS: {})
          providerMetadata: controller.providerMetadata ?? {},
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
