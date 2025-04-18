'use strict'

const pltClient = require('@platformatic/client')
const { join } = require('path')

async function generateUpdatesClientPlugin (app, opts) {
  app.register(pltClient, {
    type: 'openapi',
    name: 'updates',
    path: join(__dirname, 'updates.openapi.json'),
    url: opts.url,
    serviceId: opts.serviceId,
    throwOnError: opts.throwOnError,
    fullResponse: false,
    fullRequest: false,
    validateResponse: false,
    getHeaders: opts.getHeaders
  })
}

generateUpdatesClientPlugin[Symbol.for('plugin-meta')] = {
  name: 'updates OpenAPI Client'
}
generateUpdatesClientPlugin[Symbol.for('skip-override')] = true

module.exports = generateUpdatesClientPlugin
module.exports.default = generateUpdatesClientPlugin
