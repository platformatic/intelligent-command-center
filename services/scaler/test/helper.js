'use strict'

const { beforeEach, afterEach } = require('node:test')
const { join } = require('node:path')
const { setGlobalDispatcher, Agent } = require('undici')
const { buildServer: buildDbServer } = require('@platformatic/db')
const fastify = require('fastify')
const fp = require('fastify-plugin')
const createConnectionPool = require('@databases/pg')
const Redis = require('iovalkey')
const { scanKeys } = require('../../../lib/redis-utils')

const connectionString = 'postgres://postgres:postgres@127.0.0.1:5433/scaler'
const valkeyConnectionString = 'redis://localhost:6343'

setGlobalDispatcher(new Agent({
  keepAliveTimeout: 10,
  keepAliveMaxTimeout: 10
}))

async function getConfig () {
  const config = {}
  config.server = {
    port: 5555,
    logger: { level: 'silent' }
  }
  config.db = {
    connectionString,
    openapi: {
      ignoreRoutes: [
        {
          method: 'POST',
          path: '/controllers'
        },
        {
          method: 'POST',
          path: '/alerts'
        },
        {
          method: 'POST',
          path: '/flamegraphs'
        },
        {
          method: 'POST',
          path: '/signals'
        }
      ]
    },
    limit: {
      default: 100,
      max: 100000
    }
  }

  config.migrations = {
    dir: join(__dirname, '..', 'migrations'),
    autoApply: true
  }

  config.plugins = {
    paths: [
      join(__dirname, '..', 'plugins'),
      join(__dirname, '..', 'routes')
    ]
  }
  config.metrics = {
    port: 0
  }
  return { config }
}

const defaultEnv = {
  PLT_MACHINIST_URL: 'http://localhost:3052',
  PLT_SCALER_DATABASE_URL: connectionString,
  PLT_ICC_VALKEY_CONNECTION_STRING: valkeyConnectionString,
  PLT_SCALER_PROMETHEUS_URL: 'http://localhost:9090',
  PLT_SCALER_DEBOUNCE: 10000,
  PLT_FEATURE_SCALER_TRENDS_LEARNING: true
}

function setUpEnvironment (env = {}) {
  const finalEnv = { ...defaultEnv, ...env }
  Object.assign(process.env, finalEnv)
}

async function buildServer (t, options = {}) {
  setUpEnvironment(options)
  const { config } = await getConfig()
  const server = await buildDbServer(config)

  if (t) {
    t.after(() => server.close())
  }

  await cleanDb(server)
  await cleanValkeyData()

  return server
}

async function buildServerWithPlugins (t, options = {}, plugins = []) {
  setUpEnvironment(options)
  const { config } = await getConfig()
  config.plugins = {
    paths: []
  }

  const server = await buildDbServer(config)

  await cleanDb(server)

  for (const plugin of plugins) {
    await server.register(plugin)
  }

  t.after(() => server.close())
  return server
}

async function cleanDb (app) {
  const { db, sql } = app.platformatic
  try {
    await db.query(sql`DELETE FROM "signals"`)
  } catch (err) {}
  try {
    await db.query(sql`DELETE FROM "performance_history"`)
  } catch (err) {}
  try {
    await db.query(sql`DELETE FROM "scale_events"`)
  } catch (err) {}
  try {
    await db.query(sql`DELETE FROM "controllers"`)
  } catch (err) {}
  try {
    await db.query(sql`DELETE FROM "application_scale_configs"`)
  } catch (err) {}
  try {
    await db.query(sql`DELETE FROM "flamegraphs"`)
  } catch (err) {}
  try {
    await db.query(sql`DELETE FROM "alerts"`)
  } catch (err) {}

  if (app.store) {
    try {
      await app.store.savePredictions([])
    } catch (err) {}
  }
}

let pool = null
beforeEach(cleandb)
afterEach(async () => {
  await pool.dispose()
  pool = null
})

async function cleandb () {
  pool = createConnectionPool({
    connectionString,
    bigIntMode: 'bigint'
  })

  const sql = createConnectionPool.sql

  try {
    await pool.query(sql`DELETE FROM application_scale_configs;`)
    await pool.query(sql`DELETE FROM controllers;`)
    await pool.query(sql`DELETE FROM scale_events;`)
    await pool.query(sql`DELETE FROM performance_history;`)
  } catch {}
}

function generateK8sAuthContext (podId, namespace) {
  return { namespace, pod: { name: podId } }
}

function generateK8sHeader (podId, namespace) {
  namespace = namespace || 'platformatic'
  return JSON.stringify(generateK8sAuthContext(podId, namespace))
}

const createExecutor = (executor) => fp(async function (app) {
  app.decorate('scalerExecutor', executor)
}, {
  name: 'scaler-executor',
  dependencies: []
})

async function startMachinist (t, opts = {}) {
  const machinist = fastify({ keepAliveTimeout: 1 })

  machinist.get('/controllers/:namespace', async (req) => {
    const podId = req.query.podId
    const defaultController = {
      name: 'test-controller',
      namespace: 'platformatic',
      kind: 'Controller',
      apiVersion: 'v1',
      replicas: 1
    }
    const controller = opts.getPodController?.(podId) ?? defaultController
    return { controllers: [controller] }
  })

  machinist.post('/controllers/:namespace/:controllerId', async (req) => {
    const { namespace, controllerId } = req.params
    const { replicaCount: replicas } = req.body
    opts.setPodController?.({ controllerId, namespace, replicas })
  })

  t?.after(async () => {
    await machinist.close()
  })

  await machinist.listen({ port: 3052 })
  return machinist
}

async function setupMockPrometheusServer (responses = {}) {
  const server = fastify({ keepAliveTimeout: 1 })

  server.get('/api/v1/query_range', async (request, reply) => {
    const { query } = request.query
    let responseData = null

    if (query.includes('nodejs_heap_size_total_bytes') && query.includes('applicationId')) {
      responseData = responses.heapSize
    } else if (query.includes('nodejs_eventloop_utilization') && query.includes('applicationId')) {
      responseData = responses.eventLoop
    } else if (query === 'nodejs_heap_size_total_bytes') {
      responseData = responses.allHeapSize
    } else if (query === 'nodejs_eventloop_utilization') {
      responseData = responses.allEventLoop
    }

    if (responseData) {
      return responseData
    }

    return reply.status(404).send({ status: 'error', error: 'No data found for query' })
  })

  const address = await server.listen({ port: 0 })

  return {
    server,
    address,
    close: async () => {
      await server.close()
    }
  }
}

// Helper function to clean Redis data
async function cleanValkeyData () {
  const redis = new Redis(valkeyConnectionString)
  try {
    const scalerKeys = await scanKeys(redis, 'scaler:*')
    const reactiveKeys = await scanKeys(redis, 'reactive:*')
    const allKeys = [...scalerKeys, ...reactiveKeys]
    if (allKeys.length > 0) {
      await redis.del(...allKeys)
    }
  } finally {
    await redis.quit()
  }
}

module.exports = {
  setUpEnvironment,
  buildServer,
  buildServerWithPlugins,
  cleandb,
  cleanValkeyData,
  generateK8sHeader,
  getConfig,
  createExecutor,
  valkeyConnectionString,
  connectionString,
  startMachinist,
  setupMockPrometheusServer
}
