'use strict'

const fp = require('fastify-plugin')
const orama = require('@orama/orama')
const { RedisCacheManager } = require('@platformatic/undici-cache-redis')
const { NextCacheManager } = require('../lib/next-cache-manager')
const errors = require('./errors')

module.exports = fp(async function (app) {
  const connectionString = app.env.PLT_APPLICATIONS_VALKEY_CONNECTION_STRING
  const valkeyUrl = new URL(connectionString)

  const oramaDBs = new Map()

  const redisClientOptions = {
    host: valkeyUrl.hostname,
    port: valkeyUrl.port,
    password: valkeyUrl.password,
    username: valkeyUrl.username
  }
  if (valkeyUrl.protocol === 'rediss:') {
    redisClientOptions.tls = {}
  }

  const nextCacheManager = new NextCacheManager({
    configureKeyspaceEvents: app.env.PLT_CACHE_MANAGER_CONFIGURE_KEYSPACE_EVENT_NOTIFY,
    logger: app.log,
    clientOpts: redisClientOptions
  })

  nextCacheManager.on('add-entry', (entry) => {
    const appOramaDBs = oramaDBs.get(entry.keyPrefix)?.deref()
    if (!appOramaDBs) return

    if (entry.kind === 'FETCH') {
      orama.update(appOramaDBs.client, entry.id, {
        kind: 'NEXT_CACHE_FETCH',
        id: entry.id,
        origin: entry.origin,
        path: entry.path,
        method: entry.method,
        headers: stringifyOramaHeaders(entry.headers),
        statusCode: entry.statusCode,
        cachedAt: entry.cachedAt,
        deleteAt: entry.deleteAt
      })
      return
    }

    if (entry.kind === 'PAGE' || entry.kind === 'APP_PAGE') {
      orama.update(appOramaDBs.server, entry.id, {
        kind: 'NEXT_CACHE_PAGE',
        id: entry.id,
        serviceId: entry.serviceId,
        route: entry.route,
        headers: stringifyOramaHeaders(entry.headers),
        statusCode: entry.statusCode,
        cachedAt: entry.cachedAt,
        deleteAt: entry.deleteAt
      })
    }
  })

  nextCacheManager.on('delete-entry', (entry) => {
    const appOramaDBs = oramaDBs.get(entry.keyPrefix)?.deref()
    if (!appOramaDBs) return
    orama.remove(appOramaDBs.client, entry.id)
    orama.remove(appOramaDBs.server, entry.id)
  })

  nextCacheManager.on('error', (error) => {
    app.log.error('Error in the NextCacheManager', error)
  })

  await nextCacheManager.subscribe()

  const httpCacheManager = new RedisCacheManager({
    clientConfigKeyspaceEventNotify: app.env.PLT_CACHE_MANAGER_CONFIGURE_KEYSPACE_EVENT_NOTIFY,
    clientOpts: redisClientOptions
  })

  httpCacheManager.on('add-entry', (entry) => {
    const appOramaDBs = oramaDBs.get(entry.keyPrefix)?.deref()
    if (!appOramaDBs) return

    orama.insert(appOramaDBs.client, {
      kind: 'HTTP_CACHE',
      id: entry.id,
      origin: entry.origin,
      path: entry.path,
      method: entry.method,
      statusCode: entry.statusCode,
      cachedAt: entry.cachedAt,
      deleteAt: entry.deleteAt,
      headers: stringifyOramaHeaders(entry.headers)
    })
  })

  httpCacheManager.on('delete-entry', (entry) => {
    const appOramaDBs = oramaDBs.get(entry.keyPrefix)?.deref()
    if (!appOramaDBs) return
    orama.remove(appOramaDBs.client, entry.id)
  })

  httpCacheManager.on('error', (error) => {
    app.log.error('Error in the RedisCacheManager', error)
  })

  await httpCacheManager.subscribe()

  app.decorate('getCacheEntries', async (applicationId, { search }) => {
    const keyPrefix = serializeKeyPrefix(applicationId)

    const { client: clientDB, server: serverDB } = await getOramaCache(keyPrefix)
    const clientResults = orama.search(clientDB, { term: search })
    const serverResults = orama.search(serverDB, { term: search })

    const foundClientEntries = []
    const foundServerEntries = []

    for (const oramaHit of clientResults.hits) {
      const { headers, ...entry } = oramaHit.document
      if (headers) {
        entry.headers = parseOramaHeaders(headers)
      }
      foundClientEntries.push(entry)
    }

    for (const oramaHit of serverResults.hits) {
      const { headers, ...entry } = oramaHit.document
      if (headers) {
        entry.headers = parseOramaHeaders(headers)
      }
      foundServerEntries.push(entry)
    }

    return { client: foundClientEntries, server: foundServerEntries }
  })

  app.decorate('getCacheEntryValue', async (applicationId, kind, entryId) => {
    const keyPrefix = serializeKeyPrefix(applicationId)

    let value = null

    if (kind === 'HTTP_CACHE') {
      value = await httpCacheManager.getResponseById(entryId, keyPrefix)
    } else if (
      kind === 'NEXT_CACHE_FETCH' ||
      kind === 'NEXT_CACHE_PAGE'
    ) {
      value = await nextCacheManager.getResponseById(entryId, kind, keyPrefix)
    } else {
      throw errors.InvalidCacheKind(kind)
    }

    if (!value) {
      throw errors.CacheEntryNotFound(entryId)
    }

    return value
  })

  app.decorate('getDependentEntries', async (applicationId, entryId) => {
    const keyPrefix = serializeKeyPrefix(applicationId)
    const dependentEntries = await httpCacheManager.getDependentEntries(entryId, keyPrefix)

    const result = []
    for (const entry of dependentEntries) {
      const { applicationId } = parseKeyPrefix(entry.keyPrefix)

      result.push({
        applicationId,
        id: entry.id,
        kind: 'HTTP_CACHE',
        origin: entry.origin,
        path: entry.path,
        method: entry.method,
        headers: entry.headers,
        cacheTags: entry.cacheTags,
        statusCode: entry.statusCode,
        cachedAt: entry.cachedAt,
        deleteAt: entry.deleteAt
      })
    }

    return result
  })

  app.decorate('invalidateCache', async (applicationId, { httpCacheIds, nextCacheIds }) => {
    const keyPrefix = serializeKeyPrefix(applicationId)
    const promises = []

    if (httpCacheIds.length > 0) {
      promises.push(httpCacheManager.deleteIds(httpCacheIds, keyPrefix))
    }

    if (nextCacheIds.length > 0) {
      promises.push(nextCacheManager.deleteIds(nextCacheIds, keyPrefix))
    }

    await Promise.all(promises)
  })

  function serializeKeyPrefix (applicationId) {
    return `${applicationId}:`
  }

  function parseKeyPrefix (keyPrefix) {
    const [applicationId] = keyPrefix.split(':')
    return { applicationId }
  }

  async function getOramaCache (keyPrefix) {
    let appOramaDBs = oramaDBs.get(keyPrefix)?.deref()
    if (appOramaDBs !== undefined) return appOramaDBs

    const clientOramaDB = orama.create({
      schema: {
        kind: 'string',
        id: 'string',
        origin: 'string',
        path: 'string',
        method: 'string',
        headers: 'string[]',
        statusCode: 'number',
        cachedAt: 'number',
        deleteAt: 'number'
      }
    })

    const serverOramaDB = orama.create({
      schema: {
        kind: 'string',
        id: 'string',
        headers: 'string[]',
        route: 'string',
        serviceId: 'string'
      }
    })

    appOramaDBs = { client: clientOramaDB, server: serverOramaDB }

    // This timeout is to prevent the WeakRef from being garbage collected
    // eslint-disable-next-line no-unused-vars
    let gcableAppOramaDBs = appOramaDBs
    setTimeout(() => { gcableAppOramaDBs = null }, 30000).unref()

    oramaDBs.set(keyPrefix, new WeakRef(appOramaDBs))

    await httpCacheManager.streamEntries(cacheEntry => {
      orama.update(clientOramaDB, cacheEntry.id, {
        kind: 'HTTP_CACHE',
        id: cacheEntry.id,
        origin: cacheEntry.origin,
        path: cacheEntry.path,
        method: cacheEntry.method,
        statusCode: cacheEntry.statusCode,
        cachedAt: cacheEntry.cachedAt,
        deleteAt: cacheEntry.deleteAt,
        headers: stringifyOramaHeaders(cacheEntry.headers)
      })
    }, keyPrefix)

    await nextCacheManager.streamEntries(cacheEntry => {
      if (cacheEntry.kind === 'FETCH') {
        orama.update(clientOramaDB, cacheEntry.id, {
          kind: 'NEXT_CACHE_FETCH',
          id: cacheEntry.id,
          origin: cacheEntry.origin,
          path: cacheEntry.path,
          method: cacheEntry.method,
          headers: stringifyOramaHeaders(cacheEntry.headers),
          statusCode: cacheEntry.statusCode,
          cachedAt: cacheEntry.cachedAt,
          deleteAt: cacheEntry.deleteAt
        })
        return
      }

      if (cacheEntry.kind === 'PAGE' || cacheEntry.kind === 'APP_PAGE') {
        orama.update(serverOramaDB, cacheEntry.id, {
          kind: 'NEXT_CACHE_PAGE',
          id: cacheEntry.id,
          serviceId: cacheEntry.serviceId,
          route: cacheEntry.route,
          headers: stringifyOramaHeaders(cacheEntry.headers),
          statusCode: cacheEntry.statusCode,
          cachedAt: cacheEntry.cachedAt,
          deleteAt: cacheEntry.deleteAt
        })
      }
    }, keyPrefix)

    return { client: clientOramaDB, server: serverOramaDB }
  }

  function stringifyOramaHeaders (headers) {
    const serializedHeaders = []
    for (const [key, value] of Object.entries(headers)) {
      serializedHeaders.push(`${key}:${value}`)
    }
    return serializedHeaders
  }

  function parseOramaHeaders (headers) {
    const parsedHeaders = {}
    for (const header of headers) {
      const [key, value] = header.split(':')
      parsedHeaders[key] = value
    }
    return parsedHeaders
  }

  app.addHook('onClose', async () => {
    await Promise.all([
      httpCacheManager.close(),
      nextCacheManager.close()
    ])
  })
}, {
  dependencies: ['env']
})
