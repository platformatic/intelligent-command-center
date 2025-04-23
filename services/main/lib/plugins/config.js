'use strict'

const fp = require('fastify-plugin')
const fastifyEnv = require('@fastify/env')

const schema = {
  type: 'object',
  required: [
    'DEV',
    'PLT_MAIN_URL',
    'PLT_MAIN_REDIS_HOST',
    'PLT_MAIN_REDIS_PORT',
    'PLT_MAIN_REDIS_DB'
  ],

  properties: {
    DEV: { type: 'boolean' },
    DEV_K8S: { type: 'boolean', default: false },
    PLT_MAIN_URL: { type: 'string' },
    PLT_MAIN_REDIS_HOST: { type: 'string' },
    PLT_MAIN_REDIS_PORT: { type: 'number' },
    PLT_MAIN_REDIS_DB: { type: 'number' },
    PLT_DISABLE_K8S_AUTH: { type: 'boolean', default: false },
    K8S_TOKEN_PATH: { type: 'string', default: '/var/run/secrets/kubernetes.io/serviceaccount/token' },
    K8S_CA_CERT_PATH: { type: 'string', default: '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt' },
    PLT_DISABLE_K8S_AUTH: { type: 'boolean', default: false } // This is for testing purposes only
  }
}

const fastifyEnvOpts = {
  schema,
  confKey: 'config',
  dotenv: true
}

async function envPlugin (fastify) {
  fastify.register(fastifyEnv, fastifyEnvOpts)
}

module.exports = fp(envPlugin, { name: 'config' })
