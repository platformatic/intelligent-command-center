'use strict'

const fp = require('fastify-plugin')
const fastifyEnv = require('@fastify/env')

const schema = {
  type: 'object',
  required: [
    'DEV',
    'PLT_MAIN_URL',
    'PLT_MAIN_REFRESH_TIME',
    'PLT_SERVICES_WITH_UPDATE_ROUTE'
  ],

  properties: {
    DEV: { type: 'boolean' },
    DEV_K8S: { type: 'boolean', default: false },
    PLT_MAIN_URL: { type: 'string' },
    PLT_MAIN_REFRESH_TIME: { type: 'number', default: 2000 },
    PLT_SERVICES_WITH_UPDATE_ROUTE: { type: 'string', default: '' }
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
