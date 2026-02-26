'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const fastify = require('fastify')
const fp = require('fastify-plugin')
const skewPolicyPlugin = require('../plugins/skew-policy')

function buildApp (opts = {}) {
  const app = fastify({ logger: false })
  const store = []
  let idCounter = 0

  const env = {
    PLT_FEATURE_SKEW_PROTECTION: opts.enabled !== false ? 'true' : '',
    PLT_SKEW_GRACE_PERIOD_MS: opts.gracePeriodMs || 86400000,
    PLT_SKEW_COOKIE_MAX_AGE: opts.cookieMaxAge || 43200,
    PLT_SKEW_AUTO_CLEANUP: !!opts.autoCleanup
  }

  app.register(fp(async (app) => {
    app.decorate('env', env)
  }, { name: 'env' }))

  app.register(fp(async (app) => {
    app.decorate('platformatic', {
      entities: {
        skewProtectionPolicy: {
          find: async ({ where }) => {
            return store.filter(row => {
              for (const [key, condition] of Object.entries(where)) {
                if (condition.eq !== undefined && row[key] !== condition.eq) return false
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

  app.register(skewPolicyPlugin)

  return { app, store }
}

test('should not register decorators when feature is disabled', async (t) => {
  const { app } = buildApp({ enabled: false })
  await app.ready()
  t.after(() => app.close())

  assert.strictEqual(app.resolveSkewPolicy, undefined)
  assert.strictEqual(app.getSkewPolicyOverrides, undefined)
  assert.strictEqual(app.saveSkewPolicy, undefined)
  assert.strictEqual(app.clusterSkewDefaults, undefined)
})

test('should register decorators when feature is enabled', async (t) => {
  const { app } = buildApp()
  await app.ready()
  t.after(() => app.close())

  assert.strictEqual(typeof app.resolveSkewPolicy, 'function')
  assert.strictEqual(typeof app.getSkewPolicyOverrides, 'function')
  assert.strictEqual(typeof app.saveSkewPolicy, 'function')
  assert.ok(app.clusterSkewDefaults)
})

test('clusterSkewDefaults should expose env values', async (t) => {
  const { app } = buildApp({ gracePeriodMs: 5000, cookieMaxAge: 100, autoCleanup: true })
  await app.ready()
  t.after(() => app.close())

  assert.deepStrictEqual(app.clusterSkewDefaults, {
    gracePeriodMs: 5000,
    maxAgeS: 100,
    maxVersions: null,
    cookieName: '__plt_dpl',
    autoCleanup: true
  })
})

test('resolveSkewPolicy should return cluster defaults when no per-app row', async (t) => {
  const { app } = buildApp({ gracePeriodMs: 86400000, cookieMaxAge: 43200 })
  await app.ready()
  t.after(() => app.close())

  const policy = await app.resolveSkewPolicy('app-1')

  assert.deepStrictEqual(policy, {
    gracePeriodMs: 86400000,
    maxAgeS: 43200,
    maxVersions: null,
    cookieName: '__plt_dpl',
    autoCleanup: false
  })
})

test('resolveSkewPolicy should return overrides when set', async (t) => {
  const { app } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.saveSkewPolicy('app-1', {
    gracePeriodMs: 5000,
    maxAgeS: 200,
    maxVersions: 3,
    cookieName: 'my_cookie',
    autoCleanup: true
  })

  const policy = await app.resolveSkewPolicy('app-1')

  assert.strictEqual(policy.gracePeriodMs, 5000)
  assert.strictEqual(policy.maxAgeS, 200)
  assert.strictEqual(policy.maxVersions, 3)
  assert.strictEqual(policy.cookieName, 'my_cookie')
  assert.strictEqual(policy.autoCleanup, true)
})

test('resolveSkewPolicy should merge partial overrides with defaults', async (t) => {
  const { app } = buildApp({ gracePeriodMs: 86400000, cookieMaxAge: 43200 })
  await app.ready()
  t.after(() => app.close())

  await app.saveSkewPolicy('app-1', { gracePeriodMs: 1000 })

  const policy = await app.resolveSkewPolicy('app-1')

  assert.strictEqual(policy.gracePeriodMs, 1000)
  assert.strictEqual(policy.maxAgeS, 43200)
  assert.strictEqual(policy.maxVersions, null)
  assert.strictEqual(policy.cookieName, '__plt_dpl')
  assert.strictEqual(policy.autoCleanup, false)
})

test('getSkewPolicyOverrides should return null when no row exists', async (t) => {
  const { app } = buildApp()
  await app.ready()
  t.after(() => app.close())

  const overrides = await app.getSkewPolicyOverrides('app-1')
  assert.strictEqual(overrides, null)
})

test('getSkewPolicyOverrides should return raw row when exists', async (t) => {
  const { app } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.saveSkewPolicy('app-1', { gracePeriodMs: 5000 })

  const overrides = await app.getSkewPolicyOverrides('app-1')
  assert.strictEqual(overrides.gracePeriodMs, 5000)
  assert.strictEqual(overrides.applicationId, 'app-1')
})

test('saveSkewPolicy should create a new row', async (t) => {
  const { app, store } = buildApp()
  await app.ready()
  t.after(() => app.close())

  const saved = await app.saveSkewPolicy('app-1', { maxVersions: 2 })

  assert.strictEqual(store.length, 1)
  assert.strictEqual(saved.applicationId, 'app-1')
  assert.strictEqual(saved.maxVersions, 2)
})

test('saveSkewPolicy should update existing row', async (t) => {
  const { app, store } = buildApp()
  await app.ready()
  t.after(() => app.close())

  await app.saveSkewPolicy('app-1', { maxVersions: 2 })
  await app.saveSkewPolicy('app-1', { maxVersions: 5, cookieName: 'new_cookie' })

  assert.strictEqual(store.length, 1)
  assert.strictEqual(store[0].maxVersions, 5)
  assert.strictEqual(store[0].cookieName, 'new_cookie')
})
