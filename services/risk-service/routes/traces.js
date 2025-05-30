'use strict'

const fp = require('fastify-plugin')

async function plugin (fastify) {
  fastify.post('/v1/traces', async (request) => {
    const applicationId = request.headers['x-platformatic-application-id']
    const { resourceSpans } = request.body

    const ctx = { req: request }
    await fastify.processResourceSpans(resourceSpans, applicationId, ctx)
  })
}

module.exports = fp(plugin, {
  name: 'traces-api',
  dependencies: ['messages', 'spans']
})
