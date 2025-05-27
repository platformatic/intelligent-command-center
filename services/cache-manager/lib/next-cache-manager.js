'use strict'

const EventEmitter = require('node:events')
const { setTimeout: sleep } = require('node:timers/promises')
const { Redis } = require('iovalkey')
const { unpack } = require('msgpackr')
const errors = require('../plugins/errors')

class NextCacheManager extends EventEmitter {
  #redisClientOpts
  #redisConfigureKeyspaceEvents
  #redis
  #logger
  #abortController

  #subscribed
  #redisSubscribe

  #cacheHandler

  #closed

  constructor (opts) {
    super()

    if (opts) {
      if (typeof opts !== 'object') {
        throw new TypeError('expected opts to be an object')
      }

      this.#redisClientOpts = opts.clientOpts ?? {}
      this.#redisConfigureKeyspaceEvents = opts.configureKeyspaceEvents
    }

    this.#logger = opts.logger

    this.#redis = new Redis({
      enableAutoPipelining: true,
      ...this.#redisClientOpts
    })

    this.#abortController = new AbortController()

    this.#subscribed = false
    this.#redisSubscribe = null

    this.#closed = false
  }

  async streamEntries (callback, keyPrefix) {
    const pattern = `${keyPrefix}:cache:next:*:values:*`

    await this.#scanByPattern(pattern, async (keys) => {
      const promises = new Array(keys.length)

      for (let i = 0; i < keys.length; i++) {
        const nextCacheKey = keys[i]
        const promise = this.#redis.get(nextCacheKey)
          .then((entry) => {
            if (!entry) return
            callback(this.#convertToCacheEntry(nextCacheKey, entry))
          })

        promises[i] = promise
      }

      await Promise.all(promises)
    })
  }

  async subscribe () {
    if (this.#subscribed) return
    this.#subscribed = true

    try {
      if (this.#redisConfigureKeyspaceEvents) {
        await this.#redis.send_command('CONFIG', [
          'SET', 'notify-keyspace-events', 'AKE'
        ])
      }

      this.#redisSubscribe = new Redis(this.#redisClientOpts)

      await this.#redisSubscribe.subscribe(
        '__keyevent@0__:set',
        '__keyevent@0__:del',
        '__keyevent@0__:expired'
      )
    } catch (err) {
      this.subscribed = false
      if (this.#redisSubscribe) {
        await this.#redisSubscribe.quit()
      }

      throw err
    }

    this.#redisSubscribe.on('message', async (channel, key) => {
      try {
        const regexp = /:cache:next:(.*):values:(.*)/
        if (!regexp.test(key)) return

        const keyPrefix = key.split(':cache:next:', 2)[0]
        const id = this.#generateEntryId(key)

        // A new cache entry was added
        if (channel === '__keyevent@0__:set') {
          const entry = await this.#redis.get(key)
          if (!entry) return

          const cacheEntry = this.#convertToCacheEntry(key, entry)
          this.emit('add-entry', { ...cacheEntry, keyPrefix })
          return
        }

        // A cache entry was deleted
        if (
          channel === '__keyevent@0__:del' ||
          channel === '__keyevent@0__:expired'
        ) {
          this.emit('delete-entry', { id, keyPrefix })
        }
      } catch (err) {
        this.emit('error', err)
      }
    })
  }

  async getResponseById (id, kind, keyPrefix) {
    const key = this.#deserializeNextCacheKey(id, keyPrefix)

    let value = await this.#redis.get(key)
    if (!value) {
      throw errors.CacheEntryNotFound(id)
    }

    if (kind === 'NEXT_CACHE_FETCH') {
      value = this.#deserializeNextCacheValue(value)
      return this.#parseNextCacheResponse(value.value.data.body)
    }

    if (kind === 'NEXT_CACHE_PAGE') {
      value = this.#deserializeNextCacheValue(value)
      return value.value.html
    }

    throw errors.InvalidCacheKind(kind)
  }

  async deleteIds (ids, keyPrefix) {
    const cacheHandler = await this.#getCacheHandler()

    const promises = []
    for (let key of ids) {
      key = this.#deserializeNextCacheKey(key, keyPrefix)
      promises.push(cacheHandler.remove(key, true))
    }

    await Promise.all(promises)
  }

  async close () {
    if (this.#closed) return
    this.#closed = true
    this.#abortController.abort()

    // Wait for scan operations abortions
    await sleep(100)

    const promises = [this.#redis.quit()]
    if (this.#subscribed) {
      promises.push(this.#redisSubscribe.quit())
    }
    await Promise.all(promises)
  }

  async #getCacheHandler () {
    if (!this.#cacheHandler) {
      const { cachingValkey } = await import('@platformatic/next')

      this.#cacheHandler = new cachingValkey.CacheHandler({
        standalone: true,
        logger: this.#logger,
        store: this.#redis
      })
    }
    return this.#cacheHandler
  }

  #scanByPattern (pattern, callback) {
    const stream = this.#redis.scanStream({ match: pattern })
    const promises = []

    const abortListener = () => { stream.close() }
    this.#abortController.signal.addEventListener('abort', abortListener)

    return new Promise((resolve, reject) => {
      stream.on('data', (keys) => promises.push(callback(keys)))
      stream.on('end', () => Promise.all(promises).then(() => resolve(), reject))

      stream.on('error', reject)
      stream.on('close', () => {
        this.#abortController.signal.removeEventListener('abort', abortListener)
      })
    })
  }

  #convertToCacheEntry (key, entry) {
    const parsedEntry = this.#deserializeNextCacheValue(entry)
    const kind = parsedEntry.value.kind

    if (kind === 'FETCH') {
      return this.#convertFetchToCacheEntry({ key, entry: parsedEntry })
    }

    if (kind === 'PAGE' || kind === 'APP_PAGE') {
      return this.#convertPageToCacheEntry({ key, entry: parsedEntry })
    }

    throw errors.InvalidCacheKind(kind)
  }

  #convertFetchToCacheEntry (fetchEntry) {
    const { key, entry } = fetchEntry
    const { value, lastModified, revalidate } = entry
    const { kind, data } = value

    const url = new URL(data.url)
    return {
      kind,
      id: this.#generateEntryId(key),
      origin: url.origin,
      path: url.pathname + url.search + url.hash,
      method: 'GET',
      headers: data.headers,
      statusCode: data.status,
      cachedAt: lastModified,
      deleteAt: lastModified + revalidate * 1000
    }
  }

  #convertPageToCacheEntry (pageEntry) {
    const { key, entry } = pageEntry
    const { value, serviceId, lastModified, revalidate } = entry
    const { kind } = value

    const encodedRoute = key.split(':').at(-1)
    const route = Buffer.from(encodedRoute, 'base64url').toString()

    return {
      kind,
      id: this.#generateEntryId(key),
      serviceId,
      route,
      headers: value.headers,
      statusCode: 200,
      cachedAt: lastModified,
      deleteAt: lastModified + revalidate * 1000
    }
  }

  #deserializeNextCacheValue (data) {
    return unpack(Buffer.from(data, 'base64url'))
  }

  #deserializeNextCacheKey (data, keyPrefix) {
    const key = Buffer.from(data, 'base64url').toString()
    return `${keyPrefix}:cache:next:${key}`
  }

  #parseNextCacheResponse (body) {
    return Buffer.from(body, 'base64').toString()
  }

  #generateEntryId (key) {
    key = key.split(':cache:next:', 2).at(-1)
    return Buffer.from(key).toString('base64url')
  }
}

module.exports = { NextCacheManager }
