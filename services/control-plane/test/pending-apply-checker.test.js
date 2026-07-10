'use strict'

const { setTimeout } = require('node:timers/promises')
const assert = require('node:assert/strict')
const { test } = require('node:test')
const fastify = require('fastify')
const fp = require('fastify-plugin')
const versionRegistryPlugin = require('../plugins/version-registry')
const gatewayPlugin = require('../plugins/gateway')
const skewPolicyPlugin = require('../plugins/skew-policy')
const actuationPolicyPlugin = require('../plugins/actuation-policy')
const versionCleanupPlugin = require('../plugins/version-cleanup')
const pendingApplyCheckerPlugin = require('../plugins/pending-apply-checker')

function buildApp (opts = {}) {
  const app = fastify({ logger: false })
  const store = opts.store || []
  const policyStore = opts.policyStore || []
  let idCounter = store.length
  const leaderCallbacks = []
  const calls = { getHTTPRoute: 0, getMachines: 0 }

  app.register(fp(async (app) => {
    app.decorate('env', {
      PLT_FEATURE_SKEW_PROTECTION: 'true',
      PLT_SKEW_CONFIRM_INTERVAL_MS: opts.confirmIntervalMs || 30,
      PLT_SKEW_COOKIE_MAX_AGE: 43200,
      PLT_SKEW_AUTO_CLEANUP: false,
      PLT_SCALER_URL: 'http://localhost:0'
    })
  }, { name: 'env' }))

  app.decorate('emitUpdate', async () => {})

  app.register(fp(async (app) => {
    app.decorate('onBecomeLeader', (fn) => { leaderCallbacks.push(fn) })
    app.decorate('onLoseLeadership', () => {})
  }, { name: 'leader', dependencies: ['env'] }))

  app.register(fp(async (app) => {
    app.decorate('platformatic', {
      db: { tx: async (fn) => fn({ query: async () => {} }) },
      sql: () => {},
      entities: {
        versionRegistry: {
          find: async ({ where }) => store.filter(row => {
            for (const [key, cond] of Object.entries(where)) {
              if (cond.eq !== undefined && row[key] !== cond.eq) return false
              if (cond.neq !== undefined && row[key] === cond.neq) return false
              if (cond.in !== undefined && !cond.in.includes(row[key])) return false
            }
            return true
          }),
          save: async ({ input }) => {
            if (input.id) {
              const idx = store.findIndex(r => r.id === input.id)
              if (idx !== -1) { store[idx] = { ...store[idx], ...input }; return store[idx] }
            }
            const row = { id: String(++idCounter), ...input }
            store.push(row)
            return row
          }
        },
        deployment: { save: async ({ input }) => input },
        skewProtectionPolicy: {
          find: async ({ where }) => policyStore.filter(row => {
            for (const [key, cond] of Object.entries(where)) {
              if (cond.eq !== undefined && row[key] !== cond.eq) return false
            }
            return true
          }),
          save: async ({ input }) => input
        }
      }
    })
  }, { name: 'platformatic-db' }))

  app.register(fp(async (app) => {
    app.decorate('machinist', {
      listGateways: async () => [{ metadata: { name: 'platformatic' } }],
      applyHTTPRoute: async (ns, r) => r,
      getMachines: async () => { calls.getMachines++; return opts.machines ?? [] },
      getHTTPRoute: async () => { calls.getHTTPRoute++; return opts.liveRoute ?? null },
      updateControllerReplicas: async () => ({}),
      deleteController: async () => ({}),
      deleteService: async () => ({})
    })
  }, { name: 'machinist', dependencies: ['env'] }))

  app.register(actuationPolicyPlugin)
  app.register(skewPolicyPlugin)
  app.register(versionRegistryPlugin)
  app.register(gatewayPlugin)
  app.register(versionCleanupPlugin)
  app.register(pendingApplyCheckerPlugin)

  app.addHook('onReady', async () => {
    if (app.disableScaling) app.disableScaling = async () => ({ success: true })
  })

  return { app, store, calls, triggerLeader: async () => { for (const fn of leaderCallbacks) await fn() } }
}

function version (over = {}) {
  return {
    applicationId: 'app-1',
    deploymentId: 'dep-1',
    appLabel: 'my-app',
    versionLabel: 'v1',
    controllerName: 'my-app-v1',
    serviceName: 'my-app-v1-svc',
    servicePort: 3042,
    namespace: 'platformatic',
    pathPrefix: '/my-app',
    hostname: null,
    status: 'active',
    ...over
  }
}

function acceptedRoute (serviceName) {
  return {
    spec: { rules: [{ matches: [{ path: { type: 'PathPrefix', value: '/my-app' } }], backendRefs: [{ name: serviceName, port: 3042 }] }] },
    status: { parents: [{ conditions: [{ type: 'Accepted', status: 'True' }] }] }
  }
}

// The checker confirms via the live route only in advise mode; observe/manage
// gate on pod readiness instead. These tests exercise the advise path.
function advisePolicy (applicationId) {
  return { id: `adv-${applicationId}`, applicationId, enabled: true, mode: 'advise', requiresApproval: false }
}

test('confirms a pending-apply version once pods + accepted route are live', async (t) => {
  const store = [
    version({ id: '1', versionLabel: 'v1', status: 'active' }),
    version({ id: '2', versionLabel: 'v2', controllerName: 'my-app-v2', serviceName: 'my-app-v2-svc', status: 'pending-apply' })
  ]
  const { app, triggerLeader } = buildApp({
    store,
    policyStore: [advisePolicy('app-1')],
    machines: [{ id: 'm1' }],
    liveRoute: acceptedRoute('my-app-v2-svc')
  })
  await app.ready()
  t.after(() => app.close())

  await triggerLeader()
  await setTimeout(120)

  assert.strictEqual(store[1].status, 'active') // v2 confirmed
  assert.strictEqual(store[0].status, 'draining') // v1 demoted
})

test('leaves pending-apply untouched while the route is not yet Accepted', async (t) => {
  const store = [
    version({ id: '1', versionLabel: 'v1', status: 'active' }),
    version({ id: '2', versionLabel: 'v2', controllerName: 'my-app-v2', serviceName: 'my-app-v2-svc', status: 'pending-apply' })
  ]
  const notAccepted = {
    spec: { rules: [{ matches: [{ path: {} }], backendRefs: [{ name: 'my-app-v2-svc', port: 3042 }] }] },
    status: { parents: [{ conditions: [{ type: 'Accepted', status: 'False' }] }] }
  }
  const { app, store: s, calls, triggerLeader } = buildApp({ store, policyStore: [advisePolicy('app-1')], machines: [{ id: 'm1' }], liveRoute: notAccepted })
  await app.ready()
  t.after(() => app.close())

  await triggerLeader()
  await setTimeout(120)

  assert.strictEqual(s[1].status, 'pending-apply') // still waiting
  assert.strictEqual(s[0].status, 'active') // v1 unchanged
  assert.ok(calls.getHTTPRoute > 0, 'polled the gateway route')
})

test('observe mode: confirms a pending-apply version once its pods are Ready', async (t) => {
  const store = [
    version({ id: '1', versionLabel: 'v1', status: 'active' }),
    version({ id: '2', versionLabel: 'v2', controllerName: 'my-app-v2', serviceName: 'my-app-v2-svc', status: 'pending-apply' })
  ]
  // observe: no advise policy, so gate on pod readiness, not the live route
  const { app, calls, triggerLeader } = buildApp({ store, machines: [{ id: 'm1', ready: true }] })
  await app.ready()
  t.after(() => app.close())

  await triggerLeader()
  await setTimeout(120)

  assert.strictEqual(store[1].status, 'active') // v2 confirmed on readiness
  assert.strictEqual(store[0].status, 'draining') // v1 demoted
  assert.strictEqual(calls.getHTTPRoute, 0) // observe never polls the route
})

test('observe mode: leaves pending-apply while its pods are not Ready', async (t) => {
  const store = [
    version({ id: '1', versionLabel: 'v1', status: 'active' }),
    version({ id: '2', versionLabel: 'v2', controllerName: 'my-app-v2', serviceName: 'my-app-v2-svc', status: 'pending-apply' })
  ]
  const { app, triggerLeader } = buildApp({ store, machines: [{ id: 'm1', ready: false }] })
  await app.ready()
  t.after(() => app.close())

  await triggerLeader()
  await setTimeout(120)

  assert.strictEqual(store[1].status, 'pending-apply') // still waiting for readiness
  assert.strictEqual(store[0].status, 'active') // v1 unchanged
})

test('does nothing when there are no pending-apply versions', async (t) => {
  const store = [version({ id: '1', versionLabel: 'v1', status: 'active' })]
  const { app, calls, triggerLeader } = buildApp({ store, machines: [{ id: 'm1' }], liveRoute: acceptedRoute('my-app-v1-svc') })
  await app.ready()
  t.after(() => app.close())

  await triggerLeader()
  await setTimeout(120)

  assert.strictEqual(store[0].status, 'active')
  assert.strictEqual(calls.getHTTPRoute, 0) // never bothered the gateway
})
