'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const fastify = require('fastify')
const fp = require('fastify-plugin')
const versionRegistryPlugin = require('../plugins/version-registry')
const skewPolicyPlugin = require('../plugins/skew-policy')
const actuationPolicyPlugin = require('../plugins/actuation-policy')

function buildApp (opts = {}) {
  const enabled = opts.enabled !== false
  const app = fastify({ logger: false })
  const store = []
  const deploymentStore = []
  const policyStore = opts.policyStore || []
  let idCounter = 0
  let policyIdCounter = 0
  app.register(fp(async (app) => {
    app.decorate('env', {
      PLT_FEATURE_SKEW_PROTECTION: enabled ? 'true' : '',
      PLT_SKEW_HTTP_GRACE_PERIOD_MS: 1800000,
      PLT_SKEW_HTTP_MAX_ALIVE_MS: 86400000,
      PLT_SKEW_WORKFLOW_GRACE_PERIOD_MS: 3600000,
      PLT_SKEW_WORKFLOW_MAX_ALIVE_MS: 259200000,
      PLT_SKEW_COOKIE_MAX_AGE: 43200,
      PLT_SKEW_AUTO_CLEANUP: false
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
            const row = { id: String(++idCounter), createdAt: new Date().toISOString(), ...input }
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

  app.register(actuationPolicyPlugin)
  app.register(skewPolicyPlugin)
  app.register(versionRegistryPlugin)

  return { app, store, deploymentStore }
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

test('decorators exist when feature is disabled (with safe branches)', async (t) => {
  const { app } = buildApp({ enabled: false })
  await app.ready()
  t.after(() => app.close())

  // All three decorators are always registered so frontend (deployment-history)
  // and other consumers can call them. Disabled-mode behavior is per-method:
  // listVersions returns []; registerVersion/expireVersion throw.
  assert.strictEqual(typeof app.registerVersion, 'function')
  assert.strictEqual(typeof app.expireVersion, 'function')
  assert.strictEqual(typeof app.listVersions, 'function')
})

test('should register new version as active', async (t) => {
  const { app, store } = buildApp()
  await app.ready()
  t.after(() => app.close())

  const result = await app.registerVersion(baseOpts, mockCtx)

  assert.strictEqual(result.isNew, true)
  assert.strictEqual(store.length, 1)
  assert.strictEqual(store[0].status, 'active')
  assert.strictEqual(store[0].versionLabel, 'v1')
  assert.deepStrictEqual(result.activeVersion, {
    versionId: 'v1',
    serviceName: 'my-app-v1-svc',
    port: 3042
  })
  assert.strictEqual(result.drainingVersions.length, 0)
})

test('should mark previous active version as draining when new version registers', async (t) => {
  const { app, store } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx)

  const result = await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    controllerName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx)

  assert.strictEqual(result.isNew, true)
  assert.strictEqual(store.length, 2)
  assert.strictEqual(store[0].status, 'draining')
  assert.strictEqual(store[1].status, 'active')
  assert.deepStrictEqual(result.activeVersion, {
    versionId: 'v2',
    serviceName: 'my-app-v2-svc',
    port: 3042
  })
  assert.strictEqual(result.drainingVersions.length, 1)
  assert.strictEqual(result.drainingVersions[0].versionId, 'v1')
})

test('should do nothing when version already exists as active', async (t) => {
  const { app, store } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx)
  const result = await app.registerVersion(baseOpts, mockCtx)

  assert.strictEqual(result.isNew, false)
  assert.strictEqual(store.length, 1)
  assert.strictEqual(store[0].status, 'active')
})

test('should do nothing when version already exists as draining', async (t) => {
  const { app, store } = buildApp()
  await app.ready()
  t.after(() => app.close())

  // Register v1, then v2 (v1 becomes draining)
  await app.registerVersion(baseOpts, mockCtx)
  await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    controllerName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx)

  // Re-register v1 (already draining) — should not change
  const result = await app.registerVersion(baseOpts, mockCtx)

  assert.strictEqual(result.isNew, false)
  assert.strictEqual(store[0].status, 'draining')
  assert.strictEqual(store[1].status, 'active')
})

test('should handle three versions: v1 draining, v2 draining, v3 active', async (t) => {
  const { app, store } = buildApp()
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

  const result = await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v3',
    deploymentId: 'dep-3',
    controllerName: 'my-app-v3',
    serviceName: 'my-app-v3-svc'
  }, mockCtx)

  assert.strictEqual(result.isNew, true)
  assert.strictEqual(store[0].status, 'draining')
  assert.strictEqual(store[1].status, 'draining')
  assert.strictEqual(store[2].status, 'active')
  assert.deepStrictEqual(result.activeVersion, {
    versionId: 'v3',
    serviceName: 'my-app-v3-svc',
    port: 3042
  })
  assert.strictEqual(result.drainingVersions.length, 2)
})

test('should isolate versions by appLabel', async (t) => {
  const { app, store } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx)
  const result = await app.registerVersion({
    ...baseOpts,
    appLabel: 'other-app',
    versionLabel: 'v1',
    serviceName: 'other-app-v1-svc'
  }, mockCtx)

  assert.strictEqual(result.isNew, true)
  assert.strictEqual(store.length, 2)
  // Both should be active — different apps
  assert.strictEqual(store[0].status, 'active')
  assert.strictEqual(store[1].status, 'active')
  assert.strictEqual(result.drainingVersions.length, 0)
})

test('expireVersion should expire a draining version and stop its deployment', async (t) => {
  const { app, store, deploymentStore } = buildApp()
  await app.ready()
  t.after(() => app.close())

  deploymentStore.push({ id: 'dep-1', status: 'started' })
  deploymentStore.push({ id: 'dep-2', status: 'started' })

  await app.registerVersion(baseOpts, mockCtx)
  await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    controllerName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx)

  const result = await app.expireVersion('my-app', 'v1', mockCtx)

  assert.strictEqual(result.expired, true)
  assert.strictEqual(store[0].status, 'expired')
  assert.ok(store[0].expiredAt)
  assert.strictEqual(deploymentStore[0].status, 'stopped')
  assert.strictEqual(deploymentStore[1].status, 'started')
  assert.strictEqual(result.drainingVersions.length, 0)
  assert.deepStrictEqual(result.activeVersion, {
    versionId: 'v2',
    serviceName: 'my-app-v2-svc',
    port: 3042
  })
})

test('expireVersion should refuse to expire an active version', async (t) => {
  const { app, store } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx)

  const result = await app.expireVersion('my-app', 'v1', mockCtx)

  assert.strictEqual(result.expired, false)
  assert.strictEqual(store[0].status, 'active')
})

test('expireVersion should return expired false for unknown version', async (t) => {
  const { app } = buildApp()
  await app.ready()
  t.after(() => app.close())

  const result = await app.expireVersion('my-app', 'v99', mockCtx)

  assert.strictEqual(result.expired, false)
})

test('maxVersions should auto-expire oldest draining versions and stop their deployments', async (t) => {
  const policyStore = [{
    id: 'p1',
    applicationId: 'app-1',
    httpGracePeriodMs: null,
    httpMaxAliveMs: null,
    workflowGracePeriodMs: null,
    workflowMaxAliveMs: null,
    maxAgeS: null,
    maxVersions: 1,
    cookieName: null,
    autoCleanup: null
  }]

  const { app, store, deploymentStore } = buildApp({ policyStore })
  await app.ready()
  t.after(() => app.close())

  deploymentStore.push({ id: 'dep-1', status: 'started' })
  deploymentStore.push({ id: 'dep-2', status: 'started' })
  deploymentStore.push({ id: 'dep-3', status: 'started' })

  // Register v1, then v2 (v1 becomes draining), then v3 (v2 becomes draining)
  await app.registerVersion(baseOpts, mockCtx)
  await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    controllerName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx)

  const result = await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v3',
    deploymentId: 'dep-3',
    controllerName: 'my-app-v3',
    serviceName: 'my-app-v3-svc'
  }, mockCtx)

  // maxVersions=1 means only 1 draining version allowed
  // v1 (oldest draining) should be auto-expired, v2 should remain draining
  assert.strictEqual(store[0].status, 'expired')
  assert.strictEqual(store[1].status, 'draining')
  assert.strictEqual(store[2].status, 'active')
  assert.strictEqual(deploymentStore[0].status, 'stopped')
  assert.strictEqual(deploymentStore[1].status, 'started')
  assert.strictEqual(deploymentStore[2].status, 'started')
  assert.strictEqual(result.isNew, true)
  assert.strictEqual(result.drainingVersions.length, 1)
  assert.strictEqual(result.drainingVersions[0].versionId, 'v2')
})

test('maxVersions null should not expire any draining versions', async (t) => {
  const { app, store } = buildApp()
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

  await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v3',
    deploymentId: 'dep-3',
    controllerName: 'my-app-v3',
    serviceName: 'my-app-v3-svc'
  }, mockCtx)

  // No maxVersions limit — both v1 and v2 should remain draining
  assert.strictEqual(store[0].status, 'draining')
  assert.strictEqual(store[1].status, 'draining')
  assert.strictEqual(store[2].status, 'active')
})

test('maxVersions should not expire when within limit', async (t) => {
  const policyStore = [{
    id: 'p1',
    applicationId: 'app-1',
    httpGracePeriodMs: null,
    httpMaxAliveMs: null,
    workflowGracePeriodMs: null,
    workflowMaxAliveMs: null,
    maxAgeS: null,
    maxVersions: 5,
    cookieName: null,
    autoCleanup: null
  }]

  const { app, store } = buildApp({ policyStore })
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

  await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v3',
    deploymentId: 'dep-3',
    controllerName: 'my-app-v3',
    serviceName: 'my-app-v3-svc'
  }, mockCtx)

  // maxVersions=5, only 2 draining — no expiration
  assert.strictEqual(store[0].status, 'draining')
  assert.strictEqual(store[1].status, 'draining')
  assert.strictEqual(store[2].status, 'active')
})

test('should store expirePolicy on version row', async (t) => {
  const { app, store } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion({
    ...baseOpts,
    expirePolicy: 'workflow'
  }, mockCtx)

  assert.strictEqual(store[0].expirePolicy, 'workflow')
})

test('should default expirePolicy to http-traffic when not provided', async (t) => {
  const { app, store } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx)

  assert.strictEqual(store[0].expirePolicy, 'http-traffic')
})

test('should re-activate an expired version when redeployed', async (t) => {
  const { app, store } = buildApp()
  await app.ready()
  t.after(() => app.close())

  // Register v1, then v2 (v1 becomes draining)
  await app.registerVersion(baseOpts, mockCtx)
  await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    controllerName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx)

  // Expire v1
  await app.expireVersion('my-app', 'v1', mockCtx)
  assert.strictEqual(store[0].status, 'expired')

  // Re-deploy v1 — should re-activate it and mark v2 as draining
  const result = await app.registerVersion({
    ...baseOpts,
    deploymentId: 'dep-3',
    controllerName: 'my-app-v1-new',
    serviceName: 'my-app-v1-new-svc'
  }, mockCtx)

  assert.strictEqual(store[0].status, 'active')
  assert.strictEqual(store[0].controllerName, 'my-app-v1-new')
  assert.strictEqual(store[0].serviceName, 'my-app-v1-new-svc')
  assert.strictEqual(store[0].deploymentId, 'dep-3')
  assert.strictEqual(store[0].drainedAt, null)
  assert.strictEqual(store[1].status, 'draining')
  assert.strictEqual(result.isNew, false)
  assert.strictEqual(result.activeVersion.versionId, 'v1')
  assert.strictEqual(result.drainingVersions.length, 1)
  assert.strictEqual(result.drainingVersions[0].versionId, 'v2')
})

// ── Skew protection disabled — decorators always exist, with safe branches ──

test('listVersions returns empty array when skew protection is disabled', async (t) => {
  const { app } = buildApp({ enabled: false })
  await app.ready()
  t.after(() => app.close())

  assert.strictEqual(typeof app.listVersions, 'function')
  const versions = await app.listVersions('any-app-id')
  assert.deepStrictEqual(versions, [])
})

test('listVersions accepts status param when skew disabled, still returns empty', async (t) => {
  const { app } = buildApp({ enabled: false })
  await app.ready()
  t.after(() => app.close())

  const versions = await app.listVersions('any-app-id', 'active')
  assert.deepStrictEqual(versions, [])
})

test('registerVersion records a version as active when skew protection is disabled (records only, no routing)', async (t) => {
  const { app } = buildApp({ enabled: false })
  await app.ready()
  t.after(() => app.close())

  const first = await app.registerVersion({
    applicationId: 'app-1',
    deploymentId: 'dep-1',
    appLabel: 'my-app',
    versionLabel: 'v1',
    controllerName: 'my-app-v1',
    serviceName: 'my-app-v1',
    servicePort: 3042,
    namespace: 'platformatic',
    pathPrefix: '/my-app',
    hostname: null
  }, mockCtx)
  assert.strictEqual(first.isNew, true)

  let active = await app.listVersions('app-1', 'active')
  assert.strictEqual(active.length, 1)
  assert.strictEqual(active[0].versionLabel, 'v1')
  assert.strictEqual(active[0].status, 'active')

  // A second deploy supersedes the first: no drain window without routing, the
  // previous active collapses straight to expired.
  await app.registerVersion({
    applicationId: 'app-1',
    deploymentId: 'dep-2',
    appLabel: 'my-app',
    versionLabel: 'v2',
    controllerName: 'my-app-v2',
    serviceName: 'my-app-v2',
    servicePort: 3042,
    namespace: 'platformatic',
    pathPrefix: '/my-app',
    hostname: null
  }, mockCtx)

  active = await app.listVersions('app-1', 'active')
  assert.strictEqual(active.length, 1)
  assert.strictEqual(active[0].versionLabel, 'v2')
  const draining = await app.listVersions('app-1', 'draining')
  assert.strictEqual(draining.length, 0, 'no draining without routing')
  const all = await app.listVersions('app-1')
  assert.strictEqual(all.find(v => v.versionLabel === 'v1').status, 'expired')
})

test('recordAdviseVersion records a pending-apply version carrying the plan (skew off)', async (t) => {
  const { app } = buildApp({ enabled: false })
  await app.ready()
  t.after(() => app.close())

  const plan = [{ kind: 'Deployment', action: 'apply', command: 'kubectl apply' }]
  const opts = {
    applicationId: 'app-1',
    appLabel: 'my-app',
    versionLabel: 'v9',
    controllerName: 'my-app-v9',
    serviceName: 'my-app-v9',
    servicePort: 3042,
    namespace: 'platformatic',
    pathPrefix: '/my-app',
    hostname: null,
    expirePolicy: 'http-traffic',
    plan
  }
  await app.recordAdviseVersion(opts, mockCtx)

  const v = await app.getVersion('app-1', 'v9')
  assert.strictEqual(v.status, 'pending-apply')
  assert.strictEqual(v.mode, 'advise')
  assert.deepStrictEqual(v.plan.steps, plan)
  assert.strictEqual(v.deploymentId, null)
})

test('a pod registering for an advise pending-apply version confirms it active (skew off)', async (t) => {
  const { app } = buildApp({ enabled: false })
  await app.ready()
  t.after(() => app.close())

  const base = {
    applicationId: 'app-1',
    appLabel: 'my-app',
    versionLabel: 'v9',
    controllerName: 'my-app-v9',
    serviceName: 'my-app-v9',
    servicePort: 3042,
    namespace: 'platformatic',
    pathPrefix: '/my-app',
    hostname: null
  }
  await app.recordAdviseVersion({ ...base, plan: [] }, mockCtx)

  // external actor applies the plan; the pod boots and registers
  const r = await app.registerVersion({ ...base, deploymentId: 'dep-9' }, mockCtx)

  assert.strictEqual(r.isNew, false)
  const v = await app.getVersion('app-1', 'v9')
  assert.strictEqual(v.status, 'active')
  assert.strictEqual(v.deploymentId, 'dep-9')
})

test('expireVersion throws "feature not enabled" when skew protection is disabled', async (t) => {
  const { app } = buildApp({ enabled: false })
  await app.ready()
  t.after(() => app.close())

  assert.strictEqual(typeof app.expireVersion, 'function')
  await assert.rejects(
    () => app.expireVersion('my-app', 'v1', mockCtx),
    err => err.code === 'PLT_CONTROL_PLANE_SKEW_PROTECTION_DISABLED' && err.statusCode === 501
  )
})

// ── Version state machine ──

const { STATES, isLegalTransition } = versionRegistryPlugin

test('state machine: pending-apply is the single funnel into active', () => {
  // Legal funnel transitions
  assert.ok(isLegalTransition('staged', 'pending-apply'))
  assert.ok(isLegalTransition('draining', 'pending-apply'))
  assert.ok(isLegalTransition('expired', 'pending-apply'))
  assert.ok(isLegalTransition('pending-apply', 'active'))
  assert.ok(isLegalTransition('active', 'draining'))
  assert.ok(isLegalTransition('staged', 'expired'))
  assert.ok(isLegalTransition('draining', 'expired'))

  // Nothing reaches active except through pending-apply
  assert.ok(!isLegalTransition('staged', 'active'))
  assert.ok(!isLegalTransition('draining', 'active'))
  assert.ok(!isLegalTransition('expired', 'active'))

  // The active version cannot be expired directly
  assert.ok(!isLegalTransition('active', 'expired'))
  assert.ok(!isLegalTransition('expired', 'draining'))

  assert.strictEqual(STATES.PENDING_APPLY, 'pending-apply')
  assert.strictEqual(STATES.STAGED, 'staged')
})

// ── Approval-gated registration and the staged state ──

function approvalPolicyStore (requiresApproval = true) {
  return [{
    id: 'p1',
    applicationId: 'app-1',
    httpGracePeriodMs: null,
    httpMaxAliveMs: null,
    workflowGracePeriodMs: null,
    workflowMaxAliveMs: null,
    maxAgeS: null,
    maxVersions: null,
    cookieName: null,
    autoCleanup: null,
    requiresApproval
  }]
}

test('registers a new version as staged when approval is required', async (t) => {
  const { app, store } = buildApp({ policyStore: approvalPolicyStore() })
  await app.ready()
  t.after(() => app.close())

  const result = await app.registerVersion(baseOpts, mockCtx)

  assert.strictEqual(result.isNew, true)
  assert.strictEqual(result.staged, true)
  assert.strictEqual(store.length, 1)
  assert.strictEqual(store[0].status, 'staged')
  assert.strictEqual(result.activeVersion, null)
  assert.strictEqual(result.drainingVersions.length, 0)
})

test('staged registration does not demote the current active version', async (t) => {
  const policyStore = approvalPolicyStore(false)
  const { app, store } = buildApp({ policyStore })
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx) // v1 active, no approval
  policyStore[0].requiresApproval = true

  const result = await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    controllerName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx)

  assert.strictEqual(result.staged, true)
  assert.strictEqual(store[0].status, 'active') // v1 keeps serving
  assert.strictEqual(store[1].status, 'staged') // v2 awaits approval
  assert.deepStrictEqual(result.activeVersion, {
    versionId: 'v1',
    serviceName: 'my-app-v1-svc',
    port: 3042
  })
})

test('approveVersion promotes a staged version to active', async (t) => {
  const { app, store } = buildApp({ policyStore: approvalPolicyStore() })
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx)
  assert.strictEqual(store[0].status, 'staged')

  const result = await app.approveVersion('my-app', 'v1', mockCtx)

  assert.strictEqual(result.approved, true)
  assert.strictEqual(store[0].status, 'active')
  assert.deepStrictEqual(result.activeVersion, {
    versionId: 'v1',
    serviceName: 'my-app-v1-svc',
    port: 3042
  })
})

test('approveVersion demotes the previous active version', async (t) => {
  const policyStore = approvalPolicyStore(false)
  const { app, store } = buildApp({ policyStore })
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx) // v1 active
  policyStore[0].requiresApproval = true
  await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    controllerName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx) // v2 staged

  const result = await app.approveVersion('my-app', 'v2', mockCtx)

  assert.strictEqual(result.approved, true)
  assert.strictEqual(store[0].status, 'draining') // v1 demoted
  assert.strictEqual(store[1].status, 'active') // v2 promoted
})

test('approveVersion refuses a non-staged version', async (t) => {
  const { app } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx) // active, no approval

  await assert.rejects(
    () => app.approveVersion('my-app', 'v1', mockCtx),
    err => err.code === 'PLT_CONTROL_PLANE_VERSION_NOT_STAGED' && err.statusCode === 400
  )
})

test('rejectVersion expires a staged version and stops its deployment', async (t) => {
  const { app, store, deploymentStore } = buildApp({ policyStore: approvalPolicyStore() })
  await app.ready()
  t.after(() => app.close())

  deploymentStore.push({ id: 'dep-1', status: 'started' })

  await app.registerVersion(baseOpts, mockCtx) // staged
  const result = await app.rejectVersion('my-app', 'v1', mockCtx)

  assert.strictEqual(result.rejected, true)
  assert.strictEqual(store[0].status, 'expired')
  assert.ok(store[0].expiredAt)
  assert.strictEqual(deploymentStore[0].status, 'stopped')
})

test('rejectVersion refuses a non-staged version', async (t) => {
  const { app } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx) // active

  await assert.rejects(
    () => app.rejectVersion('my-app', 'v1', mockCtx),
    err => err.code === 'PLT_CONTROL_PLANE_VERSION_NOT_STAGED'
  )
})

// ── Promote / mark as latest ──

test('promoteVersion makes a draining version active again', async (t) => {
  const { app, store } = buildApp()
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
  assert.strictEqual(store[0].status, 'draining')

  const result = await app.promoteVersion('my-app', 'v1', mockCtx)

  assert.strictEqual(result.promoted, true)
  assert.strictEqual(store[0].status, 'active') // v1 promoted
  assert.strictEqual(store[1].status, 'draining') // v2 demoted
  assert.deepStrictEqual(result.activeVersion, {
    versionId: 'v1',
    serviceName: 'my-app-v1-svc',
    port: 3042
  })
})

test('promoteVersion refuses an expired version in observe mode', async (t) => {
  const { app } = buildApp()
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
  await app.expireVersion('my-app', 'v1', mockCtx)

  await assert.rejects(
    () => app.promoteVersion('my-app', 'v1', mockCtx),
    err => err.code === 'PLT_CONTROL_PLANE_VERSION_CANNOT_PROMOTE' && err.statusCode === 400
  )
})

test('promoteVersion is a no-op for the already-active version', async (t) => {
  const { app, store } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx)
  const result = await app.promoteVersion('my-app', 'v1', mockCtx)

  assert.strictEqual(result.promoted, false)
  assert.strictEqual(store[0].status, 'active')
})

// ── Read models: getVersion / planVersion ──

test('getVersion returns the row or null', async (t) => {
  const { app } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx)

  const found = await app.getVersion('app-1', 'v1')
  assert.strictEqual(found.versionLabel, 'v1')
  assert.strictEqual(found.status, 'active')

  const missing = await app.getVersion('app-1', 'nope')
  assert.strictEqual(missing, null)
})

test('planVersion returns routing steps for a draining version and null for unknown', async (t) => {
  const { app } = buildApp()
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

  const plan = await app.planVersion('app-1', 'v1')
  assert.ok(Array.isArray(plan.steps))
  assert.ok(plan.steps.some(s => s.kind === 'HTTPRoute'))

  const missing = await app.planVersion('app-1', 'nope')
  assert.strictEqual(missing, null)
})

test('planVersion returns no steps for the already-active version', async (t) => {
  const { app } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx)
  const plan = await app.planVersion('app-1', 'v1')
  assert.deepStrictEqual(plan.steps, [])
})

// ── Per-app versioning disabled: collapse to a single active backend ──

test('disabled versioning collapses to a single active version (no draining)', async (t) => {
  const policyStore = approvalPolicyStore(false)
  policyStore[0].enabled = false
  const { app, store, deploymentStore } = buildApp({ policyStore })
  await app.ready()
  t.after(() => app.close())

  deploymentStore.push({ id: 'dep-1', status: 'started' })

  await app.registerVersion(baseOpts, mockCtx) // v1 active
  const result = await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v2',
    deploymentId: 'dep-2',
    controllerName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx)

  assert.strictEqual(store[0].status, 'expired') // v1 collapsed, not draining
  assert.strictEqual(store[1].status, 'active') // v2 active
  assert.strictEqual(result.drainingVersions.length, 0)
  assert.deepStrictEqual(result.activeVersion, {
    versionId: 'v2',
    serviceName: 'my-app-v2-svc',
    port: 3042
  })
  assert.strictEqual(deploymentStore[0].status, 'stopped')
})

test('disabled versioning ignores requiresApproval (no staged)', async (t) => {
  const policyStore = approvalPolicyStore(true)
  policyStore[0].enabled = false
  const { app, store } = buildApp({ policyStore })
  await app.ready()
  t.after(() => app.close())

  const result = await app.registerVersion(baseOpts, mockCtx)

  assert.notStrictEqual(result.staged, true)
  assert.strictEqual(store[0].status, 'active')
})
