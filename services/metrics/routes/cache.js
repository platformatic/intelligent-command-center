'use strict'

const { getCacheStats } = require('../lib/cache')

module.exports = async function (app) {
  app.get('/cache/apps/:appId', {
    handler: async (req) => {
      const { appId: applicationId } = req.params
      app.log.info({ applicationId }, 'Getting cache metrics')
      return getCacheStats({ applicationId })
    }
  })

  app.get('/cache', {
    handler: async (req) => {
      app.log.info('Getting cache metrics')
      return getCacheStats()
    }
  })
}
