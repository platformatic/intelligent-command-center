'use strict'

const mqemmiter = require('mqemitter-redis')
const fp = require('fastify-plugin')

async function plugin (app) {
  const mq = mqemmiter({
    port: app.config.PLT_MAIN_REDIS_PORT,
    host: app.config.PLT_MAIN_REDIS_HOST,
    db: app.config.PLT_MAIN_REDIS_DB
  })

  app.addHook('onClose', async () => {
    await new Promise((resolve) => mq.close(resolve))
  })

  app.decorate('registerUpdates', async (connection, opts = {}) => {
    const namespace = opts.namespace || ''

    const subscriber = (message, callback) => {
      if (message.topic.startsWith(namespace)) {
        message.topic = message.topic.substring(namespace.length + 1)
      }
      connection.send(JSON.stringify(message))
      callback()
    }
    const ack = () => {
      connection.send(JSON.stringify({ command: 'ack' }))
    }

    const topicList = new Set()

    connection.on('message', async (message) => {
      message = JSON.parse(message.toString())

      const topic = getTopicName(message.topic, namespace)
      switch (message.command) {
        case 'subscribe':
          mq.on(topic, subscriber, ack)
          topicList.add(topic)
          break
        case 'unsubscribe':
          topicList.delete(topic)
          mq.removeListener(topic, subscriber, ack)
          break
        default:
          app.log.error({ message }, 'Unknown command for updates websocket.')
          break
      }
    })

    connection.on('close', () => {
      topicList.forEach(topic => {
        app.mq.removeListener(topic, subscriber)
      })
      app.log.debug('Connection closed.')
    })
  })

  app.decorate('emitUpdate', (message, opts = {}) => {
    const namespace = opts.namespace || ''
    const topic = getTopicName(message.topic, namespace)
    mq.emit({ ...message, topic })
  })

  function getTopicName (topic, namespace) {
    if (!namespace || topic.startsWith(namespace)) {
      return topic
    }
    if (namespace.endsWith('/')) {
      return namespace + topic
    }
    return namespace + '/' + topic
  }
}

module.exports = fp(plugin, {
  name: 'updates'
})
