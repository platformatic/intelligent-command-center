'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const fastify = require('fastify')
const fp = require('fastify-plugin')
const versionRegistryPlugin = require('../plugins/version-registry')
const skewPolicyPlugin = require('../plugins/skew-policy')
const actuationPolicyPlugin = require('../plugins/actuation-policy')
const versionAuditPlugin = require('../plugins/version-audit')

const { resolveActor } = versionAuditPlugin

function buildApp (opts = {}) {
  const app = fastify({ logger: false })
  const store = []
  const deploymentStore = []
  const auditStore = []
  const policyStore = opts.policyStore || []
  let idCounter = 0
  let auditIdCounter = 0
  let policyIdCounter = 0

  app.register(fp(async (app) => {
    app.decorate('env', {
      PLT_FEATURE_SKEW_PROTECTION: 'true',
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
        },
        versionAudit: {
          find: async ({ where, orderBy }) => {
            let rows = auditStore.filter(row => {
              for (const [key, condition] of Object.entries(where || {})) {
                if (condition.eq !== undefined && row[key] !== condition.eq) return false
              }
              return true
            })
            if (orderBy?.length) {
              const { field, direction } = orderBy[0]
              rows = rows.slice().sort((a, b) => {
                const av = a[field]
                const bv = b[field]
                const cmp = av < bv ? -1 : av > bv ? 1 : 0
                return direction === 'desc' ? -cmp : cmp
              })
            }
            return rows
          },
          save: async ({ input }) => {
            const row = { id: String(++auditIdCounter), createdAt: new Date(Date.now() + auditIdCounter).toISOString(), ...input }
            auditStore.push(row)
            return row
          }
        }
      }
    })
  }, { name: 'platformatic-db' }))

  app.register(actuationPolicyPlugin)
  app.register(skewPolicyPlugin)
  app.register(versionAuditPlugin)
  app.register(versionRegistryPlugin)

  return { app, store, deploymentStore, auditStore }
}

const mockCtx = {
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
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

function v2Opts () {
  return { ...baseOpts, versionLabel: 'v2', deploymentId: 'dep-2', controllerName: 'my-app-v2', serviceName: 'my-app-v2-svc' }
}

function approvalPolicyStore () {
  return [{ id: 'p1', applicationId: 'app-1', requiresApproval: true }]
}

// ── resolveActor (pure) ──

test('resolveActor defaults to the system principal', () => {
  assert.deepStrictEqual(resolveActor({ logger: {} }), { type: 'system', id: null, name: 'system' })
})

test('resolveActor reads an authenticated user from the request', () => {
  const actor = resolveActor({ req: { user: { id: 7, username: 'alice' } } })
  assert.deepStrictEqual(actor, { type: 'user', id: '7', name: 'alice' })
})

test('resolveActor uses ctx.actor for background jobs', () => {
  const actor = resolveActor({ actor: { type: 'system', name: 'draining-checker' } })
  assert.deepStrictEqual(actor, { type: 'system', id: null, name: 'draining-checker' })
})

test('resolveActor maps a deploy-token principal to a deploy-token actor', () => {
  const actor = resolveActor({ req: { user: { type: 'deploy-token', id: 't1', name: 'gha-prod', applicationId: 'app-1' } } })
  assert.deepStrictEqual(actor, { type: 'deploy-token', id: 't1', name: 'gha-prod' })
})

test('resolveActor honors an explicit override over ctx', () => {
  const actor = resolveActor({ req: { user: { id: 7, username: 'alice' } } }, { type: 'system', name: 'version-registry' })
  assert.strictEqual(actor.type, 'system')
  assert.strictEqual(actor.name, 'version-registry')
})

// ── recordVersionAudit / getVersionAudit ──

test('recordVersionAudit writes a row with the resolved actor', async (t) => {
  const { app, auditStore } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.recordVersionAudit({
    applicationId: 'app-1', versionLabel: 'v1', event: 'expired', fromState: 'draining', toState: 'expired', reason: 'manual'
  }, { actor: { type: 'system', name: 'draining-checker' } })

  assert.strictEqual(auditStore.length, 1)
  assert.strictEqual(auditStore[0].event, 'expired')
  assert.strictEqual(auditStore[0].fromState, 'draining')
  assert.strictEqual(auditStore[0].toState, 'expired')
  assert.strictEqual(auditStore[0].actorType, 'system')
  assert.strictEqual(auditStore[0].actorName, 'draining-checker')
  assert.strictEqual(auditStore[0].reason, 'manual')
})

test('getVersionAudit returns the timeline for a version in order', async (t) => {
  const { app } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.recordVersionAudit({ applicationId: 'app-1', versionLabel: 'v1', event: 'registered', toState: 'active' }, mockCtx)
  await app.recordVersionAudit({ applicationId: 'app-1', versionLabel: 'v1', event: 'drained', fromState: 'active', toState: 'draining' }, mockCtx)
  await app.recordVersionAudit({ applicationId: 'app-1', versionLabel: 'v2', event: 'registered', toState: 'active' }, mockCtx)

  const timeline = await app.getVersionAudit('app-1', 'v1')
  assert.strictEqual(timeline.length, 2)
  assert.strictEqual(timeline[0].event, 'registered')
  assert.strictEqual(timeline[1].event, 'drained')
})

// ── audit emitted by lifecycle transitions ──

function eventsFor (auditStore, versionLabel) {
  return auditStore.filter(a => a.versionLabel === versionLabel).map(a => a.event)
}

test('registerVersion records a registered event with the system actor', async (t) => {
  const { app, auditStore } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx)

  const registered = auditStore.find(a => a.event === 'registered' && a.versionLabel === 'v1')
  assert.ok(registered)
  assert.strictEqual(registered.fromState, null)
  assert.strictEqual(registered.toState, 'active')
  assert.strictEqual(registered.actorType, 'system')
})

test('registerVersion attributes the actor to the request user when present', async (t) => {
  const { app, auditStore } = buildApp()
  await app.ready()
  t.after(() => app.close())

  const ctx = { ...mockCtx, req: { user: { id: 42, username: 'bob' } } }
  await app.registerVersion(baseOpts, ctx)

  const registered = auditStore.find(a => a.event === 'registered')
  assert.strictEqual(registered.actorType, 'user')
  assert.strictEqual(registered.actorName, 'bob')
})

test('superseding a version records a drained event for the old active', async (t) => {
  const { app, auditStore } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx)
  await app.registerVersion(v2Opts(), mockCtx)

  assert.deepStrictEqual(eventsFor(auditStore, 'v1'), ['registered', 'drained'])
  assert.deepStrictEqual(eventsFor(auditStore, 'v2'), ['registered'])
  const drained = auditStore.find(a => a.event === 'drained')
  assert.strictEqual(drained.fromState, 'active')
  assert.strictEqual(drained.toState, 'draining')
})

test('approve records an approved event from staged', async (t) => {
  const { app, auditStore } = buildApp({ policyStore: approvalPolicyStore() })
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx) // staged
  await app.approveVersion('my-app', 'v1', mockCtx)

  assert.deepStrictEqual(eventsFor(auditStore, 'v1'), ['staged', 'approved'])
  const approved = auditStore.find(a => a.event === 'approved')
  assert.strictEqual(approved.fromState, 'staged')
  assert.strictEqual(approved.toState, 'active')
})

test('reject records a rejected event from staged', async (t) => {
  const { app, auditStore, deploymentStore } = buildApp({ policyStore: approvalPolicyStore() })
  await app.ready()
  t.after(() => app.close())

  deploymentStore.push({ id: 'dep-1', status: 'started' })
  await app.registerVersion(baseOpts, mockCtx) // staged
  await app.rejectVersion('my-app', 'v1', mockCtx)

  const rejected = auditStore.find(a => a.event === 'rejected')
  assert.ok(rejected)
  assert.strictEqual(rejected.fromState, 'staged')
  assert.strictEqual(rejected.toState, 'expired')
})

test('promote records a promoted event', async (t) => {
  const { app, auditStore } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx)
  await app.registerVersion(v2Opts(), mockCtx) // v1 draining
  await app.promoteVersion('my-app', 'v1', mockCtx)

  const promoted = auditStore.find(a => a.event === 'promoted' && a.versionLabel === 'v1')
  assert.ok(promoted)
  assert.strictEqual(promoted.fromState, 'draining')
  assert.strictEqual(promoted.toState, 'active')
})

test('expireVersion records an expired event with the reason from ctx', async (t) => {
  const { app, auditStore } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.registerVersion(baseOpts, mockCtx)
  await app.registerVersion(v2Opts(), mockCtx) // v1 draining

  const ctx = { ...mockCtx, actor: { type: 'system', name: 'draining-checker' }, reason: 'max-alive' }
  await app.expireVersion('my-app', 'v1', ctx)

  const expired = auditStore.find(a => a.event === 'expired' && a.versionLabel === 'v1')
  assert.strictEqual(expired.reason, 'max-alive')
  assert.strictEqual(expired.actorName, 'draining-checker')
  assert.strictEqual(expired.fromState, 'draining')
  assert.strictEqual(expired.toState, 'expired')
})
