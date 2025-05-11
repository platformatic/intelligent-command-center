'use strict'

const { beforeEach, afterEach } = require('node:test')
const { join } = require('path')
const { setGlobalDispatcher, Agent } = require('undici')
const { buildServer: buildDbServer } = require('@platformatic/db')
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
    connectionString
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
  PLT_SCALER_DATABASE_URL: connectionString,
  PLT_ICC_VALKEY_CONNECTION_STRING: valkeyConnectionString,
  PLT_SCALER_PROMETHEUS_URL: 'http://localhost:9090'
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

  for (const plugin of plugins) {
    await server.register(plugin)
  }

  t.after(() => server.close())
  return server
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

module.exports = {
  setUpEnvironment,
  buildServer,
  buildServerWithPlugins,
  cleandb,
  generateK8sHeader,
  getConfig,
  createExecutor,
  valkeyConnectionString,
  connectionString
}
