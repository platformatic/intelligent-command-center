/// <reference path="../global.d.ts" />
'use strict'

const { createHash } = require('node:crypto')
const fp = require('fastify-plugin')
const errors = require('./errors')
const { ValkeyCacheProvider } = require('./valkey-cache')
const { ElastiCacheProvider } = require('./elasticache')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  const cacheProvider = app.env.PLT_CONTROL_PLANE_CACHE_PROVIDER
  const cacheProviderUrl = app.env.PLT_APPLICATIONS_VALKEY_CONNECTION_STRING
  const secretKey = app.env.PLT_APPLICATIONS_VALKEY_SECRET_KEY

  let provider = null

  if (cacheProvider === 'valkey-oss') {
    provider = new ValkeyCacheProvider(cacheProviderUrl)
  }

  if (cacheProvider === 'elasticache') {
    const clusterPrefix = app.env.PLT_CONTROL_PLANE_ELASTICACHE_CLUSTERID_PREFIX
    const opts = {
      region: app.env.PLT_CONTROL_PLANE_ELASTICACHE_REGION,
      credentials: {
        accessKeyId: app.env.PLT_CONTROL_PLANE_ELASTICACHE_ACCESS_KEY,
        secretAccessKey: app.env.PLT_CONTROL_PLANE_ELASTICACHE_SECRET_KEY
      }
    }
    provider = new ElastiCacheProvider(clusterPrefix, opts)
  }

  if (!provider) {
    throw new errors.UnsupportedCacheProvider(cacheProvider)
  }

  await provider.setup()

  const { hostname: host, port } = new URL(cacheProviderUrl)

  app.decorate('createCacheUser', async (applicationId, ctx) => {
    const { username, password, keyPrefix } = getUserCredentials(applicationId)
    await provider.createNewUser(username, password, keyPrefix, ctx)
  })

  app.decorate('getCacheClientOpts', async (applicationId, ctx) => {
    const { username, password, keyPrefix } = getUserCredentials(applicationId)
    return { host, port, username, password, keyPrefix }
  })

  function getUserCredentials (applicationId) {
    const username = generateUsername(applicationId)
    const password = generateUserPassword(applicationId)
    const keyPrefix = `${applicationId}:`
    return { username, password, keyPrefix }
  }

  function generateUsername (applicationId) {
    return `plt-application-${applicationId}`
  }

  function generateUserPassword (applicationId) {
    return createHash('sha256')
      .update(applicationId + secretKey)
      .digest('hex')
  }

  app.addHook('onClose', async () => provider.destructor())
}, {
  name: 'cache',
  dependencies: ['env']
})
