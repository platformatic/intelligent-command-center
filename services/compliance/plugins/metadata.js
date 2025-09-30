'use strict'
const fp = require('fastify-plugin')
module.exports = fp(async function (app) {
  app.decorate('shouldStoreMetadata', async (applicationId, deploymentId) => {
    const oldMetadata = await app.platformatic.entities.metadatum.find({
      where: {
        applicationId: { eq: applicationId },
        deploymentId: { eq: deploymentId }
      }
    })
    return oldMetadata.length === 0
  })
})
