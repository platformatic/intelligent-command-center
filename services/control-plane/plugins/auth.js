'use strict'

const authContextPlugin = require('../../../lib/auth-context-plugin')

module.exports = async function (app) {
  await app.register(authContextPlugin)
}
