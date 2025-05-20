'use strict'

const fp = require('fastify-plugin')
const errors = require('../lib/errors')

module.exports = fp(async function (app) {
  app.decorate('getScaleConfig', async (applicationId) => {
    const scaleConfigs = await app.platformatic.entities.applicationScaleConfig.find({
      where: { applicationId: { eq: applicationId } },
      orderBy: [
        {
          field: 'createdAt',
          direction: 'desc'
        }
      ],
      limit: 1
    })
    return scaleConfigs.length > 0 ? scaleConfigs[0] : null
  })

  app.decorate('saveScaleConfig', async (applicationId, config) => {
    const controller = await app.getApplicationController(applicationId)
    if (controller === null) {
      throw new errors.APPLICATION_CONTROLLER_NOT_FOUND(applicationId)
    }

    const replicas = controller.replicas
    if (replicas < config.minPods) {
      await app.updateControllerReplicas(applicationId, config.minPods)
    }
    if (replicas > config.maxPods) {
      await app.updateControllerReplicas(applicationId, config.maxPods)
    }

    const scaleConfig = await app.platformatic.entities.applicationScaleConfig.save({
      input: {
        applicationId,
        minPods: config.minPods,
        maxPods: config.maxPods
      }
    })
    return scaleConfig
  })
}, { name: 'scale-config' })
