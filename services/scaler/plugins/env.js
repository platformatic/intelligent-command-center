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
    PLT_SCALER_ELU_THRESHOLD: { type: 'number', default: 0.8 },
    PLT_SCALER_HEAP_THRESHOLD: { type: 'number', default: 0.85 },
    PLT_SCALER_POST_EVAL_WINDOW: { type: 'number', default: 300 },
    PLT_SCALER_COOLDOWN: { type: 'number', default: 15 },
    PLT_SCALER_MIN_PODS_DEFAULT: { type: 'number', default: 1 },
    PLT_SCALER_MAX_PODS_DEFAULT: { type: 'number', default: 10 },
    PLT_SCALER_PERIODIC_TRIGGER: { type: 'number', default: 60 }, // in seconds
    PLT_SCALER_SYNC_K8S: { type: 'number', default: 60 }, // in seconds
    PLT_FEATURE_SCALER_TRENDS_LEARNING: { type: 'boolean', default: false },
    PLT_SCALER_POD_MIN_LABEL: { type: 'string', default: 'icc.platformatic.dev/scaler-min' },
    PLT_SCALER_POD_MIN_DEFAULT_VALUE: { type: 'number', default: 1 },
    PLT_SCALER_POD_MAX_LABEL: { type: 'string', default: 'icc.platformatic.dev/scaler-max' },
    PLT_SCALER_POD_MAX_DEFAULT_VALUE: { type: 'number', default: 10 },
    PLT_MACHINIST_URL: { type: 'string' },
    PLT_SCALER_ALGORITHM_VERSION: { type: 'string', default: 'v1', enum: ['v1', 'v2'] },
    PLT_SIGNALS_SCALER_FW: { type: 'number', default: 15000 },
    PLT_SIGNALS_SCALER_SW: { type: 'number', default: 60000 },
    PLT_SIGNALS_SCALER_LW: { type: 'number', default: 300000 },
    PLT_SIGNALS_SCALER_HOT_RATE_THRESHOLD: { type: 'number', default: 0.5 },
    PLT_SIGNALS_SCALER_UP_FW_RATE_THRESHOLD: { type: 'number', default: 0.2 },
    PLT_SIGNALS_SCALER_UP_SW_RATE_THRESHOLD: { type: 'number', default: 0.15 },
    PLT_SIGNALS_SCALER_DOWN_SW_RATE_THRESHOLD: { type: 'number', default: 0.05 },
    PLT_SIGNALS_SCALER_DOWN_LW_RATE_THRESHOLD: { type: 'number', default: 0.03 },
    PLT_SIGNALS_SCALER_PERIODIC_TRIGGER: { type: 'number', default: 60 },
    PLT_SIGNALS_SCALER_LOCK_TTL: { type: 'number', default: 10 },
    PLT_SIGNALS_SCALER_MAX_ITERATIONS: { type: 'number', default: 10 },
    PLT_SIGNALS_SCALER_PENDING_TTL: { type: 'number', default: 60 }
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
