'use strict'

const { test } = require('node:test')
const assert = require('node:assert')

const { buildServer } = require('../helper')

test('Setup the default scheduler env information', async (t) => {
  const server = await buildServer(t, {
    PLT_FEATURE_RISK_SERVICE_DUMP: true
  })

  const expected = {
    PLT_FEATURE_RISK_SERVICE_DUMP: true,
    PLT_FEATURE_CACHE_RECOMMENDATIONS: false,
    PLT_FEATURE_FFC: false,
    PLT_CRON_DISABLE_ICC_JOBS: false,
    PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_NAME: 'risk-service-dump',
    PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_CRON: '0 0 * * *',
    PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_URL: 'http://risk-service.plt.local/dump',
    PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_METHOD: 'GET',
    PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_MAX_RETRIES: 3,
    PLT_CRON_ICC_JOB_SYNC_NAME: 'sync',
    PLT_CRON_ICC_JOB_SYNC_CRON: '0 0 * * *',
    PLT_CRON_ICC_JOB_SYNC_URL: 'http://risk-cold-storage.plt.local/sync',
    PLT_CRON_ICC_JOB_SYNC_METHOD: 'GET',
    PLT_CRON_ICC_JOB_SYNC_MAX_RETRIES: 3,
    PLT_CRON_ICC_JOB_FFC_RECOMMENDER_NAME: 'ffc-recommender',
    PLT_CRON_ICC_JOB_FFC_RECOMMENDER_CRON: '0 0 * * *',
    PLT_CRON_ICC_JOB_FFC_RECOMMENDER_URL: 'http://cluster-manager.plt.local/optimize',
    PLT_CRON_ICC_JOB_FFC_RECOMMENDER_METHOD: 'GET',
    PLT_CRON_ICC_JOB_FFC_RECOMMENDER_MAX_RETRIES: 3,
    PLT_CRON_ICC_JOB_TRAFFICANTE_NAME: 'trafficante',
    PLT_CRON_ICC_JOB_TRAFFICANTE_CRON: '0 0 * * *',
    PLT_CRON_ICC_JOB_TRAFFICANTE_URL: 'http://trafficante.plt.local/recommendations',
    PLT_CRON_ICC_JOB_TRAFFICANTE_METHOD: 'POST',
    PLT_CRON_ICC_JOB_TRAFFICANTE_MAX_RETRIES: 3,
    PLT_CRON_ICC_JOB_SCALER_NAME: 'scaler',
    PLT_CRON_ICC_JOB_SCALER_CRON: '0 */12 * * *',
    PLT_CRON_ICC_JOB_SCALER_URL: 'http://scaler.plt.local/predictions/calculate',
    PLT_CRON_ICC_JOB_SCALER_METHOD: 'POST',
    PLT_CRON_ICC_JOB_SCALER_MAX_RETRIES: 3,
    PLT_CRON_ICC_JOBS: 'SCALER, SYNC, RISK_SERVICE_DUMP'
  }
  assert.deepEqual(server.env, expected)
})

test('Overrides scheduler configuration', async (t) => {
  const overrides = {
    PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_NAME: 'risk-service-dump-override',
    PLT_FEATURE_RISK_SERVICE_DUMP: true
  }
  const server = await buildServer(t, overrides)

  const expected = {
    PLT_FEATURE_RISK_SERVICE_DUMP: true,
    PLT_FEATURE_CACHE_RECOMMENDATIONS: false,
    PLT_FEATURE_FFC: false,
    PLT_CRON_DISABLE_ICC_JOBS: false,
    PLT_CRON_ICC_JOBS: 'SCALER, SYNC, RISK_SERVICE_DUMP',
    PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_NAME: 'risk-service-dump-override',
    PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_CRON: '0 0 * * *',
    PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_URL: 'http://risk-service.plt.local/dump',
    PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_METHOD: 'GET',
    PLT_CRON_ICC_JOB_RISK_SERVICE_DUMP_MAX_RETRIES: 3,
    PLT_CRON_ICC_JOB_SYNC_NAME: 'sync',
    PLT_CRON_ICC_JOB_SYNC_CRON: '0 0 * * *',
    PLT_CRON_ICC_JOB_SYNC_URL: 'http://risk-cold-storage.plt.local/sync',
    PLT_CRON_ICC_JOB_SYNC_METHOD: 'GET',
    PLT_CRON_ICC_JOB_SYNC_MAX_RETRIES: 3,
    PLT_CRON_ICC_JOB_FFC_RECOMMENDER_CRON: '0 0 * * *',
    PLT_CRON_ICC_JOB_FFC_RECOMMENDER_METHOD: 'GET',
    PLT_CRON_ICC_JOB_FFC_RECOMMENDER_NAME: 'ffc-recommender',
    PLT_CRON_ICC_JOB_FFC_RECOMMENDER_URL: 'http://cluster-manager.plt.local/optimize',
    PLT_CRON_ICC_JOB_FFC_RECOMMENDER_MAX_RETRIES: 3,
    PLT_CRON_ICC_JOB_TRAFFICANTE_NAME: 'trafficante',
    PLT_CRON_ICC_JOB_TRAFFICANTE_CRON: '0 0 * * *',
    PLT_CRON_ICC_JOB_TRAFFICANTE_URL: 'http://trafficante.plt.local/recommendations',
    PLT_CRON_ICC_JOB_TRAFFICANTE_METHOD: 'POST',
    PLT_CRON_ICC_JOB_TRAFFICANTE_MAX_RETRIES: 3,
    PLT_CRON_ICC_JOB_SCALER_NAME: 'scaler',
    PLT_CRON_ICC_JOB_SCALER_CRON: '0 */12 * * *',
    PLT_CRON_ICC_JOB_SCALER_URL: 'http://scaler.plt.local/predictions/calculate',
    PLT_CRON_ICC_JOB_SCALER_METHOD: 'POST',
    PLT_CRON_ICC_JOB_SCALER_MAX_RETRIES: 3
  }
  assert.deepEqual(server.env, expected)
})

test('All features enabled', async (t) => {
  const server = await buildServer(t, {
    PLT_FEATURE_RISK_SERVICE_DUMP: true,
    PLT_FEATURE_CACHE_RECOMMENDATIONS: true,
    PLT_FEATURE_FFC: true
  })

  assert.strictEqual(server.env.PLT_CRON_ICC_JOBS, 'SCALER, SYNC, TRAFFICANTE, RISK_SERVICE_DUMP, FFC_RECOMMENDER')
})

test('No features enabled', async (t) => {
  const server = await buildServer(t, {
    PLT_FEATURE_RISK_SERVICE_DUMP: false,
    PLT_FEATURE_CACHE_RECOMMENDATIONS: false,
    PLT_FEATURE_FFC: false
  })

  assert.strictEqual(server.env.PLT_CRON_ICC_JOBS, 'SCALER, SYNC')
})
