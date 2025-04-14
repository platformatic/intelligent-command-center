'use strict'

const fp = require('fastify-plugin')
const fastifyEnv = require('@fastify/env')

const schema = {
  type: 'object',
  required: [
    'PLT_USER_MANAGER_SESSION_SECRET_KEY'
  ],

  properties: {
    PLT_USER_MANAGER_SESSION_SECRET_KEY: { type: 'string' },
    PLT_USER_MANAGER_SUPER_ADMIN_EMAIL: { type: 'string' }
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
