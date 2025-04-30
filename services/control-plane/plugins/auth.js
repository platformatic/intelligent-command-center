'use strict'

const authContextPlugin = require('../../../lib/auth-context-plugin')
const fp = require('fastify-plugin')

module.exports = fp(async function (app) {
  await app.register(authContextPlugin)
})
