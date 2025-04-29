'use strict'
const fp = require('fastify-plugin')
module.exports = fp(async function (app, opts) {
  app.decorate('shouldStoreMetadata', async (applicationId) => {
    const oldMetadata = await app.platformatic.entities.metadatum.find({
      where: {
        applicationId: {
          eq: applicationId
        }
      }
    })
    return oldMetadata.length === 0
  })
})
