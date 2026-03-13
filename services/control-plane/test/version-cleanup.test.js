'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createServer } = require('node:http')
const fastify = require('fastify')
const fp = require('fastify-plugin')
const versionRegistryPlugin = require('../plugins/version-registry')
const gatewayPlugin = require('../plugins/gateway')
const skewPolicyPlugin = require('../plugins/skew-policy')
const versionCleanupPlugin = require('../plugins/version-cleanup')

function buildApp (opts = {}) {
  const app = fastify({ logger: false })
  const store = []
  const deploymentStore = []
  const policyStore = opts.policyStore || []
  let idCounter = 0
  let policyIdCounter = 0
  const calls = {
    applyHTTPRoute: [],
    updateController: [],
    disableScaling: [],
    deleteDeployment: [],
    deleteService: []
  }

  app.register(fp(async (app) => {
    app.decorate('env', {
      PLT_FEATURE_SKEW_PROTECTION: 'true',
      PLT_SKEW_AUTO_CLEANUP: !!opts.autoCleanup,
      PLT_SKEW_COOKIE_MAX_AGE: 43200,
      PLT_SKEW_HTTP_GRACE_PERIOD_MS: 1800000,
      PLT_SKEW_HTTP_MAX_ALIVE_MS: 86400000,
      PLT_SKEW_WORKFLOW_GRACE_PERIOD_MS: 3600000,
      PLT_SKEW_WORKFLOW_MAX_ALIVE_MS: 259200000,
      PLT_SCALER_URL: 'http://localhost:0',
      PLT_WORKFLOW_URL: opts.workflowUrl
    })
  }, { name: 'env' }))

  app.decorate('emitUpdate', async () => {})

  app.register(fp(async (app) => {
    app.decorate('platformatic', {
      db: { tx: async (fn) => fn({ query: async () => {} }) },
      sql: () => {},
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
            const row = { id: String(++idCounter), ...input }
            store.push(row)
            return row
          }
        },
        deployment: {
          save: async ({ input }) => {
            const idx = deploymentStore.findIndex(r => r.id === input.id)
            if (idx !== -1) {
              deploymentStore[idx] = { ...deploymentStore[idx], ...input }
              return deploymentStore[idx]
            }
            const row = { ...input }
            deploymentStore.push(row)
            return row
          }
        },
        skewProtectionPolicy: {
          find: async ({ where }) => {
            return policyStore.filter(row => {
              for (const [key, condition] of Object.entries(where)) {
                if (condition.eq !== undefined && row[key] !== condition.eq) return false
              }
              return true
            })
          },
          save: async ({ input }) => {
            if (input.id) {
              const idx = policyStore.findIndex(r => r.id === input.id)
              if (idx !== -1) {
                policyStore[idx] = { ...policyStore[idx], ...input }
                return policyStore[idx]
              }
            }
            const row = { id: String(++policyIdCounter), ...input }
            policyStore.push(row)
            return row
          }
        }
      }
    })
  }, { name: 'platformatic-db' }))

  app.register(fp(async (app) => {
    app.decorate('machinist', {
      listGateways: async () => opts.gateways || [{
        metadata: { name: 'platformatic' }
      }],
      applyHTTPRoute: async (namespace, httpRoute, ctx) => {
        calls.applyHTTPRoute.push({ namespace, httpRoute })
        if (opts.applyHTTPRouteFails) throw new Error('HTTPRoute apply failed')
        return httpRoute
      },
      updateController: async (controllerId, namespace, apiVersion, kind, replicas, ctx) => {
        calls.updateController.push({ controllerId, namespace, apiVersion, kind, replicas })
        if (opts.updateControllerFails) throw new Error('updateController failed')
        return { spec: { replicas } }
      },
      deleteDeployment: async (namespace, name, ctx) => {
        calls.deleteDeployment.push({ namespace, name })
        if (opts.deleteDeploymentFails) throw new Error('deleteDeployment failed')
        return { status: 'Success' }
      },
      deleteService: async (namespace, name, ctx) => {
        calls.deleteService.push({ namespace, name })
        if (opts.deleteServiceFails) throw new Error('deleteService failed')
        return { status: 'Success' }
      }
    })
  }, { name: 'machinist', dependencies: ['env'] }))

  app.register(skewPolicyPlugin)
  app.register(versionRegistryPlugin)
  app.register(gatewayPlugin)
  app.register(versionCleanupPlugin)

  app.addHook('onReady', async () => {
    if (app.disableScaling) {
      app.disableScaling = async (namespace, k8sDeploymentName) => {
        calls.disableScaling.push({ namespace, k8sDeploymentName })
        if (opts.disableScalingFails) throw new Error('disableScaling failed')
        return { success: true }
      }
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

test('expireAndCleanup should expire version, rebuild HTTPRoute, and scale to 0', async (t) => {
  const { app, store, calls } = buildApp()
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

  // v1 is now draining
  const version = store[0]
  const result = await app.expireAndCleanup(version, mockCtx)

  assert.strictEqual(result.expired, true)
  assert.strictEqual(store[0].status, 'expired')

  // HTTPRoute was rebuilt without the expired version
  assert.strictEqual(calls.applyHTTPRoute.length, 1)
  assert.strictEqual(calls.applyHTTPRoute[0].namespace, 'platformatic')
  const httpRoute = calls.applyHTTPRoute[0].httpRoute
  // Only 1 rule: the default production rule for v2 (no draining rules for v1)
  assert.strictEqual(httpRoute.spec.rules.length, 1)
  assert.strictEqual(httpRoute.spec.rules[0].backendRefs[0].name, 'my-app-v2-svc')

  // Scaling was disabled before scale-down
  assert.strictEqual(calls.disableScaling.length, 1)
  assert.strictEqual(calls.disableScaling[0].namespace, 'platformatic')
  assert.strictEqual(calls.disableScaling[0].k8sDeploymentName, 'my-app-v1')

  // Deployment was scaled to 0
  assert.strictEqual(calls.updateController.length, 1)
  assert.strictEqual(calls.updateController[0].controllerId, 'my-app-v1')
  assert.strictEqual(calls.updateController[0].replicas, 0)
  assert.strictEqual(calls.updateController[0].kind, 'Deployment')
})

test('expireAndCleanup should skip cleanup when version is not draining', async (t) => {
  const { app, store, calls } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx)

  // v1 is active — expire should fail gracefully
  const version = store[0]
  const result = await app.expireAndCleanup(version, mockCtx)

  assert.strictEqual(result.expired, false)
  assert.strictEqual(calls.applyHTTPRoute.length, 0)
  assert.strictEqual(calls.disableScaling.length, 0)
  assert.strictEqual(calls.updateController.length, 0)
})

test('expireAndCleanup should still scale to 0 when HTTPRoute update fails', async (t) => {
  const { app, store, calls } = buildApp({ applyHTTPRouteFails: true })
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

  const version = store[0]
  const result = await app.expireAndCleanup(version, mockCtx)

  assert.strictEqual(result.expired, true)
  // HTTPRoute call was made but failed — caught internally
  assert.strictEqual(calls.applyHTTPRoute.length, 1)
  // Scale to 0 still happened
  assert.strictEqual(calls.updateController.length, 1)
  assert.strictEqual(calls.updateController[0].replicas, 0)
})

test('expireAndCleanup should still scale to 0 when disableScaling fails', async (t) => {
  const { app, store, calls } = buildApp({ disableScalingFails: true })
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

  const version = store[0]
  const result = await app.expireAndCleanup(version, mockCtx)

  assert.strictEqual(result.expired, true)
  assert.strictEqual(calls.disableScaling.length, 1)
  assert.strictEqual(calls.updateController.length, 1)
  assert.strictEqual(calls.updateController[0].replicas, 0)
})

test('expireAndCleanup should still mark expired when scale to 0 fails', async (t) => {
  const { app, store, calls } = buildApp({ updateControllerFails: true })
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

  const version = store[0]
  const result = await app.expireAndCleanup(version, mockCtx)

  assert.strictEqual(result.expired, true)
  assert.strictEqual(store[0].status, 'expired')
  // updateController was called but failed — caught internally
  assert.strictEqual(calls.updateController.length, 1)
})

test('expireAndCleanup should not delete resources when auto-cleanup is disabled', async (t) => {
  const { app, store, calls } = buildApp()
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

  const version = store[0]
  await app.expireAndCleanup(version, mockCtx)

  assert.strictEqual(calls.deleteDeployment.length, 0)
  assert.strictEqual(calls.deleteService.length, 0)
})

test('expireAndCleanup should delete Deployment and Service when auto-cleanup is enabled', async (t) => {
  const { app, store, calls } = buildApp({ autoCleanup: true })
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

  const version = store[0]
  const result = await app.expireAndCleanup(version, mockCtx)

  assert.strictEqual(result.expired, true)

  // Deployment was deleted
  assert.strictEqual(calls.deleteDeployment.length, 1)
  assert.strictEqual(calls.deleteDeployment[0].namespace, 'platformatic')
  assert.strictEqual(calls.deleteDeployment[0].name, 'my-app-v1')

  // Service was deleted
  assert.strictEqual(calls.deleteService.length, 1)
  assert.strictEqual(calls.deleteService[0].namespace, 'platformatic')
  assert.strictEqual(calls.deleteService[0].name, 'my-app-v1-svc')
})

test('expireAndCleanup should still delete Service when deleteDeployment fails', async (t) => {
  const { app, store, calls } = buildApp({ autoCleanup: true, deleteDeploymentFails: true })
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

  const version = store[0]
  const result = await app.expireAndCleanup(version, mockCtx)

  assert.strictEqual(result.expired, true)
  // deleteDeployment was called but failed — caught internally
  assert.strictEqual(calls.deleteDeployment.length, 1)
  // deleteService still happened
  assert.strictEqual(calls.deleteService.length, 1)
})

test('expireAndCleanup should still succeed when deleteService fails', async (t) => {
  const { app, store, calls } = buildApp({ autoCleanup: true, deleteServiceFails: true })
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

  const version = store[0]
  const result = await app.expireAndCleanup(version, mockCtx)

  assert.strictEqual(result.expired, true)
  assert.strictEqual(calls.deleteDeployment.length, 1)
  // deleteService was called but failed — caught internally
  assert.strictEqual(calls.deleteService.length, 1)
})

test('expireAndCleanup should use per-app autoCleanup policy', async (t) => {
  // Global autoCleanup is false, but per-app policy enables it
  const policyStore = [{
    id: 'p1',
    applicationId: 'app-1',
    httpGracePeriodMs: null,
    httpMaxAliveMs: null,
    workflowGracePeriodMs: null,
    workflowMaxAliveMs: null,
    maxAgeS: null,
    maxVersions: null,
    cookieName: null,
    autoCleanup: true
  }]

  const { app, store, calls } = buildApp({ autoCleanup: false, policyStore })
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

  const version = store[0]
  const result = await app.expireAndCleanup(version, mockCtx)

  assert.strictEqual(result.expired, true)
  // Per-app policy enabled autoCleanup, so resources should be deleted
  assert.strictEqual(calls.deleteDeployment.length, 1)
  assert.strictEqual(calls.deleteService.length, 1)
})

test('expireAndCleanup should call force-expire for workflow policy before cleanup', async (t) => {
  const workflowCalls = { expireCalls: 0 }
  const wfServer = createServer((req, res) => {
    if (req.method === 'POST' && req.url.includes('/expire')) {
      workflowCalls.expireCalls++
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
    } else {
      res.writeHead(404)
      res.end()
    }
  })
  await new Promise(resolve => wfServer.listen(0, resolve))
  const wfPort = wfServer.address().port
  t.after(() => wfServer.close())

  const { app, store, calls } = buildApp({ workflowUrl: `http://127.0.0.1:${wfPort}` })
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion({
    ...baseOpts,
    expirePolicy: 'workflow'
  }, mockCtx)
  await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    k8SDeploymentName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx)

  const version = store[0]

  const result = await app.expireAndCleanup(version, mockCtx)

  assert.strictEqual(result.expired, true)
  assert.strictEqual(workflowCalls.expireCalls, 1)
  assert.ok(calls.updateController.length > 0)
})

test('expireAndCleanup should not call force-expire for http-traffic policy', async (t) => {
  const workflowCalls = { expireCalls: 0 }
  const wfServer = createServer((req, res) => {
    if (req.method === 'POST' && req.url.includes('/expire')) {
      workflowCalls.expireCalls++
    }
    res.writeHead(200)
    res.end()
  })
  await new Promise(resolve => wfServer.listen(0, resolve))
  t.after(() => wfServer.close())

  const { app, store, calls } = buildApp()
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

  const version = store[0]
  const result = await app.expireAndCleanup(version, mockCtx)

  assert.strictEqual(result.expired, true)
  assert.strictEqual(workflowCalls.expireCalls, 0)
  assert.ok(calls.updateController.length > 0)
})

test('expireAndCleanup should still proceed when force-expire fails for workflow policy', async (t) => {
  const wfServer = createServer((req, res) => {
    res.writeHead(500)
    res.end('error')
  })
  await new Promise(resolve => wfServer.listen(0, resolve))
  const wfPort = wfServer.address().port
  t.after(() => wfServer.close())

  const { app, store, calls } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion({
    ...baseOpts,
    expirePolicy: 'workflow'
  }, mockCtx)
  await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    k8SDeploymentName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx)

  const version = store[0]
  version.serviceName = '127.0.0.1'
  version.namespace = ''
  version.servicePort = wfPort

  const result = await app.expireAndCleanup(version, mockCtx)

  // Should still expire even if force-expire call fails
  assert.strictEqual(result.expired, true)
  assert.ok(calls.updateController.length > 0)
})
