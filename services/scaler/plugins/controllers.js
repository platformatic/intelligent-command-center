/// <reference path="../global.d.ts" />

'use strict'

const fp = require('fastify-plugin')
const errors = require('../lib/errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  app.decorate('getApplicationController', async (applicationId) => {
    const controllers = await app.platformatic.entities.controller.find({
      where: { applicationId: { eq: applicationId } },
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: 1
    })
    return controllers.length === 1 ? controllers[0] : null
  })

  app.decorate('getApplicationControllers', async (applicationId) => {
    return app.platformatic.entities.controller.find({
      where: { applicationId: { eq: applicationId } },
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    })
  })

  app.decorate('getControllerByK8sId', async (applicationId, k8sControllerId) => {
    const controllers = await app.platformatic.entities.controller.find({
      where: {
        applicationId: { eq: applicationId },
        k8SControllerId: { eq: k8sControllerId }
      },
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: 1
    })
    return controllers.length === 1 ? controllers[0] : null
  })

  app.decorate('getControllerByDeploymentId', async (applicationId, deploymentId) => {
    const controllers = await app.platformatic.entities.controller.find({
      where: {
        applicationId: { eq: applicationId },
        deploymentId: { eq: deploymentId }
      },
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: 1
    })
    return controllers.length === 1 ? controllers[0] : null
  })

  app.decorate('updateControllerReplicas', async (applicationId, replicas, reason = null, controller = null, options = {}) => {
    controller = controller || await app.getApplicationController(applicationId)
    if (controller === null) {
      throw new errors.APPLICATION_CONTROLLER_NOT_FOUND(applicationId)
    }

    const oldReplicas = controller.replicas
    const replicasDiff = replicas - oldReplicas

    if (replicasDiff === 0) {
      app.log.info({ applicationId, replicas }, 'No change in replicas, skipping update')
      return
    }

    // Update controller in Kubernetes
    await app.machinist.updateController(
      controller.k8SControllerId,
      controller.namespace,
      controller.apiVersion,
      controller.kind,
      replicas
    )

    await app.platformatic.entities.controller.save({
      input: {
        id: controller.id,
        applicationId,
        replicas
      }
    })

    // Create scale event record
    const input = {
      applicationId,
      direction: replicasDiff > 0 ? 'up' : 'down',
      replicas,
      replicasDiff,
      reason
    }
    // Set by the v2 load-predictor algorithm on scale-up events
    if (options.triggerService && options.triggerMetric) {
      input.triggerService = options.triggerService
      input.triggerMetric = options.triggerMetric
    }

    const event = await app.platformatic.entities.scaleEvent.save({ input })

    app.log.info({
      scaleEvent: event
    }, 'Scale event created')

    // Record scaling activity
    await app.recordScalingActivity(applicationId, oldReplicas, replicas, replicasDiff > 0 ? 'up' : 'down', reason)

    return { scaleEvent: event }
  })
}, {
  name: 'controllers',
  dependencies: ['activities']
})
