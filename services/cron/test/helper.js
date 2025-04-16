'use strict'

const { beforeEach, afterEach } = require('node:test')
const { join } = require('path')
const { setGlobalDispatcher, Agent } = require('undici')
const { buildServer: buildDbServer } = require('@platformatic/db')
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

function setUpEnvironment (env = {}) {
  // No ICC internal jobs as default for tests
  Object.assign(process.env, { PLT_CRON_ICC_JOBS: '' }, env)
}

async function buildServer (t, env = {}) {
  setUpEnvironment(env)
  const { config } = await getConfig()
  const server = await buildDbServer(config)
  t.after(() => server.close())
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
    await pool.query(sql`DROP TABLE MESSAGES;`)
  } catch {}
  try {
    await pool.query(sql`DROP TABLE JOBS;`)
  } catch {}
  try {
    await pool.query(sql`DROP TYPE JOB_STATUS;`)
  } catch {}
  try {
    await pool.query(sql`DROP TABLE VERSIONS;`)
  } catch (err) {
  }
}

module.exports.getConfig = getConfig
module.exports.buildServer = buildServer
module.exports.cleandb = cleandb
module.exports.getJobMessages = getJobMessages
module.exports.getJob = getJob
module.exports.getJobFromName = getJobFromName
