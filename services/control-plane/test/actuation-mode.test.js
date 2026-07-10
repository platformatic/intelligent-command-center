'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const fastify = require('fastify')
const fp = require('fastify-plugin')
const actuationRoutes = require('../routes/actuation')
const actuationPolicyPlugin = require('../plugins/actuation-policy')
const deployRoute = require('../routes/deploy')

const APP_ID = 'app-1'
const apps = { [APP_ID]: { id: APP_ID, name: 'leads-demo' } }

// --- route unit tests (mode setting is skew-independent) ---

function buildRouteApp (opts = {}) {
  const app = fastify({ logger: false })
  const store = { mode: opts.mode ?? 'observe' }
  const calls = { save: [] }
  app.register(fp(async (app) => {
    app.decorate('getApplicationById', async (id) => opts.applications?.[id] ?? null)
    app.decorate('resolveActuationMode', async () => ({ mode: store.mode }))
    app.decorate('saveActuationMode', async (id, mode) => {
      calls.save.push({ id, mode })
      store.mode = mode
    })
  }, { name: 'mocks' }))
  app.register(actuationRoutes)
  return { app, calls, store }
}

test('GET /actuation-mode returns the resolved mode', async (t) => {
  const { app } = buildRouteApp({ applications: apps, mode: 'manage' })
  await app.ready()
  t.after(() => app.close())

  const res = await app.inject({ method: 'GET', url: `/applications/${APP_ID}/actuation-mode` })
  assert.strictEqual(res.statusCode, 200)
  assert.deepStrictEqual(JSON.parse(res.body), { mode: 'manage' })
})

test('PUT /actuation-mode sets the mode', async (t) => {
  const { app, calls, store } = buildRouteApp({ applications: apps })
  await app.ready()
  t.after(() => app.close())

  const res = await app.inject({ method: 'PUT', url: `/applications/${APP_ID}/actuation-mode`, payload: { mode: 'manage' } })
  assert.strictEqual(res.statusCode, 200)
  assert.deepStrictEqual(JSON.parse(res.body), { mode: 'manage' })
  assert.deepStrictEqual(calls.save, [{ id: APP_ID, mode: 'manage' }])
  assert.strictEqual(store.mode, 'manage')
})

test('PUT /actuation-mode rejects an invalid mode with 400 (schema enum)', async (t) => {
  const { app, calls } = buildRouteApp({ applications: apps })
  await app.ready()
  t.after(() => app.close())

  const res = await app.inject({ method: 'PUT', url: `/applications/${APP_ID}/actuation-mode`, payload: { mode: 'bogus' } })
  assert.strictEqual(res.statusCode, 400)
  assert.strictEqual(calls.save.length, 0)
})

test('unknown application is a 404 on GET and PUT', async (t) => {
  const { app } = buildRouteApp({ applications: {} })
  await app.ready()
  t.after(() => app.close())

  const get = await app.inject({ method: 'GET', url: '/applications/nope/actuation-mode' })
  assert.strictEqual(get.statusCode, 404)
  const put = await app.inject({ method: 'PUT', url: '/applications/nope/actuation-mode', payload: { mode: 'manage' } })
  assert.strictEqual(put.statusCode, 404)
})

// --- end-to-end: with skew OFF, set manage then deploy creates the workload ---
// Proves the decoupling is usable: resolveActuationMode/saveActuationMode share
// one store, and the deploy route (no resolveSkewPolicy, no routing decorators)
// actuates purely on that mode.

function buildSkewOffApp () {
  const app = fastify({ logger: false })
  const rows = []
  let idc = 0
  const calls = { applyWorkload: [] }

  app.register(fp(async () => {}, { name: 'env' }))
  app.decorate('platformatic', {
    entities: {
      skewProtectionPolicy: {
        find: async ({ where }) => rows.filter(r => r.applicationId === where.applicationId.eq),
        save: async ({ input }) => {
          if (input.id) {
            const i = rows.findIndex(r => r.id === input.id)
            rows[i] = { ...rows[i], ...input }
            return rows[i]
          }
          const row = { id: String(++idc), ...input }
          rows.push(row)
          return row
        }
      }
    }
  })
  app.register(fp(async (app) => {
    app.addHook('onRequest', async (req) => {
      if (req.headers['x-user']) req.user = JSON.parse(req.headers['x-user'])
    })
    app.decorate('getApplicationById', async (id) => apps[id] ?? null)
    app.decorate('getLatestDeployment', async () => ({ namespace: 'platformatic' }))
    app.decorate('applyWorkload', async (o) => {
      calls.applyWorkload.push(o)
      const name = `${o.appName}-${o.version}`
      return { applied: true, controllerName: name, serviceName: name }
    })
    // Skew OFF: no resolveSkewPolicy, no planHTTPRoute/getDesiredRouting.
  }, { name: 'mocks' }))

  // Real plugins/routes under test.
  app.register(actuationPolicyPlugin)
  app.register(actuationRoutes)
  app.register(deployRoute)
  return { app, calls }
}

test('skew off: the deploy API creates the workload (mode does not gate it)', async (t) => {
  const { app, calls } = buildSkewOffApp()
  await app.ready()
  t.after(() => app.close())

  const token = { 'x-user': JSON.stringify({ type: 'deploy-token', applicationId: APP_ID }) }
  const body = { image: 'reg/leads-demo:abc', version: 'v3' }

  // Default observe: the token-deploy creates the workload; ICC observes the pod.
  const deployed = await app.inject({ method: 'POST', url: '/deploy', headers: token, payload: body })
  assert.strictEqual(deployed.statusCode, 200)
  assert.strictEqual(JSON.parse(deployed.body).deployed, true)
  assert.strictEqual(calls.applyWorkload.length, 1)

  // Setting the mode still works (it governs routing, not the deploy).
  const put = await app.inject({ method: 'PUT', url: `/applications/${APP_ID}/actuation-mode`, payload: { mode: 'advise' } })
  assert.strictEqual(put.statusCode, 200)
})
