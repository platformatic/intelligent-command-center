/// <reference path="../global.d.ts" />
'use strict'

const { randomUUID, createCipheriv } = require('node:crypto')
const fp = require('fastify-plugin')
const errors = require('./errors')
const { ValkeyCacheProvider } = require('./valkey-cache')
const { ElastiCacheProvider } = require('./elasticache')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  const isCacheEnabled = app.env.PLT_FEATURE_CACHE
  const cacheProvider = app.env.PLT_CONTROL_PLANE_CACHE_PROVIDER
  const cacheProviderUrl = app.env.PLT_APPLICATIONS_VALKEY_CONNECTION_STRING

  const CACHE_PASSORDS_SUFFIX = '-plt-passwords'

  let provider = null

  if (isCacheEnabled && cacheProvider) {
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

    app.addHook('onClose', async () => provider.destructor())
  }

  app.decorate('getValkeyClientOpts', async (applicationId, ctx) => {
    if (!provider) return null

    const { hostname: host, port } = new URL(cacheProviderUrl)

    const valkeyUsers = await app.platformatic.entities.valkeyUser.find({
      where: { applicationId: { eq: applicationId } },
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: 1,
      tx: ctx?.tx
    })

    if (valkeyUsers.length === 0) {
      const { username, password, keyPrefix } = await createValkeyUser(
        applicationId,
        ctx
      )
      return { host, port, username, password, keyPrefix }
    }

    const { id, username, encryptedPassword, keyPrefix } = valkeyUsers[0]
    const { password, needReencrypting } = decryptPassword(
      applicationId,
      encryptedPassword
    )

    if (needReencrypting) {
      await app.platformatic.entities.valkeyUser.save({
        input: {
          id,
          encryptedPassword: encryptPassword(applicationId, password)
        },
        tx: ctx?.tx
      })
    }

    return { host, port, username, password, keyPrefix }
  })

  async function createValkeyUser (applicationId, ctx) {
    if (!provider) return

    const username = generateUsername(applicationId)
    const password = generatePassword()
    const keyPrefix = `${applicationId}:`
    const encryptedPassword = encryptPassword(applicationId, password)

    await provider.createNewUser(username, password, keyPrefix, ctx)

    await app.platformatic.entities.valkeyUser.save({
      input: {
        applicationId,
        username,
        keyPrefix,
        encryptedPassword
      },
      tx: ctx?.tx
    })

    return { username, password, keyPrefix }
  }

  function generateUsername (applicationId) {
    return `plt-application-${applicationId}`
  }

  function generatePassword () {
    // Suffix is needed to understand if a password was decrypted correctly
    return randomUUID() + CACHE_PASSORDS_SUFFIX
  }

  function encryptPassword (applicationId, password) {
    const secretKeys = app.env.PLT_CONTROL_PLANE_SECRET_KEYS.split(',')
    const secretKey = secretKeys.at(-1)
    const iv = Buffer.from(applicationId.replace(/-/g, ''), 'hex').subarray(0, 16)
    const key = Buffer.from(secretKey + applicationId, 'utf8').subarray(0, 32)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    return cipher.update(password, 'utf8', 'hex') + cipher.final('hex')
  }

  function decryptPassword (applicationId, encryptedPassword) {
    const secretKeys = app.env.PLT_CONTROL_PLANE_SECRET_KEYS.split(',')
    for (let i = 1; i <= secretKeys.length; i++) {
      const secretKey = secretKeys.at(-i)
      const iv = Buffer.from(applicationId.replace(/-/g, ''), 'hex').subarray(0, 16)
      const key = Buffer.from(secretKey + applicationId, 'utf8').subarray(0, 32)
      const cipher = createCipheriv('aes-256-gcm', key, iv)
      const password = cipher.update(encryptedPassword, 'hex', 'utf8') + cipher.final('utf8')

      if (password.endsWith(CACHE_PASSORDS_SUFFIX)) {
        return { password, needReencrypting: i > 1 }
      }
    }

    throw new errors.FailedToDecryptValkeyPassword(applicationId)
  }
}, {
  name: 'cache',
  dependencies: ['env']
})
