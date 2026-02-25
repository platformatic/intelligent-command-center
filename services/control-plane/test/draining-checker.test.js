'use strict'

const { setTimeout } = require('node:timers/promises')
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createServer } = require('node:http')
const fastify = require('fastify')
const fp = require('fastify-plugin')
const versionRegistryPlugin = require('../plugins/version-registry')
const versionCleanupPlugin = require('../plugins/version-cleanup')
const drainingCheckerPlugin = require('../plugins/draining-checker')

function createMockMetricsServer (rpsMap) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    const match = url.pathname.match(/^\/kubernetes\/versions\/([^/]+)\/([^/]+)\/rps$/)
    if (match) {
      const appLabel = decodeURIComponent(match[1])
      const versionLabel = decodeURIComponent(match[2])
      const key = `${appLabel}:${versionLabel}`
      const rps = rpsMap[key] ?? 0
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ rps }))
    } else {
      res.writeHead(404)
      res.end()
    }
  })
  return server
}

async function startMockMetrics (rpsMap) {
  const server = createMockMetricsServer(rpsMap)
  await new Promise(resolve => server.listen(0, resolve))
  const port = server.address().port
  return { server, url: `http://127.0.0.1:${port}` }
}

function buildApp (opts = {}) {
  const app = fastify({ logger: false })
  const store = []
  let idCounter = 0
  const calls = {
    applyHTTPRoute: [],
    updateController: []
  }

  const gracePeriodMs = opts.gracePeriodMs || 999999999
  const checkIntervalMs = opts.checkIntervalMs || 50
  const trafficWindowMs = opts.trafficWindowMs || 1800000
  const metricsUrl = opts.metricsUrl || ''

  app.register(fp(async (app) => {
    app.decorate('env', {
      PLT_FEATURE_SKEW_PROTECTION: 'true',
      PLT_SKEW_GRACE_PERIOD_MS: gracePeriodMs,
      PLT_SKEW_CHECK_INTERVAL_MS: checkIntervalMs,
      PLT_SKEW_TRAFFIC_WINDOW_MS: trafficWindowMs,
      PLT_SKEW_AUTO_CLEANUP: false
    })
    app.decorate('iccServicesUrls', { metrics: metricsUrl, scaler: 'http://localhost:0' })
  }, { name: 'env' }))

  app.register(fp(async (app) => {
    app.decorate('platformatic', {
      entities: {
        versionRegistry: {
          find: async ({ where }) => {
            return store.filter(row => {
              for (const [key, condition] of Object.entries(where)) {
                if (condition.eq !== undefined && row[key] !== condition.eq) return false
                if (condition.neq !== undefined && row[key] === condition.neq) return false
                if (condition.in !== undefined && !condition.in.includes(row[key])) return false
              }
              return true
            })
          },
          save: async ({ input }) => {
            if (input.id) {
              const idx = store.findIndex(r => r.id === input.id)
              if (idx !== -1) {
                store[idx] = { ...store[idx], ...input }
                return store[idx]
              }
            }
            const row = { id: String(++idCounter), createdAt: new Date().toISOString(), ...input }
            store.push(row)
            return row
          }
        }
      }
    })
  }, { name: 'platformatic-db' }))

  app.register(fp(async (app) => {
    app.decorate('machinist', {
      listGateways: async () => [{ metadata: { name: 'platformatic' } }],
      applyHTTPRoute: async (namespace, httpRoute, ctx) => {
        calls.applyHTTPRoute.push({ namespace, httpRoute })
        return httpRoute
      },
      updateController: async (controllerId, namespace, apiVersion, kind, replicas, ctx) => {
        calls.updateController.push({ controllerId, namespace, replicas })
        return { spec: { replicas } }
      },
      deleteDeployment: async () => ({ status: 'Success' }),
      deleteService: async () => ({ status: 'Success' })
    })
  }, { name: 'machinist', dependencies: ['env'] }))

  app.register(fp(async (app) => {
    app.decorate('applyHTTPRoute', async (routeOpts, ctx) => {
      calls.applyHTTPRoute.push(routeOpts)
      return {}
    })
  }, { name: 'gateway', dependencies: ['env', 'machinist'] }))

  app.register(versionRegistryPlugin)
  app.register(versionCleanupPlugin)
  app.register(drainingCheckerPlugin)

  app.addHook('onReady', async () => {
    if (app.disableScaling) {
      app.disableScaling = async () => ({ success: true })
    }
  })

  return { app, store, calls }
}

const mockCtx = {
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {}
  }
}

const baseOpts = {
  applicationId: 'app-1',
  deploymentId: 'dep-1',
  appLabel: 'my-app',
  versionLabel: 'v1',
  k8SDeploymentName: 'my-app-v1',
  serviceName: 'my-app-v1-svc',
  servicePort: 3042,
  namespace: 'platformatic',
  pathPrefix: '/my-app',
  hostname: null
}

test('should expire draining versions with zero RPS from metrics', async (t) => {
  const rpsMap = { 'my-app:v1': 0 }
  const { server, url } = await startMockMetrics(rpsMap)
  t.after(() => server.close())

  const { app, store, calls } = buildApp({
    maxVersionAgeMs: 999999999,
    checkIntervalMs: 30,
    metricsUrl: url
  })
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx)
  await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    k8SDeploymentName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx)

  assert.strictEqual(store[0].status, 'draining')

  await setTimeout(150)

  assert.strictEqual(store[0].status, 'expired')
  assert.ok(calls.updateController.length > 0)
})

test('should expire versions past grace period regardless of traffic', async (t) => {
  const rpsMap = { 'my-app:v1': 100 }
  const { server, url } = await startMockMetrics(rpsMap)
  t.after(() => server.close())

  const { app, store, calls } = buildApp({
    gracePeriodMs: 50,
    checkIntervalMs: 30,
    metricsUrl: url
  })
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx)
  await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    k8SDeploymentName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx)

  store[0].drainedAt = new Date(Date.now() - 200).toISOString()

  await setTimeout(150)

  assert.strictEqual(store[0].status, 'expired')
  assert.ok(calls.updateController.length > 0)
})

test('should not expire draining versions that still have traffic', async (t) => {
  const rpsMap = { 'my-app:v1': 42.5 }
  const { server, url } = await startMockMetrics(rpsMap)
  t.after(() => server.close())

  const { app, store } = buildApp({
    maxVersionAgeMs: 999999999,
    checkIntervalMs: 30,
    metricsUrl: url
  })
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx)
  await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    k8SDeploymentName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx)

  await setTimeout(100)

  assert.strictEqual(store[0].status, 'draining')
})

test('should never touch active versions', async (t) => {
  const rpsMap = {}
  const { server, url } = await startMockMetrics(rpsMap)
  t.after(() => server.close())

  const { app, store } = buildApp({
    gracePeriodMs: 1,
    checkIntervalMs: 30,
    metricsUrl: url
  })
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx)
  store[0].createdAt = new Date(Date.now() - 10000).toISOString()

  await setTimeout(100)

  assert.strictEqual(store[0].status, 'active')
})

test('should handle multiple apps independently', async (t) => {
  const rpsMap = {
    'my-app:v1': 0,
    'other-app:v1': 25
  }
  const { server, url } = await startMockMetrics(rpsMap)
  t.after(() => server.close())

  const { app, store } = buildApp({
    maxVersionAgeMs: 999999999,
    checkIntervalMs: 30,
    metricsUrl: url
  })
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx)
  await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    k8SDeploymentName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx)

  await app.registerVersion({
    ...baseOpts,
    appLabel: 'other-app',
    versionLabel: 'v1',
    deploymentId: 'dep-3',
    k8SDeploymentName: 'other-app-v1',
    serviceName: 'other-app-v1-svc'
  }, mockCtx)
  await app.registerVersion({
    ...baseOpts,
    appLabel: 'other-app',
    versionLabel: 'v2',
    deploymentId: 'dep-4',
    k8SDeploymentName: 'other-app-v2',
    serviceName: 'other-app-v2-svc'
  }, mockCtx)

  await setTimeout(150)

  assert.strictEqual(store[0].status, 'expired')
  assert.strictEqual(store[2].status, 'draining')
})
