'use strict'

const fp = require('fastify-plugin')

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
