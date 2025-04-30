'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async function (app) {
  app.addHook('onRequest', async (req) => {
    const headers = req.headers
    if (!headers) return

    if (headers['x-user']) {
      req.user = JSON.parse(req.headers['x-user'])
    }

    if (headers['x-k8s']) {
      req.k8s = JSON.parse(req.headers['x-k8s'])
    }
  })
})
