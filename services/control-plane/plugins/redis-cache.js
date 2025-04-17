/// <reference path="../global.d.ts" />

'use strict'

const { randomUUID } = require('node:crypto')
const Redis = require('iovalkey')
const fp = require('fastify-plugin')
const errors = require('./errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  const connectionString = app.env.PLT_CONTROL_PLANE_REDIS_CACHE_CONNECTION_STRING
  const redis = new Redis(connectionString, {
    retryStrategy (times) {
      return Math.min(times * 50, 2000)
    }
  })
  app.addHook('onClose', async () => redis.quit())

  app.decorate('getRedisCacheClientOpts', async (applicationId, imageId, ctx) => {
    // Create a new user for each new application image
    const username = generateRedisUsername(applicationId, imageId)
    const keyPrefix = `${applicationId}:${imageId}:`

    // Create a new password for each application instance. Valkey allows to generate
    // multiple passwords for the same user
    const password = randomUUID()

    ctx.logger.info({ username }, 'Creating Redis http cache user')

    // User should only be able to access keys with the key prefix
    // And should be able to subscribe to the __redis__:invalidate channel
    const result = await redis.send_command('ACL', [
      'SETUSER', username,
      'on', `>${password}`,
      `~${keyPrefix}*`, // Restrict key access to keys with the "keyPrefix" prefix
      '+@all', // Grant all command permissions
      '+psubscribe', // Allow pattern-based subscriptions
      '+subscribe', // Allow standard subscriptions
      '&__redis__:invalidate' // Grant subscription access to the __redis__:invalidate channel
    ])

    if (result !== 'OK') {
      throw new errors.FailedToCreateRedisUser(result)
    }

    const url = new URL(app.env.PLT_CONTROL_PLANE_REDIS_CACHE_CONNECTION_STRING)

    return {
      host: url.hostname,
      port: url.port,
      username,
      password,
      keyPrefix
    }
  })

  app.decorate('removeRedisUser', async (
    applicationId,
    imageId,
    ctx
  ) => {
    const username = generateRedisUsername(applicationId, imageId)
    ctx.logger.info({ username }, 'Removing Redis http cache user')
    await redis.send_command('ACL', ['DELUSER', username])
  })

  function generateRedisUsername (applicationId, imageId) {
    return `application-${applicationId}-image-${imageId}`
  }
})
