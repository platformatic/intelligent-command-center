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

  app.decorate('updateControllerReplicas', async (applicationId, replicas, reason = null) => {
    const controller = await app.getApplicationController(applicationId)
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
    const event = await app.platformatic.entities.scaleEvent.save({
      input: {
        applicationId,
        direction: replicasDiff > 0 ? 'up' : 'down',
        replicas,
        replicasDiff,
        reason
      }
    })

    app.log.info({
      scaleEvent: event
    }, 'Scale event created')

    // Record scaling activity
    await app.recordScalingActivity(applicationId, oldReplicas, replicas, replicasDiff > 0 ? 'up' : 'down', reason)

    return { scaleEvent: event }
  })
}, {
  dependencies: ['activities']
})
