/// <reference path="../global.d.ts" />

'use strict'

const fp = require('fastify-plugin')
const errors = require('../lib/errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  app.decorate('getApplicationController', async (applicationId) => {
    const controllers = await app.platformatic.entities.controller.find({
      where: { applicationId: { eq: applicationId } },
      orderBy: { createdAt: 'desc' },
      limit: 1
    })
    return controllers.length === 1 ? controllers[0] : null
  })

  app.decorate('updateControllerReplicas', async (applicationId, replicas) => {
    const controller = await app.getApplicationController(applicationId)
    if (controller === null) {
      throw new errors.APPLICATION_CONTROLLER_NOT_FOUND(applicationId)
    }

    await app.machinist.updateController(
      controller.controllerId,
      controller.namespace,
      controller.apiVersion,
      controller.kind,
      replicas
    )

    await app.platformatic.entities.controller.save({
      input: {
        applicationId,
        deploymentId: controller.deploymentId,
        controllerId: controller.controllerId,
        namespace: controller.namespace,
        apiVersion: controller.apiVersion,
        kind: controller.kind,
        replicas
      }
    })
  })
})
