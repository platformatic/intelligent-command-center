'use strict'

const mqemmiter = require('mqemitter-redis')
const fp = require('fastify-plugin')

async function plugin (app) {
  const mq = mqemmiter({
    connectionString: app.env.PLT_ICC_VALKEY_CONNECTION_STRING,
    keyPrefix: 'updates'
  })

  app.addHook('onClose', async () => {
    await new Promise((resolve) => mq.close(resolve))
  })

  app.decorate('emitUpdate', async (namespace, message) => {
    const topic = namespace ? `${namespace}/${message.topic}` : message.topic
    return new Promise((resolve, reject) => {
      mq.emit({ ...message, topic }, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  })
}

module.exports = fp(plugin, {
  name: 'updates',
  dependencies: ['env']
})
