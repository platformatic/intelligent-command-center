/// <reference path="../global.d.ts" />

'use strict'

const Valkey = require('iovalkey')
const errors = require('./errors')

class ValkeyCacheProvider {
  #url
  #valkey

  constructor (url) {
    this.#url = url
  }

  destructor () {
    if (this.#valkey) this.#valkey.quit()
  }

  async setup () {
    this.#valkey = new Valkey(this.#url, {
      retryStrategy (times) {
        return Math.min(times * 50, 2000)
      }
    })
  }

  async createNewUser (username, password, keyPrefix, ctx) {
    ctx.logger.info({ username }, 'Creating http cache user')

    // User should only be able to access keys with the key prefix
    // And should be able to subscribe to the __redis__:invalidate channel
    const result = await this.#valkey.send_command('ACL', [
      'SETUSER', username,
      'on', `>${password}`,
      `~${keyPrefix}*`, // Restrict key access to keys with the "keyPrefix" prefix
      '+@all', // Grant all command permissions
      '+psubscribe', // Allow pattern-based subscriptions
      '+subscribe', // Allow standard subscriptions
      '&__redis__:invalidate' // Grant subscription access to the __redis__:invalidate channel
    ])

    if (result !== 'OK') {
      throw new errors.FailedToCreateValkeyUser(result)
    }
  }

  async removeUser (username, ctx) {
    ctx.logger.info({ username }, 'Removing http cache user')
    await this.#valkey.send_command('ACL', ['DELUSER', username])
  }
}

module.exports = { ValkeyCacheProvider }
