'use strict'

const fp = require('fastify-plugin')

/** @param {import('fastify').FastifyInstance} fastify */
module.exports = fp(async function (fastify, opts) {
  const machineConnections = new Map()

  fastify.decorate('machineConnections', machineConnections)

  fastify.decorate('executeMachineCommand', async (machineId, command, params = {}) => {
    const connection = machineConnections.get(machineId)
    if (!connection) {
      throw new Error(`No active connection for machine ${machineId}`)
    }

    const commandHandlers = {
      'trigger-flamegraph': () => {
        connection.send(JSON.stringify({
          command: 'trigger-flamegraph',
          params
        }))
        return { triggered: true }
      },
      'trigger-heapprofile': () => {
        connection.send(JSON.stringify({
          command: 'trigger-heapprofile',
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

  fastify.decorate('registerClientHandler', (connection, machineId) => {
    if (machineId) {
      machineConnections.set(machineId, connection)
    }

    connection.on('close', () => {
      if (machineId && machineConnections.get(machineId) === connection) {
        machineConnections.delete(machineId)
      }
    })
  })
}, {
  name: 'watt-requests',
  dependencies: ['config']
})
