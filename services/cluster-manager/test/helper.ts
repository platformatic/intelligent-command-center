'use strict'

const { join, resolve } = require('node:path')
const { readFile } = require('node:fs/promises')
const { existsSync } = require('node:fs')
const { buildServer } = require('@platformatic/db')
const fastify = require('fastify')

function setUpEnvironment(env = {}) {
  const defaultEnv = {
    PLT_CLIENTS_ROLE: 'clients',
    PLT_TOKEN_SVC_HOST: '',
    PLT_CORE_ROLE: 'plt-local-core',
    PLT_RISK_SERVICE_REDIS_CONNECTION_STRING: 'redis://localhost:6342',
    PLT_RISK_COLD_STORAGE_HOST: 'http://localhost:3006',
    PLT_CLUSTER_MANAGER_DATABASE_URL: process.env.PLT_CLUSTER_MANAGER_DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5433/cluster_manager'
  }

  Object.assign(process.env, defaultEnv, env)
}

async function serviceConfig(overrides: { logLevel?: string }) {
  // Find package.json by traversing up from current directory.
  // We need this because we have a relative path to the clients folder which is in ICC root
  let currentDir = __dirname
  let packageRoot
  while (currentDir !== '/') {
    if (existsSync(join(currentDir, 'package.json'))) {
      packageRoot = currentDir
      break
    }
    currentDir = resolve(currentDir, '..')
  }

  if (!packageRoot) {
    throw new Error('Could not find package.json')
  }

  const clientsDir = join(packageRoot, '..', '..', 'clients')
  const config = JSON.parse(await readFile(join(packageRoot, 'platformatic.json'), 'utf8'))
  config.server = {
    logger: { level: 'silent' },
    port: 0,
    hostname: '127.0.0.1'
  }
  if (overrides.logLevel) {
    config.server.logger.level = overrides.logLevel
  }
  config.plugins = {
    paths: [
      join(packageRoot, 'plugins'),
      join(packageRoot, 'routes')
    ]
  }
  config.clients = [
    {
      schema: join(clientsDir, 'control-plane', 'control-plane.openapi.json'),
      name: 'controlPlane',
      type: 'openapi',
      url: process.env.PLT_CONTROL_PLANE_URL || 'http://127.0.0.1:3042'
    },
    {
      schema: join(clientsDir, 'metrics', 'metrics.openapi.json'),
      name: 'metrics',
      type: 'openapi',
      url: process.env.PLT_METRICS_URL || 'http://127.0.0.1:3009'
    },
    {
      schema: join(clientsDir, 'risk-service', 'risk-service.openapi.json'),
      name: 'riskService',
      type: 'openapi',
      url: process.env.PLT_RISK_SERVICE_URL || 'http://127.0.0.1:3006'
    }
  ]

  return config
}

const bootstrap = async function bootstrap(t: any, serverOverrides: { logLevel?: string } = {}, env: any = {}) {
  setUpEnvironment(env)
  const options = await serviceConfig(serverOverrides)

  // Find package root for migrations path
  let currentDir = __dirname
  let packageRoot
  while (currentDir !== '/') {
    if (existsSync(join(currentDir, 'package.json'))) {
      packageRoot = currentDir
      break
    }
    currentDir = resolve(currentDir, '..')
  }

  // this is needed to run the seeds/recommendations.js script from root directory
  options.migrations.dir = join(packageRoot, 'migrations')

  const server = await buildServer(options)
  t.after(() => server.close())

  const { db, sql } = server.platformatic
  await db.query(sql`DELETE FROM "recommendations"`)
  await db.query(sql`ALTER SEQUENCE recommendations_count_seq RESTART`)

  await server.start()
  return server
}

async function startRiskService(t: any, opts: any = {}) {
  const risk = fastify({ keepAliveTimeout: 1 })

  risk.get('/latencies', async (req) => {
    return opts.getLatencies(req.query)
  })

  t.after(async () => {
    await risk.close()
  })

  await risk.listen({ port: 3006 })
  return risk
}

async function startControlPlane(t: any, opts: any = {}) {
  const controlPlane = fastify({ keepAliveTimeout: 1 })

  controlPlane.get('/graph', async () => {
    const graph = opts.getGraph?.()
    return graph
  })

  t.after(async () => {
    await controlPlane.close()
  })

  await controlPlane.listen({ port: 3042 })
  return controlPlane
}

async function startMetrics(t: any, opts: any = {}) {
  const metrics = fastify({ keepAliveTimeout: 1 })

  metrics.post('/services', async (req) => {
    return opts.postServices?.(req.body)
  })

  metrics.post('/services/metrics', async (req) => {
    return opts.postServicesMetrics(req.body)
  })

  t.after(async () => {
    await metrics.close()
  })

  await metrics.listen({ port: 3009 })
  return metrics
}

function getRandomElementFromArray(array: any[]) {
  return array[Math.floor(Math.random() * array.length)]
}

module.exports = {
  bootstrap,
  getRandomElementFromArray,
  setUpEnvironment,
  startRiskService,
  startControlPlane,
  startMetrics
}
