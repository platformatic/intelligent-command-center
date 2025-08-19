'use strict'

const fp = require('fastify-plugin')

/** @param {import('fastify').FastifyInstance} fastify */
module.exports = fp(async function (fastify, opts) {
  const podConnections = new Map()

  fastify.decorate('podConnections', podConnections)

  fastify.decorate('executePodCommand', async (podId, command, params = {}) => {
    const connection = podConnections.get(podId)
    if (!connection) {
      throw new Error(`No active connection for pod ${podId}`)
    }

    const commandHandlers = {
      'trigger-flamegraph': () => {
        connection.send(JSON.stringify({
          command: 'trigger-flamegraph',
          params
        }))
        return { triggered: true }
      }
    }

    const handler = commandHandlers[command]
    if (!handler) {
      throw new Error(`Unknown command: ${command}`)
    }

    return handler()
  })

  fastify.decorate('registerClientHandler', (connection, podId) => {
    if (podId) {
      podConnections.set(podId, connection)
    }

    connection.on('close', () => {
      if (podId && podConnections.get(podId) === connection) {
        podConnections.delete(podId)
      }
    })
  })
}, {
  name: 'watt-requests',
  dependencies: ['config']
})
