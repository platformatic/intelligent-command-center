'use strict'

const { join } = require('node:path')
const { randomUUID } = require('node:crypto')
const { readFile } = require('node:fs/promises')
const platformaticDb = require('@platformatic/db')
const fastify = require('fastify')

const defaultEnv = {
  PLT_CONTROL_PLANE_DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5433/control_plane',

  PLT_APPLICATIONS_VALKEY_CONNECTION_STRING: 'redis://localhost:6342',

  PLT_EXTERNAL_TRAFFIC_INSPECTOR_URL: 'http://localhost:3033',
  PLT_EXTERNAL_ACTIVITIES_URL: 'http://localhost:3004',
  PLT_EXTERNAL_COMPLIANCE_URL: 'http://localhost:3003',
  PLT_EXTERNAL_CRON_URL: '',
  PLT_EXTERNAL_USER_MANAGER_URL: '',
  PLT_EXTERNAL_RISK_MANAGER_URL: '',
  PLT_EXTERNAL_RISK_SERVICE_URL: '',
  PLT_EXTERNAL_METRICS_URL: '',
  PLT_EXTERNAL_SCALER_URL: '',

  PLT_MACHINIST_URL: 'http://localhost:3052',
  PLT_MACHINIST_PROVIDER: 'k8s',
  PLT_SCALER_URL: 'http://localhost:3053',
  PLT_ACTIVITIES_URL: 'http://localhost:3004',
  PLT_METRICS_URL: 'http://localhost:3009',
  PLT_MAIN_SERVICE_URL: 'http://localhost:3010',
  PLT_COMPLIANCE_URL: 'http://localhost:3022',
  PLT_TRAFFIC_INSPECTOR_URL: 'http://localhost:3033',

  PLT_APPLICATIONS_CACHE_PROVIDER: 'valkey-oss',
  PLT_CONTROL_PLANE_SECRET_KEYS: 'secret',

  PLT_CONTROL_PLANE_DB_LOCK_MIN_TIMEOUT: 300,
  PLT_ICC_SESSION_SECRET: 'session-secret',
  PLT_FEATURE_CACHE: true
}

function setUpEnvironment (env = {}) {
  Object.assign(process.env, defaultEnv, env)
}

async function startControlPlane (t, entities = {}, env = {}) {
  setUpEnvironment(env)

  const originalConfig = JSON.parse(await readFile(join(__dirname, '..', 'platformatic.json'), 'utf-8'))
  const capability = await platformaticDb.create(join(__dirname, '..'), {
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
    watch: false
  })
  await capability.init()
  const app = capability.getApplication()

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
    saveInstance: async (applicationName, imageId, machineId, namespace) => {
      namespace = namespace || 'platformatic'

      return app.saveInstance(
        applicationName,
        imageId,
        machineId,
        namespace,
        testCtx
      )
    },
    saveApplicationState: async (machineId, state) => {
      state = {
        metadata: {
          platformaticVersion: '1.42.0'
        },
        ...state
      }

      const { statusCode, body } = await app.inject({
        method: 'POST',
        url: `/pods/${machineId}/instance/state`,
        headers: {
          'content-type': 'application/json',
          ...generateMachineHeaders(machineId)
        },
        body: state
      })

      if (statusCode !== 200) {
        throw new Error(body)
      }
    }
  })

  if (t) {
    t.after(() => capability.stop())
  }

  const { db, sql } = app.platformatic

  await db.query(sql`DELETE FROM "deploy_tokens"`)
  await db.query(sql`DELETE FROM "version_audit"`)
  await db.query(sql`DELETE FROM "skew_protection_policies"`)
  await db.query(sql`DELETE FROM "version_registry"`)
  await db.query(sql`DELETE FROM "generations_deployments"`)
  await db.query(sql`DELETE FROM "generations_applications_configs"`)
  await db.query(sql`DELETE FROM "graphs"`)
  await db.query(sql`DELETE FROM "valkey_users"`)
  await db.query(sql`DELETE FROM "instances"`)
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
    entities.instances !== undefined &&
    entities.instances.length > 0
  ) {
    await app.platformatic.entities.instance.insert({
      inputs: entities.instances
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

  await capability.start()
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
    namespace: 'platformatic',
    status: 'started'
  }
}

function generateInstance (
  applicationId,
  deploymentId,
  machineId,
  status
) {
  return {
    id: randomUUID(),
    applicationId,
    deploymentId,
    machineId: machineId || randomUUID(),
    namespace: 'platformatic',
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

  machinist.get('/k8s/machines/:namespace/:id', async (req) => {
    const machineId = req.params.id
    return opts.getMachineDetails?.(machineId)
  })

  machinist.get('/k8s/machines/:namespace', async (req) => {
    const namespace = req.params.namespace
    const labelsParam = req.query.labels
    const labelsArray = Array.isArray(labelsParam) ? labelsParam : [labelsParam].filter(Boolean)
    const labels = {}
    for (const label of labelsArray) {
      const [key, value] = label.split('=')
      labels[key] = value
    }
    return opts.getMachines?.(namespace, labels) ?? []
  })

  machinist.patch('/k8s/machines/:namespace/:id/labels', async (req) => {
    const machineId = req.params.id
    const labels = req.body.labels
    return opts.setMachineLabels?.(machineId, labels) ?? { labels }
  })

  machinist.get('/k8s/gateway/gateways/:namespace', async (req) => {
    const namespace = req.params.namespace
    return opts.listGateways?.(namespace) ?? []
  })

  machinist.get('/k8s/services/:namespace', async (req) => {
    const namespace = req.params.namespace
    const labelsParam = req.query.labels
    const labelsArray = Array.isArray(labelsParam) ? labelsParam : [labelsParam].filter(Boolean)
    const labels = {}
    for (const label of labelsArray) {
      const [key, value] = label.split('=')
      labels[key] = value
    }
    return opts.getServicesByLabels?.(namespace, labels) ?? []
  })

  machinist.put('/k8s/gateway/httproutes/:namespace', async (req) => {
    const namespace = req.params.namespace
    return opts.applyHTTPRoute?.(namespace, req.body) ?? req.body
  })

  machinist.delete('/k8s/gateway/httproutes/:namespace/:name', async (req) => {
    const { namespace, name } = req.params
    return opts.deleteHTTPRoute?.(namespace, name) ?? {}
  })

  machinist.post('/k8s/controllers/:namespace/:name', async (req) => {
    const { namespace, name } = req.params
    const { replicas } = req.body
    opts.updateControllerReplicas?.(namespace, name, replicas)
    return { name, replicas, labels: {} }
  })

  machinist.delete('/k8s/controllers/:namespace/:name', async (req) => {
    const { namespace, name } = req.params
    return opts.deleteController?.(namespace, name) ?? { status: 'Success' }
  })

  machinist.delete('/k8s/services/:namespace/:name', async (req) => {
    const { namespace, name } = req.params
    return opts.deleteService?.(namespace, name) ?? { status: 'Success' }
  })

  t?.after(async () => {
    await machinist.close()
  })

  await machinist.listen({ port: 3052 })
  return machinist
}

async function startScaler (t, opts = {}) {
  const scaler = fastify({ keepAliveTimeout: 1 })

  scaler.post('/controllers', async (req) => {
    const instance = req.body
    await opts.saveMachineController?.(instance)
  })

  t?.after(async () => {
    await scaler.close()
  })

  await scaler.listen({ port: 3053 })
  return scaler
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

async function startCompliance (t, opts = {}) {
  const compliance = fastify({ keepAliveTimeout: 1 })

  compliance.post('/rules/:ruleName', async (req) => {
    const ruleName = req.params.ruleName
    return opts.saveRule?.(ruleName, req.body)
  })

  t.after(async () => {
    await compliance.close()
  })

  await compliance.listen({ port: 3022 })
  return compliance
}

async function startTrafficInspector (t, opts = {}) {
  const trafficInspector = fastify({ keepAliveTimeout: 1 })

  trafficInspector.get('/interceptorConfigs/', async (req) => {
    return opts?.getInterceptorConfigs() ?? []
  })

  t.after(async () => {
    await trafficInspector.close()
  })

  await trafficInspector.listen({ port: 3033 })
  return trafficInspector
}

function generateMachineHeaders (machineId, namespace = 'platformatic') {
  return {
    'x-plt-machine-id': machineId,
    'x-plt-machine-namespace': namespace
  }
}

module.exports = {
  startControlPlane,
  startActivities,
  startMetrics,
  startMachinist,
  startCompliance,
  startTrafficInspector,
  startScaler,
  startMainService,
  generateGeneration,
  generateApplication,
  generateApplicationState,
  generateApplicationConfig,
  generateDeployment,
  generateInstance,
  generateGraph,
  generateMachineHeaders,
  defaultEnv
}
