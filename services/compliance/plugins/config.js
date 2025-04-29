'use strict'

const fp = require('fastify-plugin')
const fastifyEnv = require('@fastify/env')

const schema = {
  type: 'object',
  required: [
    'PLT_COMPLIANCE_RULES_DIR'
  ],

  properties: {
    PLT_COMPLIANCE_RULES_DIR: { type: 'string' }
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
