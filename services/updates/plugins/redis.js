/// <reference path="../global.d.ts" />
'use strict'
const redis = require('mqemitter-redis')
const fp = require('fastify-plugin')
/** @param {import('fastify').FastifyInstance} fastify */
async function redisPlugin (fastify, opts) {
  const mq = redis({
    port: fastify.config.PLT_UPDATES_REDIS_PORT,
    host: fastify.config.PLT_UPDATES_REDIS_HOST,
    db: fastify.config.PLT_UPDATES_REDIS_DB
  })
  fastify.decorate('mq', mq)

  fastify.addHook('onClose', async (fastify) => {
    await new Promise((resolve) => mq.close(resolve))
  })
}

module.exports = fp(redisPlugin, {
  name: 'redis',
  dependencies: ['config']
})
