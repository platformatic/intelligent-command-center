'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async function (app) {
  app.addHook('onRequest', async (req) => {
    const headers = req.headers
    if (!headers) return

    if (headers['x-user']) {
      req.user = JSON.parse(req.headers['x-user'])
    }

    const machineId = headers['x-plt-machine-id']
    const namespace = headers['x-plt-machine-namespace']
    if (machineId && namespace) {
      req.context = { machineId, namespace }
    }
  })
})
