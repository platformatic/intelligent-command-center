'use strict'

const fp = require('fastify-plugin')
const Store = require('../lib/store')

module.exports = fp(async function (app) {
  const redisUrl = app.env.PLT_ICC_VALKEY_CONNECTION_STRING
  const store = new Store(redisUrl, app.log)

  app.addHook('onClose', async () => {
    await store.close()
  })

  app.decorate('store', store)
}, {
  name: 'store',
  dependencies: ['env']
})
