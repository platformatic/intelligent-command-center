'use strict'
/** @param {import('fastify').FastifyInstance} fastify */
module.exports = async function (fastify, opts) {
  fastify.register(require('@fastify/websocket'))
  fastify.register(async (fastify, opts) => {
    fastify.get('/api/updates/icc', { websocket: true }, async (connection) => {
      connection.on('open', () => {
        connection.send(JSON.stringify({ command: 'welcome', message: 'Welcome to the updates service' }))
      })
      connection.on('error', err => {
        fastify.log.error({ err }, 'Connection error.')
        connection.close()
      })

      await fastify.registerUpdates(connection, { namespace: 'icc' })
    })

    fastify.get('/api/updates/applications', { websocket: true }, async (connection) => {
      connection.on('open', () => {
        // TODO: send http request to the control plane
      })
      connection.on('close', () => {
        // TODO: send http request to the control plane
      })

      connection.on('error', err => {
        fastify.log.error({ err }, 'Connection error.')
        connection.close()
      })

      await fastify.registerUpdates(connection, { namespace: 'applications' })
    })
  })
}
