'use strict'

const fp = require('fastify-plugin')
const fastifyEnv = require('@fastify/env')

const schema = {
  type: 'object',
  required: [
    'PLT_FEATURE_CACHE'
  ],

  properties: {
    PLT_FEATURE_CACHE: { type: 'boolean', default: false },
    PLT_APPLICATIONS_VALKEY_CONNECTION_STRING: { type: 'string' },
    PLT_CACHE_MANAGER_CONFIGURE_KEYSPACE_EVENT_NOTIFY: { type: 'boolean', default: true } // Matches current implementation
  }
}

const fastifyEnvOpts = {
  schema,
  confKey: 'env',
  dotenv: true
}

async function envPlugin (fastify) {
  fastify.register(fastifyEnv, fastifyEnvOpts)
}

module.exports = fp(envPlugin, { name: 'env' })
