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
    PLT_METRICS_POLLING_INTERVAL: { type: 'number', default: 5000 },
    PLT_METRICS_TIME_RANGE: { type: 'string', default: '1m' },
    PLT_SCALER_PROMETHEUS_URL: { type: 'string' }
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
