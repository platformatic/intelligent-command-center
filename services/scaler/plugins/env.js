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
    PLT_CONTROL_PLANE_URL: { type: 'string', default: 'http://control-plane.plt.local' },
    PLT_MAIN_SERVICE_URL: { type: 'string', default: 'http://main.plt.local' },
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
    PLT_ICC_SESSION_SECRET: { type: 'string' },

    // LoadPredictor (v2) - Global config
    PLT_SIGNALS_SCALER_RECONNECT_TIMEOUT_MS: { type: 'number', default: 5000 },
    PLT_SIGNALS_SCALER_HORIZONTAL_TREND_THRESHOLD: { type: 'number', default: 0.2 },
    PLT_SIGNALS_SCALER_PENDING_SCALE_UP_EXPIRY_MS: { type: 'number', default: 60000 },
    PLT_SIGNALS_SCALER_REDEPLOY_TIMEOUT_MS: { type: 'number', default: 2 * 60 * 1000 },

    // LoadPredictor - Init timeout tuning
    PLT_SIGNALS_SCALER_INIT_TIMEOUT_WINDOW_SIZE: { type: 'number', default: 5 },
    PLT_SIGNALS_SCALER_INIT_TIMEOUT_STEP_RATE: { type: 'number', default: 0.1 },
    PLT_SIGNALS_SCALER_INIT_TIMEOUT_UP_FACTOR: { type: 'number', default: 1.5 },
    PLT_SIGNALS_SCALER_INIT_TIMEOUT_DOWN_FACTOR: { type: 'number', default: 1.0 },

    // LoadPredictor - Scaling decision parameters
    PLT_SIGNALS_SCALER_SCALE_UP_K: { type: 'number', default: 2 },
    PLT_SIGNALS_SCALER_SCALE_UP_MARGIN: { type: 'number', default: 0.1 },
    PLT_SIGNALS_SCALER_SCALE_DOWN_MARGIN: { type: 'number', default: 0.3 },

    // LoadPredictor - Default app config
    PLT_SIGNALS_SCALER_HORIZON_MULTIPLIER: { type: 'number', default: 1.2 },
    PLT_SIGNALS_SCALER_PROCESSING_INIT_TIMEOUT_MS: { type: 'number', default: 1000 },
    PLT_SIGNALS_SCALER_PROCESSING_COOLDOWN_MS: { type: 'number', default: 10000 },
    PLT_SIGNALS_SCALER_INSTANCES_WINDOW_MS: { type: 'number', default: 180000 },
    PLT_SIGNALS_SCALER_INIT_TIMEOUT_MS: { type: 'number', default: 20000 },

    // LoadPredictor - Cooldowns
    PLT_SIGNALS_SCALER_COOLDOWN_SCALE_UP_AFTER_SCALE_UP_MS: { type: 'number', default: 5000 },
    PLT_SIGNALS_SCALER_COOLDOWN_SCALE_UP_AFTER_SCALE_DOWN_MS: { type: 'number', default: 5000 },
    PLT_SIGNALS_SCALER_COOLDOWN_SCALE_DOWN_AFTER_SCALE_UP_MS: { type: 'number', default: 30000 },
    PLT_SIGNALS_SCALER_COOLDOWN_SCALE_DOWN_AFTER_SCALE_DOWN_MS: { type: 'number', default: 20000 },

    // LoadPredictor - ELU config
    PLT_SIGNALS_SCALER_ELU_WINDOW_MS: { type: 'number', default: 60000 },
    PLT_SIGNALS_SCALER_ELU_SAMPLE_INTERVAL: { type: 'number', default: 1000 },
    PLT_SIGNALS_SCALER_ELU_REDISTRIBUTION_MS: { type: 'number', default: 30000 },
    PLT_SIGNALS_SCALER_ELU_ALPHA_UP: { type: 'number', default: 0.2 },
    PLT_SIGNALS_SCALER_ELU_ALPHA_DOWN: { type: 'number', default: 0.1 },
    PLT_SIGNALS_SCALER_ELU_BETA_UP: { type: 'number', default: 0.2 },
    PLT_SIGNALS_SCALER_ELU_BETA_DOWN: { type: 'number', default: 0.1 },

    // LoadPredictor - Heap config
    PLT_SIGNALS_SCALER_HEAP_WINDOW_MS: { type: 'number', default: 60000 },
    PLT_SIGNALS_SCALER_HEAP_SAMPLE_INTERVAL: { type: 'number', default: 1000 },
    PLT_SIGNALS_SCALER_HEAP_REDISTRIBUTION_MS: { type: 'number', default: 30000 },
    PLT_SIGNALS_SCALER_HEAP_ALPHA_UP: { type: 'number', default: 0.2 },
    PLT_SIGNALS_SCALER_HEAP_ALPHA_DOWN: { type: 'number', default: 0.1 },
    PLT_SIGNALS_SCALER_HEAP_BETA_UP: { type: 'number', default: 0.2 },
    PLT_SIGNALS_SCALER_HEAP_BETA_DOWN: { type: 'number', default: 0.1 },

    // LoadPredictor - Valkey key prefix
    PLT_SIGNALS_SCALER_VALKEY_KEY_PREFIX: { type: 'string', default: 'scaler:' }
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
