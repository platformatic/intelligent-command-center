'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const fastify = require('fastify')
const fp = require('fastify-plugin')
const applicationsPlugin = require('../plugins/applications')
const generationsPlugin = require('../plugins/generations')
const deployTokensPlugin = require('../plugins/deploy-tokens')
const applicationsRoute = require('../routes/applications')

function buildApp (opts = {}) {
  const app = fastify({ logger: false })
  const applications = opts.applications || []
  const configs = []
  const tokens = []
  let appId = applications.length
  const emitted = []

  app.register(fp(async (app) => {
    app.decorate('env', {
      PLT_CONTROL_PLANE_DB_LOCK_MIN_TIMEOUT: 1,
      PLT_CONTROL_PLANE_SECRET_KEYS: 'test-pepper'
    })
    app.decorate('getDefaultApplicationResources', () => ({ threads: 1 }))
    app.decorate('emitUpdate', async (...args) => { emitted.push(args) })

    // fake tx: advisory-lock query returns truthy; entities live in closures.
    const fakeTx = { query: async () => [{ pg_try_advisory_xact_lock: true }] }

    app.decorate('platformatic', {
      sql: () => {},
      db: { tx: async (fn) => fn(fakeTx) },
      entities: {
        application: {
          find: async ({ where }) => applications.filter(row => {
            for (const [key, cond] of Object.entries(where)) {
              if (cond.eq !== undefined && row[key] !== cond.eq) return false
            }
            return true
          }),
          save: async ({ input }) => {
            const row = { id: 'a' + (++appId), ...input }
            applications.push(row)
            return row
          }
        },
        applicationsConfig: { save: async ({ input }) => { configs.push(input); return input } },
        deployToken: {
          save: async ({ input }) => {
            const row = { id: 't' + (tokens.length + 1), createdAt: new Date().toISOString(), ...input }
            tokens.push(row)
            return row
          }
        }
      }
    })
  }, { name: 'mocks' }))

  app.register(generationsPlugin)
  app.register(applicationsPlugin)
  app.register(deployTokensPlugin)
  app.register(applicationsRoute)

  return { app, applications, configs, tokens, emitted }
}

test('POST /applications creates an app with no deployment and issues its deploy token', async (t) => {
  const { app, configs, tokens, emitted } = buildApp()
  await app.ready()
  t.after(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/applications/create',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'my-watt-example' })
  })

  assert.strictEqual(res.statusCode, 200)
  const body = JSON.parse(res.body)
  assert.strictEqual(body.application.name, 'my-watt-example')
  assert.ok(body.token.startsWith('plt_deploy_'))
  assert.strictEqual(body.deployToken.name, 'my-watt-example-deploy-token')
  assert.strictEqual(body.deployToken.expiresAt, null)

  // default config written, token persisted, UI notified
  assert.strictEqual(configs.length, 1)
  assert.strictEqual(tokens.length, 1)
  assert.strictEqual(emitted[0][1].type, 'application-created')
})

test('POST /applications trims the name', async (t) => {
  const { app, applications } = buildApp()
  await app.ready()
  t.after(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/applications/create',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: '  spaced  ' })
  })
  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(applications[applications.length - 1].name, 'spaced')
})

test('POST /applications rejects a duplicate name with 409', async (t) => {
  const { app } = buildApp({ applications: [{ id: 'a1', name: 'taken' }] })
  await app.ready()
  t.after(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/applications/create',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'taken' })
  })
  assert.strictEqual(res.statusCode, 409)
})

test('POST /applications rejects an empty name', async (t) => {
  const { app } = buildApp()
  await app.ready()
  t.after(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/applications/create',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: '' })
  })
  assert.strictEqual(res.statusCode, 400)
})
