'use strict'

const fp = require('fastify-plugin')
const fastifyRedis = require('@fastify/redis')
const { getDBKey, parseDBKey } = require('../lib/db')

const {
  DB_NAMESPACE,
  TRACES_NAMESPACE,
  PATHS_NAMESPACE,
  LATENCIES_NAMESPACE,
  HTTP_CACHE_NAMESPACE,
  DB_TRACE_NAMESPACE
} = require('../lib/store-namespaces')

const plugin = async (fastify) => {
  const connectionOptions = { url: fastify.env.PLT_ICC_VALKEY_CONNECTION_STRING }
  const traceIdExpire = fastify.env.PLT_RISK_SERVICE_TRACE_ID_EXPIRE
  const cacheExpire = fastify.env.PLT_RISK_SERVICE_HTTP_CACHE_EXPIRE
  await fastify.register(fastifyRedis, { ...connectionOptions, enableAutoPipelining: true })
  const redis = fastify.redis

  const getTraceIdKey = (traceId) => `${TRACES_NAMESPACE}${traceId}`
  const getDBTraceKey = (traceId) => `${DB_TRACE_NAMESPACE}${traceId}`

  const getPathKey = (path) => {
    return `${PATHS_NAMESPACE}${path}`
  }

  const storeSpan = async (traceId, span) => {
    const traceIdKey = getTraceIdKey(traceId)
    // We set an expiration after last span, so that we don't have to worry about cleaning up the traces store
    const result = await Promise.all([
      redis.rpush(traceIdKey, JSON.stringify(span)),
      redis.expire(traceIdKey, traceIdExpire),
      redis.lrange(traceIdKey, 0, -1)
    ])
    const traces = result[2]
    return traces.map(JSON.parse)
  }

  const loadTrace = async (traceId) => {
    const traceIdKey = getTraceIdKey(traceId)
    const traces = await redis.lrange(traceIdKey, 0, -1)
    return traces.map(JSON.parse)
  }

  const deleteTrace = async (traceId) => {
    const traceIdKey = getTraceIdKey(traceId)
    await redis.del(traceIdKey)
  }

  const incrPath = async (path) => {
    const pathKey = getPathKey(path)
    return redis.incr(pathKey)
  }

  // This is supposed to be used only in tests
  const storePathCounter = async (path, counter) => {
    return redis.set(getPathKey(path), counter)
  }

  const getPath = async (path) => {
    const pathKey = getPathKey(path)
    return await redis.get(pathKey)
  }

  const scanAllPaths = async () => {
    let cursor = '0'
    const keys = []
    const prefix = PATHS_NAMESPACE
    const pattern = `${prefix}*`

    do {
      const scannedKeys = await redis.scan(cursor, 'MATCH', pattern)
      cursor = scannedKeys[0]
      keys.push(...(scannedKeys[1].map(key => key.substring(prefix.length))))
    } while (cursor !== '0')
    return keys
  }

  const getDump = async () => {
    let cursor = '0'
    const keys = []
    const pattern = `*${PATHS_NAMESPACE}*`
    do {
      const scannedKeys = await redis.scan(cursor, 'MATCH', pattern)
      cursor = scannedKeys[0]
      keys.push(...scannedKeys[1])
    } while (cursor !== '0')

    if (keys.length === 0) {
      return {}
    }
    const values = await redis.mget(keys)
    const result = {}
    for (const key of keys) {
      const counter = values[keys.indexOf(key)]
      result[key] = +counter
    }
    return result
  }

  const deleteKeys = async (keys) => {
    return redis.del(keys)
  }

  const parsePath = (p, counter) => {
    const path = p.substring(PATHS_NAMESPACE.length)
    return { path, counter }
  }

  // parse the dump to an array of [{path, counter}] so can be saved on postgres
  const parseDump = (dump) => {
    const paths = Object.keys(dump)
    const ret = []
    for (const p of paths) {
      const counter = dump[p]
      ret.push(parsePath(p, counter))
    }
    return ret
  }

  // DB operations store functions ***************

  // Stores the span by traceId. We save them here until the trace is done
  // then we process them.
  const storeDBSpan = async (traceId, span) => {
    const traceIdKey = getDBTraceKey(traceId)
    // We set an expiration after last span, so that we don't have to worry about cleaning up the traces store
    const result = await Promise.all([
      redis.rpush(traceIdKey, JSON.stringify(span)),
      redis.expire(traceIdKey, traceIdExpire),
      redis.lrange(traceIdKey, 0, -1)
    ])
    const traces = result[2]
    return traces.map(JSON.parse)
  }

  const loadDBSpans = async (traceId) => {
    const traceIdKey = getDBTraceKey(traceId)
    const traces = await redis.lrange(traceIdKey, 0, -1)
    return traces.map(JSON.parse)
  }

  const getDBOperation = (op, paths) => {
    const { tables, columns, queryType, targetTable, dbSystem = 'unknown' } = op
    columns.sort()
    tables.sort()
    paths.sort()
    if (targetTable) {
      return `${tables.join(';')}:${columns.join(';')}:${queryType}:${dbSystem}:${targetTable}||${paths.join(';')}`
    } else {
      return `${tables.join(';')}:${columns.join(';')}:${queryType}:${dbSystem}||${paths.join(';')}`
    }
  }

  const parseDBOperation = (str) => {
    const [tablesColumns, paths] = str.split('||')
    const [tables, columns, queryType, dbSystem, targetTable = null] = tablesColumns.split(':')
    return { tables: tables.split(';'), columns: columns.split(';'), queryType, dbSystem, targetTable, paths: paths.split(';') }
  }

  const storeDBOperations = async (dbops, paths = []) => {
    for (const dbop of dbops) {
      const key = getDBKey(dbop)
      const value = getDBOperation(dbop, paths)
      await redis.sadd(key, value)
    }
  }

  // Result in the shape: [ id,  ops: [{host, port, tables, columns, queryType, targetTable, paths}] ]
  const getDBOperationsDump = async () => {
    let cursor = '0'
    const keys = []
    const pattern = `*${DB_NAMESPACE}*`
    do {
      const scannedKeys = await redis.scan(cursor, 'MATCH', pattern)
      cursor = scannedKeys[0]
      keys.push(...scannedKeys[1])
    } while (cursor !== '0')

    if (keys.length === 0) {
      return []
    }
    // We will have key for each DB
    const result = await Promise.all(
      keys.map(async (id) => {
        const { host, port, dbName } = parseDBKey(id)
        const _ops = (await redis.smembers(id)).map(parseDBOperation)
        const ops = []
        for (const op of _ops) {
          ops.push({ host, port, dbName, ...op })
        }
        return { id, ops }
      })
    )

    return result
  }

  const getLatencyKey = (from, to) => {
    return `${LATENCIES_NAMESPACE}${from}:${to}`
  }

  const parseLatencyKey = (str) => {
    const rest = str.substring(LATENCIES_NAMESPACE.length)
    const [from, to] = rest.split(':')
    const ret = { from, to }
    return ret
  }

  const storeLatencies = (latencies) => {
    return Promise.all(Object.entries(latencies).map(([key, times]) => {
      const [from, to] = key.split('||')
      const tKey = getLatencyKey(from, to)
      return redis.sadd(tKey, times)
    }))
  }

  const scanAllLatencies = async () => {
    let cursor = '0'
    const keys = []
    const prefix = LATENCIES_NAMESPACE
    const pattern = `${prefix}*`

    do {
      const scannedKeys = await redis.scan(cursor, 'MATCH', pattern)
      cursor = scannedKeys[0]
      keys.push(...(scannedKeys[1].map(key => key.substring(prefix.length))))
    } while (cursor !== '0')

    const times = await Promise.all(keys.map(key => {
      const [from, to] = key.split(':')
      return redis.smembers(getLatencyKey(from, to))
    }))

    const res = {}
    for (const [index, key] of keys.entries()) {
      res[key] = times[index] || []
    }
    return res
  }

  const getLatenciesDump = async () => {
    let cursor = '0'
    const keys = []
    const pattern = `*${LATENCIES_NAMESPACE}*`
    do {
      const scannedKeys = await redis.scan(cursor, 'MATCH', pattern)
      cursor = scannedKeys[0]
      keys.push(...scannedKeys[1])
    } while (cursor !== '0')

    if (keys.length === 0) {
      return []
    }

    const values = await Promise.all(keys.map(key => redis.smembers(key)))

    const result = []
    for (const [index, id] of keys.entries()) {
      const { from = '', to } = parseLatencyKey(id)
      const times = values[index]
      const mean = (times.reduce((acc, t) => acc + +t, 0) / times.length) || 0
      const count = times.length
      result.push({ id, from, to, mean, count })
    }

    return result
  }

  const getAllLatencyValues = async () => {
    let cursor = '0'
    const keys = []
    const prefix = LATENCIES_NAMESPACE
    const pattern = `${prefix}*`
    do {
      const scannedKeys = await redis.scan(cursor, 'MATCH', pattern)
      cursor = scannedKeys[0]
      keys.push(...scannedKeys[1])
    } while (cursor !== '0')

    if (keys.length === 0) {
      return []
    }

    const values = await Promise.all(keys.map(key => redis.smembers(key)))

    const result = []

    for (const [index, key] of keys.entries()) {
      const times = values[index]
      const { from, to } = parseLatencyKey(key)
      const mean = (times.reduce((acc, t) => acc + +t, 0) / times.length) || 0
      const count = times.length
      result.push({ from, to, mean, count })
    }
    return result
  }

  const storeCachePaths = async (paths) => {
    const prefix = HTTP_CACHE_NAMESPACE
    const cacheIds = []

    for (const path of paths) {
      for (const cacheOperation of path) {
        const { httpCacheId } = parseCacheOperation(cacheOperation)
        if (httpCacheId) cacheIds.push(httpCacheId)
      }
    }

    const sortedPaths = paths.sort()
    const pathsKey = sortedPaths.map((path) => path.join(';')).join(',')

    const promises = []
    for (const cacheId of cacheIds) {
      const httpCacheKey = `${prefix}${cacheId}`
      promises.push(redis.sadd(httpCacheKey, pathsKey))
      promises.push(redis.expire(httpCacheKey, cacheExpire))
    }
    await Promise.all(promises)
  }

  const getCachePathsByCacheId = async (cacheId) => {
    const prefix = HTTP_CACHE_NAMESPACE

    const serializedPaths = await redis.smembers(prefix + cacheId)
    const parsedPaths = []

    for (const serializedTracePaths of serializedPaths) {
      const parsedTracePaths = []
      for (const serializedPath of serializedTracePaths.split(',')) {
        const operations = serializedPath.split(';')
        const parsedOperations = []
        for (const operation of operations) {
          parsedOperations.push(parseCacheOperation(operation))
        }
        parsedTracePaths.push(parsedOperations)
      }
      parsedPaths.push(parsedTracePaths)
    }

    return parsedPaths
  }

  const parseCacheOperation = (operation) => {
    const httpCachePrefix = 'http.cache.id:'
    const cacheIdStartIndex = operation.indexOf(httpCachePrefix)
    if (cacheIdStartIndex === -1) {
      return { operation, httpCacheId: null }
    }

    const httpCacheId = operation.substring(
      cacheIdStartIndex + httpCachePrefix.length,
      operation.length
    )

    operation = operation.substring(0, cacheIdStartIndex - 1)
    return { operation, httpCacheId }
  }

  fastify.decorate('store', {
    storeSpan,
    loadTrace,
    deleteTrace,
    incrPath,
    getPath,
    scanAllPaths,
    storePathCounter,
    getDump,
    deleteKeys,
    parseDump,
    parsePath,
    flushAll: async () => redis.flushall(),
    PATHS_NAMESPACE,
    storeDBSpan,
    loadDBSpans,
    storeDBOperations,
    getDBOperationsDump,
    storeLatencies,
    storeCachePaths,
    scanAllLatencies,
    getLatenciesDump,
    getAllLatencyValues,
    getCachePathsByCacheId
  })
}

module.exports = fp(plugin, {
  name: 'store'
})
