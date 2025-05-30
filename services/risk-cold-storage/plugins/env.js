'use strict'

const fp = require('fastify-plugin')
const fastifyEnv = require('@fastify/env')

const schema = {
  type: 'object',
  required: [],

  properties: {
    PLT_RISK_COLD_STORAGE_EXPORTER: { type: 'boolean' },
    PLT_RISK_COLD_STORAGE_EXPORTER_DROPOFF_TYPE: { type: 'string', enum: ['s3'], default: 's3' },
    PLT_RISK_COLD_STORAGE_HMAC_SECRET_KEY: { type: 'string' },

    // used if dropoff type is 's3':
    PLT_RISK_COLD_STORAGE_AWS_ACCESS_KEY_ID: { type: 'string' },
    PLT_RISK_COLD_STORAGE_AWS_SECRET_ACCESS_KEY: { type: 'string' },
    PLT_RISK_COLD_STORAGE_AWS_REGION: { type: 'string' },
    PLT_RISK_COLD_STORAGE_AWS_BUCKET: { type: 'string' }
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
