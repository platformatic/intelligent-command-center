'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createServer } = require('node:http')
const fastify = require('fastify')
const fp = require('fastify-plugin')
const versionRegistryPlugin = require('../plugins/version-registry')
const gatewayPlugin = require('../plugins/gateway')
const skewPolicyPlugin = require('../plugins/skew-policy')
const actuationPolicyPlugin = require('../plugins/actuation-policy')
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
      getMachines: async (namespace, labels, ctx) => opts.machines ?? [],
      getHTTPRoute: async (namespace, name, ctx) => opts.liveRoute ?? null,
      updateControllerReplicas: async (namespace, controllerId, replicas, providerMetadata, ctx) => {
        calls.updateController.push({ controllerId, namespace, replicas, providerMetadata })
        if (opts.updateControllerFails) throw new Error('updateController failed')
        return { name: controllerId, replicas, labels: {}, providerMetadata }
      },
      deleteController: async (namespace, name, providerMetadata, ctx) => {
        calls.deleteDeployment.push({ namespace, name, providerMetadata })
        if (opts.deleteDeploymentFails) throw new Error('deleteController failed')
        return { status: 'Success' }
      },
      deleteService: async (namespace, name, ctx) => {
        calls.deleteService.push({ namespace, name })
        if (opts.deleteServiceFails) throw new Error('deleteService failed')
        return { status: 'Success' }
      }
    })
  }, { name: 'machinist', dependencies: ['env'] }))

  app.register(actuationPolicyPlugin)
  app.register(skewPolicyPlugin)
  app.register(versionRegistryPlugin)
  app.register(gatewayPlugin)
  app.register(versionCleanupPlugin)

  app.addHook('onReady', async () => {
    if (app.disableScaling) {
      app.disableScaling = async (namespace, controllerName) => {
        calls.disableScaling.push({ namespace, controllerName })
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
  controllerName: 'my-app-v1',
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
    controllerName: 'my-app-v2',
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
  assert.strictEqual(calls.disableScaling[0].controllerName, 'my-app-v1')

  // Deployment was scaled to 0
  assert.strictEqual(calls.updateController.length, 1)
  assert.strictEqual(calls.updateController[0].controllerId, 'my-app-v1')
  assert.strictEqual(calls.updateController[0].replicas, 0)
  assert.strictEqual(calls.updateController[0].namespace, 'platformatic')
})

function defaultRule (route) {
  return route.spec.rules.find(r => !(r.matches?.[0]?.headers?.length))
}

test('planVersionActuation returns an expire plan (route + teardown) for a draining version', async (t) => {
  const { app, store } = buildApp()
  await app.ready()
  t.after(() => app.close())

  store.push(
    { id: '1', applicationId: 'app-1', appLabel: 'my-app', versionLabel: 'v1', status: 'active', serviceName: 'my-app-v1-svc', servicePort: 3042, namespace: 'platformatic', pathPrefix: '/my-app', hostname: null, controllerName: 'my-app-v1' },
    { id: '2', applicationId: 'app-1', appLabel: 'my-app', versionLabel: 'v2', status: 'draining', serviceName: 'my-app-v2-svc', servicePort: 3042, namespace: 'platformatic', pathPrefix: '/my-app', hostname: null, controllerName: 'my-app-v2' }
  )

  const plan = await app.planVersionActuation('app-1', 'v2', mockCtx)
  assert.strictEqual(plan.intent, 'expire')

  const routeStep = plan.steps.find(s => s.kind === 'HTTPRoute')
  assert.ok(routeStep, 'has an HTTPRoute step')
  // The route keeps the active v1 as default and drops v2's pins entirely.
  assert.strictEqual(defaultRule(routeStep.manifest).backendRefs[0].name, 'my-app-v1-svc')
  assert.ok(!routeStep.manifest.spec.rules.some(r => r.backendRefs[0].name === 'my-app-v2-svc'))

  const scaleStep = plan.steps.find(s => s.kind === 'Deployment' && s.action === 'scale')
  assert.ok(scaleStep, 'has a workload scale-down step')
  assert.match(scaleStep.command, /scale deployment\/my-app-v2 --replicas=0/)
})

test('planVersionActuation returns an activate plan for a pending-apply version', async (t) => {
  const { app, store } = buildApp()
  await app.ready()
  t.after(() => app.close())

  store.push(
    { id: '1', applicationId: 'app-1', appLabel: 'my-app', versionLabel: 'v1', status: 'active', serviceName: 'my-app-v1-svc', servicePort: 3042, namespace: 'platformatic', pathPrefix: '/my-app', hostname: null, controllerName: 'my-app-v1' },
    { id: '2', applicationId: 'app-1', appLabel: 'my-app', versionLabel: 'v2', status: 'pending-apply', serviceName: 'my-app-v2-svc', servicePort: 3042, namespace: 'platformatic', pathPrefix: '/my-app', hostname: null, controllerName: 'my-app-v2' }
  )

  const plan = await app.planVersionActuation('app-1', 'v2', mockCtx)
  assert.strictEqual(plan.intent, 'activate')

  const routeStep = plan.steps.find(s => s.kind === 'HTTPRoute')
  assert.ok(routeStep, 'has an HTTPRoute step')
  // The activate plan routes v2 as the new default backend.
  assert.strictEqual(defaultRule(routeStep.manifest).backendRefs[0].name, 'my-app-v2-svc')
})

test('planVersionActuation returns an expire plan for a pending-expire version', async (t) => {
  const { app, store } = buildApp()
  await app.ready()
  t.after(() => app.close())

  store.push(
    { id: '1', applicationId: 'app-1', appLabel: 'my-app', versionLabel: 'v1', status: 'active', serviceName: 'my-app-v1-svc', servicePort: 3042, namespace: 'platformatic', pathPrefix: '/my-app', hostname: null, controllerName: 'my-app-v1' },
    { id: '2', applicationId: 'app-1', appLabel: 'my-app', versionLabel: 'v2', status: 'pending-expire', serviceName: 'my-app-v2-svc', servicePort: 3042, namespace: 'platformatic', pathPrefix: '/my-app', hostname: null, controllerName: 'my-app-v2' }
  )

  const plan = await app.planVersionActuation('app-1', 'v2', mockCtx)
  assert.strictEqual(plan.intent, 'expire')
  assert.ok(plan.steps.find(s => s.kind === 'HTTPRoute'), 'has an HTTPRoute step')
  const scaleStep = plan.steps.find(s => s.kind === 'Deployment' && s.action === 'scale')
  assert.match(scaleStep.command, /scale deployment\/my-app-v2 --replicas=0/)
})

test('confirmTeardown flips a pending-expire version to expired once its pods are gone', async (t) => {
  // No machines reported for the version -> teardown observed.
  const { app, store } = buildApp({ machines: [] })
  await app.ready()
  t.after(() => app.close())

  store.push(
    { id: '1', applicationId: 'app-1', appLabel: 'my-app', versionLabel: 'v1', status: 'active', deploymentId: 'dep-1', serviceName: 'my-app-v1-svc', servicePort: 3042, namespace: 'platformatic', pathPrefix: '/my-app', hostname: null, controllerName: 'my-app-v1' },
    { id: '2', applicationId: 'app-1', appLabel: 'my-app', versionLabel: 'v2', status: 'pending-expire', deploymentId: 'dep-2', serviceName: 'my-app-v2-svc', servicePort: 3042, namespace: 'platformatic', pathPrefix: '/my-app', hostname: null, controllerName: 'my-app-v2' }
  )

  const result = await app.confirmTeardown(store[1], mockCtx)
  assert.strictEqual(result.confirmed, true)
  assert.strictEqual(store[1].status, 'expired')
})

test('planVersionActuation returns no steps for an active version', async (t) => {
  const { app, store } = buildApp()
  await app.ready()
  t.after(() => app.close())

  store.push(
    { id: '1', applicationId: 'app-1', appLabel: 'my-app', versionLabel: 'v1', status: 'active', serviceName: 'my-app-v1-svc', servicePort: 3042, namespace: 'platformatic', pathPrefix: '/my-app', hostname: null, controllerName: 'my-app-v1' }
  )

  const plan = await app.planVersionActuation('app-1', 'v1', mockCtx)
  assert.strictEqual(plan.intent, 'none')
  assert.strictEqual(plan.steps.length, 0)
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
    controllerName: 'my-app-v2',
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
    controllerName: 'my-app-v2',
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
    controllerName: 'my-app-v2',
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
    controllerName: 'my-app-v2',
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
    controllerName: 'my-app-v2',
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
    controllerName: 'my-app-v2',
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
    controllerName: 'my-app-v2',
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
    controllerName: 'my-app-v2',
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
    controllerName: 'my-app-v2',
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
    controllerName: 'my-app-v2',
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
    controllerName: 'my-app-v2',
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

function approvalPolicy (applicationId) {
  return {
    id: `p-${applicationId}`,
    applicationId,
    enabled: true,
    mode: null,
    requiresApproval: true,
    httpGracePeriodMs: null,
    httpMaxAliveMs: null,
    workflowGracePeriodMs: null,
    workflowMaxAliveMs: null,
    maxAgeS: null,
    maxVersions: null,
    cookieName: null,
    autoCleanup: null
  }
}

test('approveAndApply flips the route to the staged version and drains the previous active', async (t) => {
  const policyStore = []
  const { app, store, calls } = buildApp({ policyStore })
  await app.ready()
  t.after(() => app.close())

  // v1 deploys with no approval gate -> active.
  await app.registerVersion(baseOpts, mockCtx)

  // Turn approval on for the app; the next version stages instead of activating.
  policyStore.push(approvalPolicy('app-1'))

  const reg = await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    controllerName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx)

  // v2 is staged and off client traffic; v1 keeps serving.
  assert.strictEqual(reg.staged, true)
  assert.strictEqual(store[1].status, 'staged')
  assert.strictEqual(store[0].status, 'active')
  assert.deepStrictEqual(reg.stagedVersions.map(v => v.versionId), ['v2'])
  assert.strictEqual(reg.activeVersion.versionId, 'v1')

  // Approve flips the active route: v2 -> active, v1 -> draining.
  const result = await app.approveAndApply('my-app', 'v2', mockCtx)
  assert.strictEqual(result.approved, true)
  assert.strictEqual(store[1].status, 'active')
  assert.strictEqual(store[0].status, 'draining')

  assert.strictEqual(calls.applyHTTPRoute.length, 1)
  const route = calls.applyHTTPRoute[0].httpRoute
  // Default rule now serves v2; v1 is a draining backend; v2 has no preview rule.
  const defaultRule = route.spec.rules[route.spec.rules.length - 1]
  assert.strictEqual(defaultRule.backendRefs[0].name, 'my-app-v2-svc')
  const hasV2Preview = route.spec.rules.some(r =>
    r.matches[0].headers?.[0]?.name === 'x-deployment-id' &&
    r.matches[0].headers[0].value === 'v2')
  assert.strictEqual(hasV2Preview, false)
})

test('rejectAndCleanup drops the staged preview rule and scales the deployment to 0', async (t) => {
  const policyStore = []
  const { app, store, calls } = buildApp({ policyStore })
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx) // v1 active
  policyStore.push(approvalPolicy('app-1'))
  await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    controllerName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx) // v2 staged

  const result = await app.rejectAndCleanup('my-app', 'v2', mockCtx)
  assert.strictEqual(result.rejected, true)
  assert.strictEqual(store[1].status, 'expired')
  assert.strictEqual(store[0].status, 'active') // v1 untouched

  // Route rebuilt with only the v1 default rule — the v2 preview is gone.
  assert.strictEqual(calls.applyHTTPRoute.length, 1)
  const route = calls.applyHTTPRoute[0].httpRoute
  assert.strictEqual(route.spec.rules.length, 1)
  assert.strictEqual(route.spec.rules[0].backendRefs[0].name, 'my-app-v1-svc')

  // v2's deployment was torn down.
  assert.strictEqual(calls.updateController.length, 1)
  assert.strictEqual(calls.updateController[0].controllerId, 'my-app-v2')
  assert.strictEqual(calls.updateController[0].replicas, 0)
})

function advisePolicy (applicationId) {
  return {
    id: `adv-${applicationId}`,
    applicationId,
    enabled: true,
    mode: 'advise',
    requiresApproval: false,
    httpGracePeriodMs: null,
    httpMaxAliveMs: null,
    workflowGracePeriodMs: null,
    workflowMaxAliveMs: null,
    maxAgeS: null,
    maxVersions: null,
    cookieName: null,
    autoCleanup: null
  }
}

test('advise mode: registration leaves the new version pending-apply, prior active untouched', async (t) => {
  const policyStore = []
  const { app, store } = buildApp({ policyStore })
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx) // observe -> v1 active
  policyStore.push(advisePolicy('app-1'))

  const reg = await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    controllerName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx)

  assert.strictEqual(reg.pendingApply, true)
  assert.strictEqual(store[1].status, 'pending-apply') // v2 not live
  assert.strictEqual(store[0].status, 'active') // v1 still serving, not demoted
})

test('advise mode: promote returns a routing plan and mutates nothing', async (t) => {
  const policyStore = []
  const { app, store, calls } = buildApp({ policyStore })
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx) // v1 active
  await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    controllerName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx) // v2 active, v1 draining
  policyStore.push(advisePolicy('app-1'))

  const result = await app.promoteAndApply('my-app', 'v1', mockCtx)

  assert.strictEqual(result.pendingApply, true)
  assert.strictEqual(store[0].status, 'pending-apply') // v1 intent recorded
  assert.strictEqual(store[1].status, 'active') // v2 not demoted (no actuation)
  assert.strictEqual(calls.applyHTTPRoute.length, 0) // advise: route not applied

  assert.ok(result.plan.length >= 1)
  assert.strictEqual(result.plan[0].kind, 'HTTPRoute')
  assert.ok(result.plan[0].manifest, 'plan carries the desired manifest')
  assert.ok(result.plan[0].command, 'plan carries a command')
  // The planned route routes default traffic to the promoted version.
  const rules = result.plan[0].manifest.spec.rules
  assert.strictEqual(rules[rules.length - 1].backendRefs[0].name, 'my-app-v1-svc')
})

test('advise mode: confirmActivation flips pending-apply to active and demotes the old active', async (t) => {
  const policyStore = []
  const { app, store, calls } = buildApp({ policyStore })
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx) // v1 active
  await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    controllerName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx) // v2 active, v1 draining
  policyStore.push(advisePolicy('app-1'))

  await app.promoteAndApply('my-app', 'v1', mockCtx) // v1 -> pending-apply
  assert.strictEqual(store[0].status, 'pending-apply')

  const conf = await app.confirmActivation('my-app', 'v1', mockCtx)
  assert.strictEqual(conf.confirmed, true)
  assert.strictEqual(store[0].status, 'active') // v1 now live
  assert.strictEqual(store[1].status, 'draining') // v2 demoted
  // Confirmation is a DB transition; the registry never calls the gateway.
  assert.strictEqual(calls.applyHTTPRoute.length, 0)
})

test('advise mode: expire a routed version -> pending-expire with a teardown plan, no mutation', async (t) => {
  const policyStore = []
  const liveRoute = acceptedRoute('my-app-v1-svc') // v1 is still referenced in the live route
  const { app, store, calls } = buildApp({ policyStore, liveRoute })
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx) // v1 active
  await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    controllerName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx) // v2 active, v1 draining
  policyStore.push(advisePolicy('app-1'))

  const result = await app.expireAndCleanup(store[0], mockCtx) // expire draining v1

  // Advise never actuates: it records intent (pending-expire) and hands back the
  // plan; ICC flips to expired later once it observes the teardown.
  assert.strictEqual(result.expired, false)
  assert.strictEqual(result.pendingExpire, true)
  assert.strictEqual(store[0].status, 'pending-expire')
  assert.strictEqual(calls.applyHTTPRoute.length, 0) // no route mutation (customer's cluster)
  assert.strictEqual(calls.updateController.length, 0) // no scale-down (customer's cluster)
  assert.strictEqual(calls.disableScaling.length, 1) // ICC disables its OWN scaler so the customer's teardown sticks

  assert.ok(result.plan.some(s => s.kind === 'HTTPRoute'), 'plans the route rebuild')
  const scale = result.plan.find(s => s.kind === 'Deployment' && s.action === 'scale')
  assert.ok(scale, 'plans the scale-to-zero')
  assert.ok(scale.command.includes('--replicas=0'))
})

test('advise mode: expire an unrouted version -> expired immediately, scale-only plan', async (t) => {
  const policyStore = []
  // No live route references the version, so there is nothing to observe.
  const { app, store, calls } = buildApp({ policyStore, liveRoute: null })
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx) // v1 active
  await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    controllerName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx) // v2 active, v1 draining
  policyStore.push(advisePolicy('app-1'))

  const result = await app.expireAndCleanup(store[0], mockCtx) // expire draining v1 (not in route)

  assert.strictEqual(result.expired, true) // nothing to observe -> expired now
  assert.strictEqual(store[0].status, 'expired')
  assert.strictEqual(calls.applyHTTPRoute.length, 0) // still no cluster mutation
  assert.strictEqual(calls.updateController.length, 0)
  assert.strictEqual(calls.disableScaling.length, 1) // ICC still disables its own scaler so cleanup sticks
  assert.ok(!result.plan.some(s => s.kind === 'HTTPRoute'), 'no route step when nothing routes to it')
  const scale = result.plan.find(s => s.kind === 'Deployment' && s.action === 'scale')
  assert.ok(scale, 'still shows the cleanup scale-to-zero')
})

function acceptedRoute (serviceName) {
  return {
    spec: {
      rules: [{
        matches: [{ path: { type: 'PathPrefix', value: '/my-app' } }],
        backendRefs: [{ name: serviceName, port: 3042 }]
      }]
    },
    status: { parents: [{ conditions: [{ type: 'Accepted', status: 'True' }] }] }
  }
}

test('advise mode: confirmPendingApply activates once pods are up and the live route is accepted', async (t) => {
  const policyStore = []
  const liveRoute = acceptedRoute('my-app-v1-svc')
  const { app, store } = buildApp({ policyStore, machines: [{ id: 'm1' }], liveRoute })
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx) // v1 active
  await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    controllerName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx) // v2 active, v1 draining
  policyStore.push(advisePolicy('app-1'))

  await app.promoteAndApply('my-app', 'v1', mockCtx) // v1 -> pending-apply
  assert.strictEqual(store[0].status, 'pending-apply')

  const conf = await app.confirmPendingApply(store[0], mockCtx)
  assert.strictEqual(conf.podsReady, true)
  assert.strictEqual(conf.routeReady, true)
  assert.strictEqual(conf.confirmed, true)
  assert.strictEqual(store[0].status, 'active') // v1 now live
  assert.strictEqual(store[1].status, 'draining') // v2 demoted
})

test('advise mode: confirmPendingApply is a no-op while pods are not registered', async (t) => {
  const policyStore = []
  const liveRoute = {
    spec: { rules: [{ matches: [{ path: {} }], backendRefs: [{ name: 'my-app-v1-svc', port: 3042 }] }] }
  }
  const { app, store } = buildApp({ policyStore, machines: [], liveRoute }) // no pods yet
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx)
  await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    controllerName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx)
  policyStore.push(advisePolicy('app-1'))

  await app.promoteAndApply('my-app', 'v1', mockCtx)
  const conf = await app.confirmPendingApply(store[0], mockCtx)

  assert.strictEqual(conf.confirmed, false)
  assert.strictEqual(conf.podsReady, false)
  assert.strictEqual(store[0].status, 'pending-apply') // still waiting
})

test('advise mode: confirmPendingApply waits while the route is present but not yet Accepted', async (t) => {
  const policyStore = []
  // Route serves v1 but the gateway has not set Accepted:True yet (propagating).
  const liveRoute = {
    spec: { rules: [{ matches: [{ path: {} }], backendRefs: [{ name: 'my-app-v1-svc', port: 3042 }] }] },
    status: { parents: [{ conditions: [{ type: 'Accepted', status: 'False' }] }] }
  }
  const { app, store } = buildApp({ policyStore, machines: [{ id: 'm1' }], liveRoute })
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx)
  await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    controllerName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx)
  policyStore.push(advisePolicy('app-1'))

  await app.promoteAndApply('my-app', 'v1', mockCtx)
  const conf = await app.confirmPendingApply(store[0], mockCtx)

  assert.strictEqual(conf.podsReady, true)
  assert.strictEqual(conf.routeReady, false) // gateway not accepted yet
  assert.strictEqual(conf.confirmed, false)
  assert.strictEqual(store[0].status, 'pending-apply') // keeps waiting
})

test('observe mode still actuates promote (regression guard for the advise fork)', async (t) => {
  const { app, store, calls } = buildApp() // no policy -> observe
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx)
  await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    controllerName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx) // v2 active, v1 draining

  const result = await app.promoteAndApply('my-app', 'v1', mockCtx)
  assert.strictEqual(result.promoted, true)
  assert.strictEqual(result.pendingApply, false)
  assert.strictEqual(store[0].status, 'active') // v1 promoted live
  assert.strictEqual(calls.applyHTTPRoute.length, 1) // route applied
})

test('applyVersioningDisable force-expires draining versions (disable transition)', async (t) => {
  const { app, store, calls } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx) // v1 active
  await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    controllerName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx) // v2 active, v1 draining

  const result = await app.applyVersioningDisable('app-1', mockCtx)

  assert.deepStrictEqual(result.expired, ['v1'])
  assert.strictEqual(store[0].status, 'expired') // draining v1 force-expired
  assert.strictEqual(store[1].status, 'active') // active v2 keeps serving
  assert.ok(calls.updateController.length >= 1) // v1 scaled to 0
})

test('applyVersioningDisable is a no-op when there are no draining versions', async (t) => {
  const { app, calls } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx) // v1 active, nothing draining

  const result = await app.applyVersioningDisable('app-1', mockCtx)

  assert.deepStrictEqual(result.expired, [])
  assert.strictEqual(calls.updateController.length, 0)
})
