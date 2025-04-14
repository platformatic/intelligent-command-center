'use strict'

const { join } = require('node:path')
const { randomUUID } = require('node:crypto')
const { buildServer: buildDbServer } = require('@platformatic/db')
const fastify = require('fastify')
const { readFile } = require('node:fs/promises')

const defaultEnv = {
  PLT_ZIO_MAIN_PORT: 4041,
  PLT_ZIO_MANAGEMENT_PORT: 4042,

  PLT_MAIN_APPS_PUBLIC_DOMAIN: 'public.main.plt',

  PLT_CONTROL_PLANE_DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5433/control_plane',
  PLT_CONTROL_PLANE_LOG_LEVEL: 'info',

  PLT_CONTROL_PLANE_REDIS_CACHE_CONNECTION_STRING: 'redis://localhost:6342',

  PLT_EXTERNAL_TRAFFICANTE_URL: 'http://localhost:3033',
  PLT_EXTERNAL_ACTIVITIES_URL: 'http://localhost:3004',
  PLT_EXTERNAL_COMPLIANCE_URL: 'http://localhost:3003',
  PLT_EXTERNAL_CRON_URL: '',
  PLT_EXTERNAL_USER_MANAGER_URL: '',
  PLT_EXTERNAL_RISK_MANAGER_URL: '',
  PLT_EXTERNAL_RISK_SERVICE_URL: '',
  PLT_EXTERNAL_METRICS_URL: ''
}

function setUpEnvironment (env = {}) {
  Object.assign(process.env, defaultEnv, env)
}

async function startControlPlane (t, entities = {}, env = {}) {
  setUpEnvironment(env)

  // const clientsDir = join(__dirname, '..', '..', '..', 'clients')
  const originalConfig = JSON.parse(await readFile(join(__dirname, '..', 'platformatic.json'), 'utf-8'))
  const app = await buildDbServer({
    server: {
      hostname: '127.0.0.1',
      port: 3042,
      pluginTimeout: 30000,
      logger: { level: 'warn' }
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
    // clients: [
    //   {
    //     schema: join(clientsDir, 'risk-service', 'risk-service.openapi.json'),
    //     name: 'riskService',
    //     type: 'openapi',
    //     url: process.env.PLT_RISK_SERVICE_HOST
    //   },
    //   {
    //     schema: join(clientsDir, 'risk-manager', 'risk-manager.openapi.json'),
    //     name: 'riskManager',
    //     type: 'openapi',
    //     url: process.env.PLT_RISK_MANAGER_HOST
    //   },
    //   {
    //     schema: join(clientsDir, 'activities', 'activities.openapi.json'),
    //     name: 'activities',
    //     type: 'openapi',
    //     url: process.env.PLT_ACTIVITIES_HOST
    //   },
    //   {
    //     schema: join(clientsDir, 'metrics', 'metrics.openapi.json'),
    //     name: 'metrics',
    //     type: 'openapi',
    //     url: process.env.PLT_METRICS_URL
    //   },
    //   {
    //     schema: join(clientsDir, 'user-manager', 'user-manager.openapi.json'),
    //     name: 'userManager',
    //     type: 'openapi',
    //     url: process.env.PLT_USER_MANAGER_URL
    //   },
    //   {
    //     schema: join(clientsDir, 'trafficante', 'trafficante.openapi.json'),
    //     name: 'trafficante',
    //     type: 'openapi',
    //     url: process.env.PLT_TRAFFICANTE_URL
    //   }
    // ],
    watch: false
  })

  const testCtx = { logger: app.log }
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
    status: status || 'started'
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
    return opts.postServices(req.body)
  })

  metrics.post('/services/metrics', async (req) => {
    return opts.postTaxonomiesTaxonomyIdServicesMetrics(req.body)
  })

  t.after(async () => {
    await metrics.close()
  })

  await metrics.listen({ port: 3009 })
  return metrics
}

module.exports = {
  startControlPlane,
  startActivities,
  startMetrics,
  generateGeneration,
  generateApplication,
  generateApplicationState,
  generateApplicationConfig,
  generateDeployment,
  generateDetectedPod,
  generateGraph,
  defaultEnv
}
