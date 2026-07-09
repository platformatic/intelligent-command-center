'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const fastify = require('fastify')
const fp = require('fastify-plugin')
const deployRoute = require('../routes/deploy')
const { deriveVersion } = require('../lib/version')

function buildApp (opts = {}) {
  const app = fastify({ logger: false })
  const calls = { applyWorkload: [], planWorkload: [], getDesiredRouting: [], planHTTPRoute: [], recordAdviseVersion: [] }

  app.register(fp(async (app) => {
    // Mimic auth-context-plugin: the gateway injects the resolved principal as
    // x-user, and control-plane exposes it as req.user. Token-scoped routes read
    // the application from it.
    app.addHook('onRequest', async (req) => {
      if (req.headers['x-user']) req.user = JSON.parse(req.headers['x-user'])
    })
    app.decorate('getApplicationById', async (id) => opts.applications?.[id] ?? null)
    // Actuation mode is skew-independent: the route reads resolveActuationMode,
    // never resolveSkewPolicy, so it works with skew protection off.
    app.decorate('resolveActuationMode', async () => ({ mode: opts.mode ?? 'observe' }))
    app.decorate('recordAdviseVersion', async (o) => { calls.recordAdviseVersion.push(o) })
    app.decorate('getLatestDeployment', async () => opts.latestDeployment ?? null)
    app.decorate('applyWorkload', async (o) => {
      calls.applyWorkload.push(o)
      const name = `${o.appName}-${o.version}`
      return { applied: true, controllerName: name, serviceName: name }
    })
    app.decorate('planWorkload', (o) => {
      calls.planWorkload.push(o)
      return [{ kind: 'Deployment', action: 'apply', manifest: { metadata: { name: `${o.appName}-${o.version}` } }, command: 'kubectl apply' }]
    })
    // Routing helpers are skew-only: when skew protection is off they are not
    // decorated, and the deploy route must degrade to workload-only.
    if (!opts.skewOff) {
      app.decorate('getDesiredRouting', async (appLabel, versionLabel, prospective = null) => {
        calls.getDesiredRouting.push({ appLabel, versionLabel, prospective })
        return { productionVersion: prospective, drainingVersions: [], stagedVersions: [] }
      })
      app.decorate('planHTTPRoute', async (o) => {
        calls.planHTTPRoute.push(o)
        return { kind: 'HTTPRoute', action: 'apply', manifest: { metadata: { name: o.appName } }, command: 'kubectl apply' }
      })
    }
  }, { name: 'mocks' }))

  app.register(deployRoute)
  return { app, calls }
}

const APP_ID = 'app-1'
const apps = { [APP_ID]: { id: APP_ID, name: 'leads-demo' } }

function deploy (app, body) {
  return app.inject({ method: 'POST', url: `/applications/${APP_ID}/deploy`, payload: body })
}

test('manage mode: placeholdered while reworked -- rejects, creates nothing', async (t) => {
  const { app, calls } = buildApp({ applications: apps, mode: 'manage', latestDeployment: { namespace: 'platformatic' } })
  await app.ready()
  t.after(() => app.close())

  const res = await deploy(app, { image: 'reg/leads-demo:abc', version: 'v3' })
  assert.strictEqual(res.statusCode, 503)
  assert.strictEqual(JSON.parse(res.body).code, 'PLT_CONTROL_PLANE_MANAGE_MODE_UNAVAILABLE')
  assert.strictEqual(calls.applyWorkload.length, 0)
})

test('advise mode: returns a plan and does not apply', async (t) => {
  const { app, calls } = buildApp({ applications: apps, mode: 'advise', latestDeployment: { namespace: 'platformatic' } })
  await app.ready()
  t.after(() => app.close())

  const res = await deploy(app, { image: 'reg/leads-demo:abc', version: 'v3' })
  assert.strictEqual(res.statusCode, 200)
  const body = JSON.parse(res.body)
  assert.strictEqual(body.deployed, false)
  assert.strictEqual(body.pendingApply, true)
  assert.strictEqual(body.plan[0].kind, 'Deployment')
  assert.strictEqual(calls.applyWorkload.length, 0)
  assert.strictEqual(calls.planWorkload.length, 1)

  // The advise plan must also carry the routing (HTTPRoute) step, otherwise
  // nobody makes the new version the gateway default and pending-apply-checker
  // never confirms it.
  const routeStep = body.plan.find(s => s.kind === 'HTTPRoute')
  assert.ok(routeStep, 'advise plan includes an HTTPRoute step')
  assert.strictEqual(calls.planHTTPRoute.length, 1)
  // The not-yet-registered version is passed as the prospective production version.
  assert.strictEqual(calls.getDesiredRouting.length, 1)
  assert.deepStrictEqual(calls.getDesiredRouting[0].prospective, {
    versionId: 'v3', serviceName: 'leads-demo-v3', port: 3042
  })
  assert.strictEqual(calls.planHTTPRoute[0].productionVersion.versionId, 'v3')
})

test('observe mode: rejected (ICC does not author workloads)', async (t) => {
  const { app, calls } = buildApp({ applications: apps, mode: 'observe' })
  await app.ready()
  t.after(() => app.close())

  const res = await deploy(app, { image: 'reg/leads-demo:abc', version: 'v3' })
  assert.strictEqual(res.statusCode, 400)
  assert.strictEqual(calls.applyWorkload.length, 0)
})

test('deploy/plan: returns the plan read-only, even in manage mode (no mutation)', async (t) => {
  const { app, calls } = buildApp({ applications: apps, mode: 'manage', latestDeployment: { namespace: 'platformatic' } })
  await app.ready()
  t.after(() => app.close())

  const res = await app.inject({ method: 'POST', url: `/applications/${APP_ID}/deploy/plan`, payload: { image: 'reg/leads-demo:abc', version: 'v3' } })
  assert.strictEqual(res.statusCode, 200)
  const body = JSON.parse(res.body)
  assert.strictEqual(body.intent, 'deploy')
  assert.strictEqual(body.mode, 'manage')
  assert.strictEqual(body.plan[0].kind, 'Deployment')
  assert.ok(body.plan.find(s => s.kind === 'HTTPRoute'), 'plan includes the HTTPRoute step')
  // Read-only: manage mode did NOT create the workload.
  assert.strictEqual(calls.applyWorkload.length, 0)
  assert.strictEqual(calls.planWorkload.length, 1)
})

test('deploy/plan: also plans in observe mode without rejecting', async (t) => {
  const { app, calls } = buildApp({ applications: apps, mode: 'observe', latestDeployment: { namespace: 'platformatic' } })
  await app.ready()
  t.after(() => app.close())

  const res = await app.inject({ method: 'POST', url: `/applications/${APP_ID}/deploy/plan`, payload: { image: 'reg/leads-demo:abc', version: 'v3' } })
  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(calls.applyWorkload.length, 0)
})

test('token-scoped POST /deploy resolves the app from the token and returns a plan', async (t) => {
  const { app } = buildApp({ applications: apps, mode: 'advise', latestDeployment: { namespace: 'platformatic' } })
  await app.ready()
  t.after(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/deploy',
    headers: { 'x-user': JSON.stringify({ type: 'deploy-token', applicationId: APP_ID }) },
    payload: { image: 'reg/leads-demo:abc', version: 'v3' }
  })
  assert.strictEqual(res.statusCode, 200)
  const body = JSON.parse(res.body)
  assert.strictEqual(body.deployed, false)
  assert.strictEqual(body.pendingApply, true)
  assert.ok(body.plan.length > 0)
})

test('token-scoped POST /deploy/plan resolves the app from the token, read-only', async (t) => {
  const { app, calls } = buildApp({ applications: apps, mode: 'manage', latestDeployment: { namespace: 'platformatic' } })
  await app.ready()
  t.after(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/deploy/plan',
    headers: { 'x-user': JSON.stringify({ type: 'deploy-token', applicationId: APP_ID }) },
    payload: { image: 'reg/leads-demo:abc', version: 'v3' }
  })
  assert.strictEqual(res.statusCode, 200)
  const body = JSON.parse(res.body)
  assert.strictEqual(body.intent, 'deploy')
  assert.ok(body.plan.find(s => s.kind === 'HTTPRoute'))
  assert.strictEqual(calls.applyWorkload.length, 0)
})

test('token-scoped POST /deploy without a token principal is a 400', async (t) => {
  const { app, calls } = buildApp({ applications: apps, mode: 'manage', latestDeployment: { namespace: 'platformatic' } })
  await app.ready()
  t.after(() => app.close())

  const res = await app.inject({ method: 'POST', url: '/deploy', payload: { image: 'x', version: 'v1' } })
  assert.strictEqual(res.statusCode, 400)
  assert.strictEqual(calls.applyWorkload.length, 0)
})

test('explicit namespace overrides the latest deployment', async (t) => {
  const { app, calls } = buildApp({ applications: apps, mode: 'advise', latestDeployment: { namespace: 'platformatic' } })
  await app.ready()
  t.after(() => app.close())

  await deploy(app, { image: 'reg/leads-demo:abc', version: 'v3', namespace: 'custom-ns' })
  assert.strictEqual(calls.planWorkload[0].namespace, 'custom-ns')
})

test('returns 404 for an unknown application', async (t) => {
  const { app } = buildApp({ applications: {}, mode: 'manage' })
  await app.ready()
  t.after(() => app.close())

  const res = await app.inject({ method: 'POST', url: '/applications/nope/deploy', payload: { image: 'x', version: 'v1' } })
  assert.strictEqual(res.statusCode, 404)
})

test('version omitted: mints a plt_ id derived from the image', async (t) => {
  const { app, calls } = buildApp({ applications: apps, mode: 'advise', latestDeployment: { namespace: 'platformatic' } })
  await app.ready()
  t.after(() => app.close())

  const res = await deploy(app, { image: 'reg/leads-demo:abc123' })
  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(JSON.parse(res.body).pendingApply, true)
  assert.strictEqual(calls.planWorkload[0].version, deriveVersion('reg/leads-demo:abc123'))
  assert.match(calls.planWorkload[0].version, /^plt_[0-9A-Za-z]{24}$/)
})

test('version omitted, untagged image: still mints a plt_ id (no image parsing to trip on)', async (t) => {
  const { app, calls } = buildApp({ applications: apps, mode: 'advise', latestDeployment: { namespace: 'platformatic' } })
  await app.ready()
  t.after(() => app.close())

  await deploy(app, { image: 'localhost:5000/leads-demo' })
  assert.strictEqual(calls.planWorkload[0].version, deriveVersion('localhost:5000/leads-demo'))
})

// Skew OFF: the route registers with no resolveSkewPolicy/routing decorators and
// behaves per the skew-independent actuation mode.

test('skew off, manage mode: placeholdered while reworked -- rejects, creates nothing', async (t) => {
  const { app, calls } = buildApp({ applications: apps, mode: 'manage', latestDeployment: { namespace: 'platformatic' }, skewOff: true })
  await app.ready()
  t.after(() => app.close())

  const res = await deploy(app, { image: 'reg/leads-demo:abc', version: 'v3' })
  assert.strictEqual(res.statusCode, 503)
  assert.strictEqual(JSON.parse(res.body).code, 'PLT_CONTROL_PLANE_MANAGE_MODE_UNAVAILABLE')
  assert.strictEqual(calls.applyWorkload.length, 0)
})

test('skew off, default observe mode: rejected (customer owns the workload)', async (t) => {
  const { app, calls } = buildApp({ applications: apps, skewOff: true })
  await app.ready()
  t.after(() => app.close())

  const res = await deploy(app, { image: 'reg/leads-demo:abc', version: 'v3' })
  assert.strictEqual(res.statusCode, 400)
  assert.strictEqual(calls.applyWorkload.length, 0)
})

test('skew off, advise mode: plans the workload only, no routing', async (t) => {
  const { app, calls } = buildApp({ applications: apps, mode: 'advise', latestDeployment: { namespace: 'platformatic' }, skewOff: true })
  await app.ready()
  t.after(() => app.close())

  const res = await deploy(app, { image: 'reg/leads-demo:abc', version: 'v3' })
  assert.strictEqual(res.statusCode, 200)
  const body = JSON.parse(res.body)
  assert.strictEqual(body.deployed, false)
  assert.strictEqual(body.pendingApply, true)
  assert.strictEqual(calls.planWorkload.length, 1)
  assert.strictEqual(body.plan.find(s => s.kind === 'HTTPRoute'), undefined)
  // The advise version + plan is persisted so the dashboard can show it.
  assert.strictEqual(calls.recordAdviseVersion.length, 1)
  assert.strictEqual(calls.recordAdviseVersion[0].versionLabel, 'v3')
  assert.ok(calls.recordAdviseVersion[0].plan.length > 0)
})
