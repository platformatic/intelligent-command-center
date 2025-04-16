'use strict'

const fp = require('fastify-plugin')
const fastifyEnv = require('@fastify/env')

const schema = {
  type: 'object',
  required: [
    'PLT_UPDATES_REDIS_HOST',
    'PLT_UPDATES_REDIS_PORT',
    'PLT_UPDATES_REDIS_DB'
  ],

  properties: {
    PLT_UPDATES_REDIS_HOST: { type: 'string' },
    PLT_UPDATES_REDIS_PORT: { type: 'number' },
    PLT_UPDATES_REDIS_DB: { type: 'string' }
  }
}

const fastifyEnvOpts = {
  schema,
  confKey: 'config',
  dotenv: true
}

async function envPlugin (fastify) {
  fastify.register(fastifyEnv, fastifyEnvOpts)
}

module.exports = fp(envPlugin, { name: 'config' })
