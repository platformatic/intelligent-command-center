'use strict'

const { beforeEach, afterEach } = require('node:test')
const { join } = require('node:path')
const { setGlobalDispatcher, Agent } = require('undici')
const { buildServer: buildDbServer } = require('@platformatic/db')
const fastify = require('fastify')
const fp = require('fastify-plugin')
const createConnectionPool = require('@databases/pg')

const connectionString = 'postgres://postgres:postgres@127.0.0.1:5433/scaler'
const valkeyConnectionString = 'redis://localhost:6343'

setGlobalDispatcher(new Agent({
  keepAliveTimeout: 10,
  keepAliveMaxTimeout: 10
}))

async function getConfig () {
  const config = {}
  config.server = {
    port: 0,
    logger: { level: 'error' }
  }
  config.db = {
    connectionString,
    openapi: {
      ignoreRoutes: [
        {
          method: 'POST',
          path: '/controllers'
        }
      ]
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
    port: 19090
  }
  return { config }
}

const defaultEnv = {
  PLT_MACHINIST_URL: 'http://localhost:3052',
  PLT_SCALER_DATABASE_URL: connectionString,
  PLT_ICC_VALKEY_CONNECTION_STRING: valkeyConnectionString,
  PLT_SCALER_PROMETHEUS_URL: 'http://localhost:9090',
  PLT_SCALER_DEBOUNCE: 10000
}

function setUpEnvironment (env = {}) {
  Object.assign(process.env, defaultEnv, env)
}

async function buildServer (t, options = {}) {
  const env = options.env || {}
  setUpEnvironment(env)
  const { config } = await getConfig()
  const server = await buildDbServer(config)
  t.after(() => server.close())

  await cleanDb(server)

  return server
}

async function buildServerWithPlugins (t, options = {}, plugins = []) {
  const env = options.env || {}
  setUpEnvironment(env)
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
  await db.query(sql`DELETE FROM "application_scale_configs"`)
  await db.query(sql`DELETE FROM "controllers"`)
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
    await pool.query(sql`DELETE FROM HEALTH;`)
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

  t?.after(async () => {
    await machinist.close()
  })

  await machinist.listen({ port: 3052 })
  return machinist
}

module.exports = {
  setUpEnvironment,
  buildServer,
  buildServerWithPlugins,
  cleandb,
  generateK8sHeader,
  getConfig,
  createExecutor,
  valkeyConnectionString,
  connectionString,
  startMachinist
}
