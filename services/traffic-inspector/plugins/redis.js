'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async function (app) {
  await app.register(require('@fastify/redis'), {
    url: app.env.PLT_ICC_VALKEY_CONNECTION_STRING,
    enableAutoPipelining: true
  })
}, {
  name: 'redis',
  dependencies: ['env']
})
