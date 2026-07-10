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
    // The deploy API no longer gates on the mode, but /deploy/plan still reports it.
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
    // decorated, and the deploy plan must degrade to workload-only.
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

// ── deploy: always creates the workload; ICC observes the pod afterwards ──

test('deploy creates the workload (Deployment + Service)', async (t) => {
  const { app, calls } = buildApp({ applications: apps, latestDeployment: { namespace: 'platformatic' } })
  await app.ready()
  t.after(() => app.close())

  const res = await deploy(app, { image: 'reg/leads-demo:abc', version: 'v3' })
  assert.strictEqual(res.statusCode, 200)
  const body = JSON.parse(res.body)
  assert.strictEqual(body.deployed, true)
  assert.strictEqual(body.controllerName, 'leads-demo-v3')
  assert.strictEqual(calls.applyWorkload.length, 1)
  assert.strictEqual(calls.planWorkload.length, 0)
})

test('deploy applies regardless of actuation mode (observe and advise both deploy)', async (t) => {
  for (const mode of ['observe', 'advise']) {
    const { app, calls } = buildApp({ applications: apps, mode, latestDeployment: { namespace: 'platformatic' } })
    await app.ready()
    t.after(() => app.close())

    const res = await deploy(app, { image: 'reg/leads-demo:abc', version: 'v3' })
    assert.strictEqual(res.statusCode, 200, `mode ${mode}`)
    assert.strictEqual(JSON.parse(res.body).deployed, true, `mode ${mode}`)
    assert.strictEqual(calls.applyWorkload.length, 1, `mode ${mode}`)
    assert.strictEqual(calls.recordAdviseVersion.length, 0, `mode ${mode}`)
  }
})

test('deploy forwards pullSecret credentials to the workload', async (t) => {
  const { app, calls } = buildApp({ applications: apps, latestDeployment: { namespace: 'platformatic' } })
  await app.ready()
  t.after(() => app.close())

  const pullSecret = { registry: 'reg.example.com', username: 'u', password: 'p' }
  const res = await deploy(app, { image: 'reg.example.com/leads-demo:abc', version: 'v3', pullSecret })
  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(calls.applyWorkload.length, 1)
  assert.deepStrictEqual(calls.applyWorkload[0].pullSecret, pullSecret)
})

test('explicit namespace overrides the latest deployment', async (t) => {
  const { app, calls } = buildApp({ applications: apps, latestDeployment: { namespace: 'platformatic' } })
  await app.ready()
  t.after(() => app.close())

  await deploy(app, { image: 'reg/leads-demo:abc', version: 'v3', namespace: 'custom-ns' })
  assert.strictEqual(calls.applyWorkload[0].namespace, 'custom-ns')
})

test('version omitted: mints a plt_ id derived from the image', async (t) => {
  const { app, calls } = buildApp({ applications: apps, latestDeployment: { namespace: 'platformatic' } })
  await app.ready()
  t.after(() => app.close())

  const res = await deploy(app, { image: 'reg/leads-demo:abc123' })
  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(calls.applyWorkload[0].version, deriveVersion('reg/leads-demo:abc123'))
  assert.match(calls.applyWorkload[0].version, /^plt_[0-9A-Za-z]{24}$/)
})

test('version omitted, untagged image: still mints a plt_ id', async (t) => {
  const { app, calls } = buildApp({ applications: apps, latestDeployment: { namespace: 'platformatic' } })
  await app.ready()
  t.after(() => app.close())

  await deploy(app, { image: 'localhost:5000/leads-demo' })
  assert.strictEqual(calls.applyWorkload[0].version, deriveVersion('localhost:5000/leads-demo'))
})

test('returns 404 for an unknown application', async (t) => {
  const { app } = buildApp({ applications: {} })
  await app.ready()
  t.after(() => app.close())

  const res = await app.inject({ method: 'POST', url: '/applications/nope/deploy', payload: { image: 'x', version: 'v1' } })
  assert.strictEqual(res.statusCode, 404)
})

// ── token-scoped deploy: the app comes from the deploy token, not the URL ──

test('token-scoped POST /deploy resolves the app from the token and applies', async (t) => {
  const { app, calls } = buildApp({ applications: apps, latestDeployment: { namespace: 'platformatic' } })
  await app.ready()
  t.after(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/deploy',
    headers: { 'x-user': JSON.stringify({ type: 'deploy-token', applicationId: APP_ID }) },
    payload: { image: 'reg/leads-demo:abc', version: 'v3' }
  })
  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(JSON.parse(res.body).deployed, true)
  assert.strictEqual(calls.applyWorkload.length, 1)
})

test('token-scoped POST /deploy without a token principal is a 400', async (t) => {
  const { app, calls } = buildApp({ applications: apps, latestDeployment: { namespace: 'platformatic' } })
  await app.ready()
  t.after(() => app.close())

  const res = await app.inject({ method: 'POST', url: '/deploy', payload: { image: 'x', version: 'v1' } })
  assert.strictEqual(res.statusCode, 400)
  assert.strictEqual(calls.applyWorkload.length, 0)
})

// ── /deploy/plan: read-only dry-run, mutates nothing, reports the mode ──

test('deploy/plan returns the plan read-only and never applies', async (t) => {
  const { app, calls } = buildApp({ applications: apps, mode: 'observe', latestDeployment: { namespace: 'platformatic' } })
  await app.ready()
  t.after(() => app.close())

  const res = await app.inject({ method: 'POST', url: `/applications/${APP_ID}/deploy/plan`, payload: { image: 'reg/leads-demo:abc', version: 'v3' } })
  assert.strictEqual(res.statusCode, 200)
  const body = JSON.parse(res.body)
  assert.strictEqual(body.intent, 'deploy')
  assert.strictEqual(body.mode, 'observe')
  assert.strictEqual(body.plan[0].kind, 'Deployment')
  assert.ok(body.plan.find(s => s.kind === 'HTTPRoute'), 'plan includes the HTTPRoute step')
  assert.strictEqual(calls.applyWorkload.length, 0)
  assert.strictEqual(calls.planWorkload.length, 1)
})

test('token-scoped POST /deploy/plan resolves the app from the token, read-only', async (t) => {
  const { app, calls } = buildApp({ applications: apps, latestDeployment: { namespace: 'platformatic' } })
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

// ── skew off: no routing decorators; deploy still applies, plan degrades ──

test('skew off: deploy applies the workload', async (t) => {
  const { app, calls } = buildApp({ applications: apps, latestDeployment: { namespace: 'platformatic' }, skewOff: true })
  await app.ready()
  t.after(() => app.close())

  const res = await deploy(app, { image: 'reg/leads-demo:abc', version: 'v3' })
  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(JSON.parse(res.body).deployed, true)
  assert.strictEqual(calls.applyWorkload.length, 1)
})

test('skew off: deploy/plan plans the workload only, no routing', async (t) => {
  const { app, calls } = buildApp({ applications: apps, latestDeployment: { namespace: 'platformatic' }, skewOff: true })
  await app.ready()
  t.after(() => app.close())

  const res = await app.inject({ method: 'POST', url: `/applications/${APP_ID}/deploy/plan`, payload: { image: 'reg/leads-demo:abc', version: 'v3' } })
  assert.strictEqual(res.statusCode, 200)
  const body = JSON.parse(res.body)
  assert.strictEqual(body.plan.find(s => s.kind === 'HTTPRoute'), undefined)
  assert.strictEqual(calls.planWorkload.length, 1)
})
