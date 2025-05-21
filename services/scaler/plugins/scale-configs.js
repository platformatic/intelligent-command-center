'use strict'

const fp = require('fastify-plugin')
const errors = require('../lib/errors')

module.exports = fp(async function (app) {
  const defaultMinPods = app.env.PLT_SCALER_MIN_PODS_DEFAULT
  const defaultMaxPods = app.env.PLT_SCALER_MAX_PODS_DEFAULT

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

  app.decorate('saveDefaultScaleConfig', async (applicationId) => {
    const scaleConfig = await app.getScaleConfig(applicationId)
    if (scaleConfig !== null) return

    await app.platformatic.entities.applicationScaleConfig.save({
      input: {
        applicationId,
        minPods: defaultMinPods,
        maxPods: defaultMaxPods
      }
    })
  })
}, {
  name: 'scale-config',
  dependencies: ['env']
})
