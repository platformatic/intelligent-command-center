/// <reference path="../global.d.ts" />
'use strict'
/** @param {import('fastify').FastifyInstance} fastify */
module.exports = async function (fastify, opts) {
  fastify.register(require('@fastify/websocket'))
  fastify.register(async (fastify, opts) => {
    fastify.get('/ws', { websocket: true }, async (connection) => {
      connection.on('error', err => {
        fastify.log.error({ err }, 'Connection error.')
        connection.close()
      })

      connection.on('close', () => {
        topicList.forEach(topic => {
          fastify.mq.removeListener(topic, subscriber)
        })
        fastify.log.debug('Connection closed.')
      })
      const subscriber = (message, callback) => {
        connection.send(JSON.stringify(message))
        callback()
      }
      const ack = () => {
        connection.send(JSON.stringify({ command: 'ack' }))
      }
      const topicList = new Set()
      // fastify.mq.on('icc-updates/+', subscriber)
      connection.on('message', async (message) => {
        message = JSON.parse(message.toString())
        switch (message.command) {
          case 'subscribe':
            fastify.mq.on(message.topic, subscriber, ack)
            topicList.add(message.topic)
            break
          case 'unsubscribe':
            topicList.delete(message.topic)
            fastify.mq.removeListener(message.topic, subscriber, ack)
            break
          default:
            fastify.log.error({ message }, 'Unknown command.')
            break
        }
      })
    })
  })
}
