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
    PLT_SCALER_MAX_HISTORY: { type: 'number', default: 10 },
    PLT_SCALER_MAX_CLUSTERS: { type: 'number', default: 5 },
    PLT_SCALER_ELU_THRESHOLD: { type: 'number', default: 0.9 },
    PLT_SCALER_HEAP_THRESHOLD: { type: 'number', default: 0.85 },
    PLT_SCALER_POST_EVAL_WINDOW: { type: 'number', default: 300 },
    PLT_SCALER_COOLDOWN: { type: 'number', default: 300 },
    PLT_SCALER_MIN_PODS_DEFAULT: { type: 'number', default: 1 },
    PLT_SCALER_MAX_PODS_DEFAULT: { type: 'number', default: 10 },
    PLT_SCALER_PERIODIC_TRIGGER: { type: 'number', default: 60000 }, // in milliseconds
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
