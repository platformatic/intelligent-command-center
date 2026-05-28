'use strict'

const fp = require('fastify-plugin')
const massimoFastifyPlugin = require('massimo/fastify-plugin')

// applicationId 'control-plane' -> PLT_CONTROL_PLANE_URL.
// Allows tests (and overrides in general) to point a client at a mock
// server without touching production config.
function urlFor (applicationId) {
  const envKey = 'PLT_' + applicationId.toUpperCase().replace(/-/g, '_') + '_URL'
  return process.env[envKey] || `http://${applicationId}.plt.local`
}

function registerClients (clients) {
  return fp(async function (app) {
    for (const c of clients) {
      await app.register(massimoFastifyPlugin, {
        type: 'openapi',
        url: urlFor(c.applicationId),
        path: c.schema,
        name: c.name,
        fullResponse: false,
        fullRequest: false,
        throwOnError: false
      })
    }
  })
}

module.exports = { registerClients, urlFor }
