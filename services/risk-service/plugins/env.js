'use strict'

const fp = require('fastify-plugin')
const fastifyEnv = require('@fastify/env')

const schema = {
  type: 'object',
  required: [
    'PLT_ICC_VALKEY_CONNECTION_STRING'
  ],

  properties: {
    PLT_ICC_VALKEY_CONNECTION_STRING: { type: 'string' },
    PLT_RISK_SERVICE_TRACE_ID_EXPIRE: { type: 'number', default: 120 }, // 2 minutes
    PLT_RISK_SERVICE_HTTP_CACHE_EXPIRE: { type: 'number', default: 3600 }, // 1 hour,
    PLT_RISK_SERVICE_URL_ROUTE_EXPIRE: { type: 'number', default: 3600 } // 1 hour
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
