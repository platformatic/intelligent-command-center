'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const fastify = require('fastify')
const fp = require('fastify-plugin')
const versionRegistryPlugin = require('../plugins/version-registry')

function buildApp (enabled = true) {
  const app = fastify({ logger: false })
  const store = []
  let idCounter = 0
  app.register(fp(async (app) => {
    app.decorate('env', {
      PLT_FEATURE_SKEW_PROTECTION: enabled ? 'true' : ''
    })
  }, { name: 'env' }))

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
        }
      }
    })
  }, { name: 'platformatic-db' }))

  app.register(versionRegistryPlugin)

  return { app, store }
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

test('should not register decorator when feature is disabled', async (t) => {
  const { app } = buildApp(false)
  await app.ready()
  t.after(() => app.close())

  assert.strictEqual(app.registerVersion, undefined)
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
    k8SDeploymentName: 'my-app-v2',
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
    k8SDeploymentName: 'my-app-v2',
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
    k8SDeploymentName: 'my-app-v2',
    serviceName: 'my-app-v2-svc'
  }, mockCtx)

  const result = await app.registerVersion({
    ...baseOpts,
    versionLabel: 'v3',
    deploymentId: 'dep-3',
    k8SDeploymentName: 'my-app-v3',
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

test('expireVersion should expire a draining version', async (t) => {
  const { app, store } = buildApp()
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

  const result = await app.expireVersion('my-app', 'v1', mockCtx)

  assert.strictEqual(result.expired, true)
  assert.strictEqual(store[0].status, 'expired')
  assert.ok(store[0].expiredAt)
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
