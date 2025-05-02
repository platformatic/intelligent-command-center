'use strict'

const fp = require('fastify-plugin')
const fastifyEnv = require('@fastify/env')

const schema = {
  type: 'object',
  required: [
    'PLT_APPLICATIONS_VALKEY_CONNECTION_STRING',
    'PLT_CONTROL_PLANE_DEFAULT_THREADS',
    'PLT_CONTROL_PLANE_DEFAULT_HEAP',
    'PLT_MACHINIST_URL',
    'PLT_MAIN_SERVICE_URL',
    'PLT_EXTERNAL_CRON_URL',
    'PLT_EXTERNAL_COMPLIANCE_URL',
    'PLT_EXTERNAL_TRAFFICANTE_URL',
    'PLT_EXTERNAL_USER_MANAGER_URL',
    'PLT_EXTERNAL_RISK_MANAGER_URL',
    'PLT_EXTERNAL_RISK_SERVICE_URL',
    'PLT_EXTERNAL_ACTIVITIES_URL',
    'PLT_EXTERNAL_METRICS_URL',
    'PLT_CONTROL_PLANE_SECRET_KEYS',
    'PLT_ICC_SESSION_SECRET'
  ],

  properties: {
    PLT_APPLICATIONS_VALKEY_CONNECTION_STRING: { type: 'string' },
    PLT_CONTROL_PLANE_DEFAULT_THREADS: { type: 'number', default: 1 },
    PLT_CONTROL_PLANE_DEFAULT_HEAP: { type: 'number', default: 1024 },
    PLT_MACHINIST_URL: { type: 'string' },
    PLT_MAIN_SERVICE_URL: { type: 'string' },
    PLT_EXTERNAL_CRON_URL: { type: 'string' },
    PLT_EXTERNAL_TRAFFICANTE_URL: { type: 'string' },
    PLT_EXTERNAL_USER_MANAGER_URL: { type: 'string' },
    PLT_EXTERNAL_RISK_MANAGER_URL: { type: 'string' },
    PLT_EXTERNAL_RISK_SERVICE_URL: { type: 'string' },
    PLT_EXTERNAL_COMPLIANCE_URL: { type: 'string' },
    PLT_EXTERNAL_ACTIVITIES_URL: { type: 'string' },
    PLT_EXTERNAL_METRICS_URL: { type: 'string' },
    PLT_CONTROL_PLANE_CACHE_PROVIDER: { type: 'string', default: 'valkey-oss' },
    PLT_CONTROL_PLANE_ELASTICACHE_REGION: { type: 'string' },
    PLT_CONTROL_PLANE_ELASTICACHE_ACCESS_KEY: { type: 'string' },
    PLT_CONTROL_PLANE_ELASTICACHE_SECRET_KEY: { type: 'string' },
    PLT_CONTROL_PLANE_ELASTICACHE_CLUSTERID_PREFIX: { type: 'string' },
    PLT_CONTROL_PLANE_SECRET_KEYS: { type: 'string' },
    PLT_CONTROL_PLANE_DB_LOCK_MIN_TIMEOUT: { type: 'number', default: 100 },
    PLT_ICC_SESSION_SECRET: { type: 'string' }
  }
}

const fastifyEnvOpts = {
  schema,
  confKey: 'env',
  dotenv: true
}

async function envPlugin (app) {
  await app.register(fastifyEnv, fastifyEnvOpts)
  app.decorate('iccServicesUrls', {
    cron: app.env.PLT_EXTERNAL_CRON_URL,
    trafficante: app.env.PLT_EXTERNAL_TRAFFICANTE_URL,
    userManager: app.env.PLT_EXTERNAL_USER_MANAGER_URL,
    riskManager: app.env.PLT_EXTERNAL_RISK_MANAGER_URL,
    riskService: app.env.PLT_EXTERNAL_RISK_SERVICE_URL,
    compliance: app.env.PLT_EXTERNAL_COMPLIANCE_URL,
    activities: app.env.PLT_EXTERNAL_ACTIVITIES_URL,
    metrics: app.env.PLT_EXTERNAL_METRICS_URL
  })
}

module.exports = fp(envPlugin, { name: 'env' })
