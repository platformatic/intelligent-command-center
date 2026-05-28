'use strict'

const { beforeEach, afterEach } = require('node:test')
const { join } = require('path')
const { setGlobalDispatcher, Agent } = require('undici')
const platformaticDb = require('@platformatic/db')
const createConnectionPool = require('@databases/pg')

const connectionString = 'postgres://postgres:postgres@127.0.0.1:5433/cron'

setGlobalDispatcher(new Agent({
  keepAliveTimeout: 10,
  keepAliveMaxTimeout: 10
}))

async function getConfig (enableMetrics) {
  const config = {}
  config.server = {
    port: 0,
    logger: { level: 'error' }
  }
  config.db = {
    connectionString,
    graphql: true,
    openapi: true
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
  // In v3 the Prometheus HTTP endpoint is bound by @platformatic/runtime
  // (see runtime/lib/prom-server.js). A standalone capability does not
  // bind a metrics port, so we expose the registry off `globalThis` and
  // let tests assert against it directly.
  return { config }
}

function setUpEnvironment (env = {}) {
  // No ICC internal jobs as default for tests
  Object.assign(process.env, { PLT_CRON_ICC_JOBS: '', PLT_FEATURE_SCALER_TRENDS_LEARNING: false }, env)
}

async function buildServer (t, env = {}) {
  setUpEnvironment(env)
  const { config } = await getConfig()
  // v3 promotes the prom-client registry to a process-global, which
  // also means counter values bleed across tests in the same file.
  // Reset the registry before each boot so each test sees only its own
  // increments. The executor reuses metrics via registry.getSingleMetric
  // so re-init after clear() works.
  globalThis.platformatic?.prometheus?.registry?.resetMetrics?.()
  const capability = await platformaticDb.create(join(__dirname, '..'), config)
  await capability.init()
  const server = capability.getApplication()
  t.after(() => capability.stop())
  return server
}

let pool = null
beforeEach(cleandb)
afterEach(async () => {
  await pool.dispose()
  pool = null
})

async function getJobMessages (jobName) {
  const sql = createConnectionPool.sql
  const job = (await pool.query(sql`SELECT * FROM JOBS WHERE name = ${jobName};`))[0]
  const messages = await pool.query(sql`SELECT * FROM MESSAGES WHERE job_id = ${job.id};`)
  return messages
}

async function getJob (jobId) {
  const sql = createConnectionPool.sql
  const job = (await pool.query(sql`SELECT * FROM JOBS WHERE id = ${jobId};`))[0]
  return job
}

async function getJobFromName (name) {
  const sql = createConnectionPool.sql
  const job = (await pool.query(sql`SELECT * FROM JOBS WHERE name = ${name};`))[0]
  return job
}

async function cleandb () {
  pool = createConnectionPool({
    connectionString,
    bigIntMode: 'bigint'
  })

  const sql = createConnectionPool.sql

  try {
    // Delete all data from tables and reset sequences
    await pool.query(sql`TRUNCATE TABLE messages, jobs RESTART IDENTITY CASCADE;`)
  } catch (err) {
    // If truncate fails, try dropping tables (first run scenario)
    try {
      await pool.query(sql`DROP TABLE IF EXISTS messages CASCADE;`)
    } catch {}
    try {
      await pool.query(sql`DROP TABLE IF EXISTS jobs CASCADE;`)
    } catch {}
    try {
      await pool.query(sql`DROP TYPE IF EXISTS job_type_enum CASCADE;`)
    } catch {}
    try {
      await pool.query(sql`DROP TABLE IF EXISTS versions CASCADE;`)
    } catch {}
  }
}

module.exports.getConfig = getConfig
module.exports.buildServer = buildServer
module.exports.cleandb = cleandb
module.exports.getJobMessages = getJobMessages
module.exports.getJob = getJob
module.exports.getJobFromName = getJobFromName
