'use strict'

const fp = require('fastify-plugin')
const fastifyEnv = require('@fastify/env')

const schema = {
  type: 'object',
  required: [
    'PLT_ICC_VALKEY_CONNECTION_STRING',
    'PLT_MACHINIST_URL'
  ],
  properties: {
    PLT_ICC_VALKEY_CONNECTION_STRING: { type: 'string' },
    PLT_METRICS_PROMETHEUS_URL: { type: 'string' },
    PLT_METRICS_TIME_RANGE: { type: 'number', default: 60 }, // in seconds
    PLT_SCALER_DEBOUNCE: { type: 'number', default: 10000 },
    PLT_MACHINIST_URL: { type: 'string' }
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
