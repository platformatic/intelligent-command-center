/// <reference path="../global.d.ts" />

'use strict'

const {
  ElastiCacheClient,
  CreateUserCommand,
  DeleteUserCommand,
  DescribeCacheClustersCommand
} = require('@aws-sdk/client-elasticache')

const errors = require('./errors')

class ElastiCacheProvider {
  #clusterPrefix
  #clusterDetails
  #ecClient

  constructor (clusterPrefix, opts) {
    this.#clusterPrefix = clusterPrefix
    this.#ecClient = new ElastiCacheClient(opts)
  }

  destructor () {
    // nothing to do
  }

  async setup () {
    const cmd = new DescribeCacheClustersCommand()
    const response = await this.#ecClient.send(cmd)
    this.#clusterDetails = response.CacheClusters
      .find(cluster => cluster.CacheClusterId.startsWith(this.#clusterPrefix))
  }

  async createNewUser (username, password, keyPrefix, ctx) {
    if (!this.#clusterDetails) throw new errors.CacheProviderNotSetup()

    ctx.logger.info({ username }, 'Creating ElastiCache http cache user')

    const cmd = new CreateUserCommand({
      UserId: username,
      UserName: username,
      Engine: this.#clusterDetails.Engine,
      Passwords: [password],
      AccessString: [
        `~${keyPrefix}*`, // Restrict key access to keys with the "keyPrefix" prefix
        '+@all', // Grant all command permissions
        '+psubscribe', // Allow pattern-based subscriptions
        '+subscribe', // Allow standard subscriptions
        '&__redis__:invalidate' // Grant subscription access to the __redis__:invalidate channel
      ].join(' ')
    })
    const response = await this.#ecClient.send(cmd)

    if (response.statusCode > 299) {
      ctx.logger.error({ response }, 'Failed to create ElastiCache user')
      throw new errors.FailedToCreateElastiCacheUser(response.statusCode)
    }
  }

  async removeUser (username, ctx) {
    if (!this.#clusterDetails) throw new errors.CacheProviderNotSetup()

    ctx.logger.info({ username }, 'Removing ElastiCache http cache user')

    const cmd = new DeleteUserCommand({ UserId: username })
    await this.#ecClient.send(cmd)
  }
}

module.exports = { ElastiCacheProvider }
