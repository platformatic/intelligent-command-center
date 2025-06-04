'use strict'

const fp = require('fastify-plugin')
const fastifyEnv = require('@fastify/env')
const { EVERY_DAY } = require('../lib/cron-expressions')

const schema = {
  type: 'object',
  required: [],

  properties: {
    // comma separated list of internal schedulers. Emypty string means no schedulers (useful for tests)
    // PLT_CRON_ICC_JOBS: { type: 'string', default: 'RISK_SERVICE_DUMP, SYNC' },
    // We activate ony the risk service dump and sync jobs for the time being.
    PLT_CRON_ICC_JOBS: { type: 'string', default: 'RISK_SERVICE_DUMP, FFC_RECOMMENDER, TRAFFICANTE' },
    // PLT_CRON_ICC_JOBS: { type: 'string', default: 'RISK_SERVICE_DUMP, FFC_RECOMMENDER, TRAFFICANTE, SYNC' }

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
    PLT_CRON_ICC_JOB_FFC_RECOMMENDER_URL_MAX_RETRIES: { type: 'integer', default: 3 },

    // Trafficante
    PLT_CRON_ICC_JOB_TRAFFICANTE_NAME: { type: 'string', default: 'trafficante' },
    PLT_CRON_ICC_JOB_TRAFFICANTE_CRON: { type: 'string', default: EVERY_DAY },
    PLT_CRON_ICC_JOB_TRAFFICANTE_URL: { type: 'string', default: 'http://trafficante.plt.local/recommendations' },
    PLT_CRON_ICC_JOB_TRAFFICANTE_METHOD: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'POST' },
    PLT_CRON_ICC_JOB_TRAFFICANTE_MAX_RETRIES: { type: 'integer', default: 3 }
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
