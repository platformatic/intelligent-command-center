'use strict'

const fp = require('fastify-plugin')
const fastifyEnv = require('@fastify/env')
const { EVERY_DAY, EVERY_12_HOURS } = require('../lib/cron-expressions')

const schema = {
  type: 'object',
  required: [],

  properties: {
    // Features for ICC jobs
    PLT_FEATURE_CACHE_RECOMMENDATIONS: { type: 'boolean', default: false },
    PLT_FEATURE_RISK_SERVICE_DUMP: { type: 'boolean', default: false },
    PLT_FEATURE_FFC: { type: 'boolean', default: false },
    PLT_FEATURE_SCALER_TRENDS_LEARNING: { type: 'boolean', default: false },

    // Useful for tests
    PLT_CRON_DISABLE_ICC_JOBS: { type: 'boolean', default: false },

    // Risk Service
    PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_NAME: { type: 'string', default: 'risk-service-dump' },
    PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_CRON: { type: 'string', default: EVERY_DAY },
    PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_URL: { type: 'string', default: 'http://risk-service.plt.local/dump' },
    PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_METHOD: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
    PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_MAX_RETRIES: { type: 'integer', default: 3 },

    // Sync (import or export)
    PLT_CRON_ICC_JOB_SYNC_NAME: { type: 'string', default: 'sync' },
    PLT_CRON_ICC_JOB_SYNC_CRON: { type: 'string', default: EVERY_DAY },
    PLT_CRON_ICC_JOB_SYNC_URL: { type: 'string', default: 'http://risk-cold-storage.plt.local/sync' },
    PLT_CRON_ICC_JOB_SYNC_METHOD: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
    PLT_CRON_ICC_JOB_SYNC_MAX_RETRIES: { type: 'integer', default: 3 },

    // FFC_Recommender
    PLT_CRON_ICC_JOB_FFC_RECOMMENDER_NAME: { type: 'string', default: 'ffc-recommender' },
    PLT_CRON_ICC_JOB_FFC_RECOMMENDER_CRON: { type: 'string', default: EVERY_DAY },
    PLT_CRON_ICC_JOB_FFC_RECOMMENDER_URL: { type: 'string', default: 'http://cluster-manager.plt.local/optimize' },
    PLT_CRON_ICC_JOB_FFC_RECOMMENDER_METHOD: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
    PLT_CRON_ICC_JOB_FFC_RECOMMENDER_MAX_RETRIES: { type: 'integer', default: 3 },

    // Traffic Inspector
    PLT_CRON_ICC_JOB_TRAFFIC_INSPECTOR_NAME: { type: 'string', default: 'traffic-inspector' },
    PLT_CRON_ICC_JOB_TRAFFIC_INSPECTOR_CRON: { type: 'string', default: EVERY_DAY },
    PLT_CRON_ICC_JOB_TRAFFIC_INSPECTOR_URL: { type: 'string', default: 'http://traffic-inspector.plt.local/recommendations' },
    PLT_CRON_ICC_JOB_TRAFFIC_INSPECTOR_METHOD: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'POST' },
    PLT_CRON_ICC_JOB_TRAFFIC_INSPECTOR_MAX_RETRIES: { type: 'integer', default: 3 },

    // Scaler
    PLT_CRON_ICC_JOB_SCALER_NAME: { type: 'string', default: 'scaler' },
    PLT_CRON_ICC_JOB_SCALER_CRON: { type: 'string', default: EVERY_12_HOURS },
    PLT_CRON_ICC_JOB_SCALER_URL: { type: 'string', default: 'http://scaler.plt.local/predictions/calculate' },
    PLT_CRON_ICC_JOB_SCALER_METHOD: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'POST' },
    PLT_CRON_ICC_JOB_SCALER_MAX_RETRIES: { type: 'integer', default: 3 }
  }
}

const fastifyEnvOpts = {
  schema,
  confKey: 'env',
  dotenv: true
}

async function envPlugin (fastify) {
  // Dynamically compute PLT_CRON_ICC_JOBS based on features
  await fastify.register(fastifyEnv, fastifyEnvOpts)

  if (fastify.env.PLT_CRON_DISABLE_ICC_JOBS) {
    fastify.log.info('ICC jobs are disabled by PLT_CRON_DISABLE_ICC_JOBS')
    fastify.env.PLT_CRON_ICC_JOBS = ''
    return
  }

  // Build the list of jobs based on features
  const jobs = ['SYNC'] // Always enabled

  if (fastify.env.PLT_FEATURE_SCALER_TRENDS_LEARNING) {
    jobs.push('SCALER')
  }

  if (fastify.env.PLT_FEATURE_CACHE_RECOMMENDATIONS) {
    jobs.push('TRAFFIC_INSPECTOR')
  }

  if (fastify.env.PLT_FEATURE_RISK_SERVICE_DUMP) {
    jobs.push('RISK_SERVICE_DUMP')
  }

  if (fastify.env.PLT_FEATURE_FFC) {
    jobs.push('FFC_RECOMMENDER')
  }

  // Set the computed value
  fastify.env.PLT_CRON_ICC_JOBS = jobs.join(', ')
}

module.exports = fp(envPlugin, { name: 'env' })
