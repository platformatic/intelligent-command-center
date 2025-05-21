'use strict'

const fp = require('fastify-plugin')

async function plugin (fastify) {
  fastify.post('/v1/traces', async () => {})
}

module.exports = fp(plugin, {
  name: 'traces-api'
})
