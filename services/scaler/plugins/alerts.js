'use strict'

const fp = require('fastify-plugin')
const AlertStore = require('../lib/alert-store')

module.exports = fp(async function (app) {
  const redisUrl = app.env.PLT_ICC_VALKEY_CONNECTION_STRING
  const alertStore = new AlertStore(redisUrl, app.log)

  app.addHook('onClose', async () => {
    await alertStore.close()
  })

  app.decorate('alertStore', alertStore)
}, {
  name: 'alerts',
  dependencies: ['env']
})
