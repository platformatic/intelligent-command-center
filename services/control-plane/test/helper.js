'use strict'

const { join } = require('node:path')
const { randomUUID } = require('node:crypto')
const { readFile } = require('node:fs/promises')
const { buildServer: buildDbServer } = require('@platformatic/db')
const fastify = require('fastify')

const defaultEnv = {
  PLT_CONTROL_PLANE_DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5433/control_plane',
  PLT_CONTROL_PLANE_LOG_LEVEL: 'info',

  PLT_CONTROL_PLANE_VALKEY_CACHE_CONNECTION_STRING: 'redis://localhost:6342',

  PLT_EXTERNAL_TRAFFICANTE_URL: 'http://localhost:3033',
  PLT_EXTERNAL_ACTIVITIES_URL: 'http://localhost:3004',
  PLT_EXTERNAL_COMPLIANCE_URL: 'http://localhost:3003',
  PLT_EXTERNAL_CRON_URL: '',
  PLT_EXTERNAL_USER_MANAGER_URL: '',
  PLT_EXTERNAL_RISK_MANAGER_URL: '',
  PLT_EXTERNAL_RISK_SERVICE_URL: '',
  PLT_EXTERNAL_METRICS_URL: '',

  PLT_MACHINIST_URL: 'http://localhost:3052',
  PLT_ACTIVITIES_URL: 'http://localhost:3004',
  PLT_METRICS_URL: 'http://localhost:3009',
  PLT_MAIN_SERVICE_URL: 'http://localhost:3010',

  PLT_CONTROL_PLANE_CACHE_PROVIDER: 'valkey-oss',
  PLT_CONTROL_PLANE_SECRET_KEY: 'secret'
}

function setUpEnvironment (env = {}) {
  Object.assign(process.env, defaultEnv, env)
}

async function startControlPlane (t, entities = {}, env = {}) {
  setUpEnvironment(env)

  const clientsDir = join(__dirname, '..', '..', '..', 'clients')

  const originalConfig = JSON.parse(await readFile(join(__dirname, '..', 'platformatic.json'), 'utf-8'))
  const app = await buildDbServer({
    server: {
      hostname: '127.0.0.1',
      port: 3042,
      pluginTimeout: 30000,
      logger: { level: 'error' }
    },
    db: {
      connectionString: process.env.PLT_CONTROL_PLANE_DATABASE_URL,
      events: false,
      openapi: originalConfig.db.openapi,
      limit: {
        max: 1000,
        default: 1000
      }
    },
    types: {
      autogenerate: true
    },
    migrations: {
      dir: join(__dirname, '..', 'migrations'),
      autoApply: true
    },
    plugins: {
      paths: [
        join(__dirname, '..', 'plugins'),
        join(__dirname, '..', 'routes')
      ]
    },
    clients: [
      {
        schema: join(clientsDir, 'activities', 'activities.openapi.json'),
        name: 'activities',
        type: 'openapi',
        url: process.env.PLT_ACTIVITIES_URL
      },
      {
        schema: join(clientsDir, 'metrics', 'metrics.openapi.json'),
        name: 'metrics',
        type: 'openapi',
        url: process.env.PLT_METRICS_URL
      }
    ],
    watch: false
  })

  const testCtx = {
    logger: app.log,
    req: {
      activities: {
        postEvents: () => ({ id: 42, event: 'test' })
      },
      metrics: {
        postServices: () => ({})
      }
    }
  }

  app.decorate('testApi', {
    saveDetectedPod: async (applicationName, imageId, podId) => {
      return app.saveDetectedPod(applicationName, imageId, podId, testCtx)
    }
  })

  if (t !== null) {
    t.after(() => app.close())
  }

  const { db, sql } = app.platformatic

  await db.query(sql`DELETE FROM "generations_deployments"`)
  await db.query(sql`DELETE FROM "generations_applications_configs"`)
  await db.query(sql`DELETE FROM "graphs"`)
  await db.query(sql`DELETE FROM "detected_pods"`)
  await db.query(sql`DELETE FROM "deployments"`)
  await db.query(sql`DELETE FROM "application_states"`)
  await db.query(sql`DELETE FROM "applications_configs"`)
  await db.query(sql`DELETE FROM "applications"`)
  await db.query(sql`DELETE FROM "generations"`)

  if (
    entities.generations !== undefined &&
    entities.generations.length > 0
  ) {
    await app.platformatic.entities.generation.insert({
      inputs: entities.generations
    })
  }

  if (
    entities.exportables !== undefined &&
    entities.exportables.length > 0
  ) {
    await app.platformatic.entities.exportable.insert({
      inputs: entities.exportables
    })
  }

  if (
    entities.applications !== undefined &&
    entities.applications.length > 0
  ) {
    await app.platformatic.entities.application.insert({
      inputs: entities.applications
    })
  }

  if (
    entities.applicationsConfigs !== undefined &&
    entities.applicationsConfigs.length > 0
  ) {
    await app.platformatic.entities.applicationsConfig.insert({
      inputs: entities.applicationsConfigs
    })
  }

  if (
    entities.applicationStates !== undefined &&
    entities.applicationStates.length > 0
  ) {
    await app.platformatic.entities.applicationState.insert({
      inputs: entities.applicationStates
    })
  }

  if (
    entities.deployments !== undefined &&
    entities.deployments.length > 0
  ) {
    await app.platformatic.entities.deployment.insert({
      inputs: entities.deployments
    })
  }

  if (
    entities.detectedPods !== undefined &&
    entities.detectedPods.length > 0
  ) {
    await app.platformatic.entities.detectedPod.insert({
      inputs: entities.detectedPods
    })
  }

  if (
    entities.graphs !== undefined &&
    entities.graphs.length > 0
  ) {
    await app.platformatic.entities.graph.insert({
      inputs: entities.graphs
    })
  }

  if (
    entities.generationsDeployments !== undefined &&
    entities.generationsDeployments.length > 0
  ) {
    await app.platformatic.entities.generationsDeployment.insert({
      inputs: entities.generationsDeployments
    })
  }

  if (
    entities.generationsApplicationsConfigs !== undefined &&
    entities.generationsApplicationsConfigs.length > 0
  ) {
    await app.platformatic.entities.generationsApplicationsConfig.insert({
      inputs: entities.generationsApplicationsConfigs
    })
  }

  await app.start()
  return app
}

async function startActivities (t, opts = {}) {
  const activitiesService = fastify({ keepAliveTimeout: 1 })

  activitiesService.post('/events', async (req) => {
    const event = req.body
    return opts.saveEvent?.(event)
  })

  t.after(async () => {
    await activitiesService.close()
  })

  await activitiesService.listen({ port: 3004 })
  return activitiesService
}

function generateGeneration (version) {
  return {
    id: randomUUID(),
    version: version ?? 1
  }
}

function generateApplication (name) {
  return { id: randomUUID(), name }
}

function generateApplicationConfig (applicationId, config = {}) {
  const defaultResources = {
    threads: 1,
    heap: 1024,
    services: []
  }

  return {
    id: randomUUID(),
    applicationId,
    version: 1,
    resources: config.resources || defaultResources
  }
}

function generateApplicationState (applicationId, state) {
  const defaultState = {
    services: [
      {
        id: 'service1',
        type: 'composer',
        entrypoint: true,
        version: '1.42.0'
      },
      {
        id: 'service2',
        type: 'db',
        entrypoint: false,
        version: '1.42.0'
      }
    ]
  }

  return {
    id: randomUUID(),
    applicationId,
    pltVersion: '1.42.0',
    state: JSON.stringify(state || defaultState)
  }
}

function generateDeployment (
  applicationId,
  applicationStateId,
  imageId
) {
  return {
    id: randomUUID(),
    applicationId,
    applicationStateId,
    imageId: imageId || randomUUID(),
    status: 'started'
  }
}

function generateDetectedPod (
  applicationId,
  deploymentId,
  podId,
  status
) {
  return {
    id: randomUUID(),
    applicationId,
    deploymentId,
    podId: podId || randomUUID(),
    status: status || 'starting'
  }
}

function generateGraph (generationId, graph) {
  const applicationId1 = randomUUID()
  const applicationId2 = randomUUID()

  return {
    id: randomUUID(),
    generationId,
    graph: graph ?? {
      applications: [
        {
          id: applicationId1,
          name: 'test-app-1',
          path: '/test-app-1',
          services: [
            {
              id: 'service1',
              type: 'composer',
              plugins: [],
              version: '1.42.0',
              entrypoint: true
            },
            {
              id: 'service2',
              type: 'db',
              plugins: [],
              version: '1.42.0',
              entrypoint: false
            }
          ]
        },
        {
          id: applicationId2,
          name: 'test-app-2',
          path: null,
          services: [
            {
              id: 'service1',
              type: 'composer',
              plugins: [],
              version: '1.42.0',
              entrypoint: true
            },
            {
              id: 'service2',
              type: 'db',
              plugins: [],
              version: '1.42.0',
              entrypoint: false
            }
          ]
        }
      ],
      links: [
        {
          source: {
            applicationId: null,
            serviceId: null,
            telemetryId: 'X'
          },
          target: {
            applicationId: applicationId1,
            serviceId: 'service1',
            telemetryId: 'test-app-1-service1'
          },
          requestsAmount: 'no_requests',
          responseTime: 'no_requests'
        },
        {
          source: {
            applicationId: applicationId1,
            serviceId: 'service2',
            telemetryId: 'test-app-1-service2'
          },
          target: {
            applicationId: applicationId2,
            serviceId: 'service2',
            telemetryId: 'test-app-2-service2'
          },
          requestsAmount: 'no_requests',
          responseTime: 'no_requests'
        }
      ]
    }
  }
}

async function startMetrics (t, opts = {}) {
  const metrics = fastify({ keepAliveTimeout: 1 })

  metrics.post('/services', async (req) => {
    return opts.postServices?.(req.body)
  })

  metrics.post('/services/metrics', async (req) => {
    return opts.postServicesMetrics?.(req.body)
  })

  t.after(async () => {
    await metrics.close()
  })

  await metrics.listen({ port: 3009 })
  return metrics
}

async function startMachinist (t, opts = {}) {
  const machinist = fastify({ keepAliveTimeout: 1 })

  machinist.get('/pods/:namespace/:podId', async (req) => {
    const podId = req.params.podId
    return opts.getPodDetails?.(podId)
  })

  t?.after(async () => {
    await machinist.close()
  })

  await machinist.listen({ port: 3052 })
  return machinist
}

async function startMainService (t, opts = {}) {
  const main = fastify({ keepAliveTimeout: 1 })

  main.post('/api/updates/icc', async (req, reply) => {
    reply.status(204)
    return opts.saveIccUpdate?.(req.body)
  })

  main.post('/api/updates/applications/:id', async (req, reply) => {
    const applicationId = req.params.id
    reply.status(204)
    return opts.saveApplicationUpdate?.(applicationId, req.body)
  })

  t.after(async () => {
    await main.close()
  })

  await main.listen({ port: 3010 })
  return main
}

module.exports = {
  startControlPlane,
  startActivities,
  startMetrics,
  startMachinist,
  startMainService,
  generateGeneration,
  generateApplication,
  generateApplicationState,
  generateApplicationConfig,
  generateDeployment,
  generateDetectedPod,
  generateGraph,
  defaultEnv
}
