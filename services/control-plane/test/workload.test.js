'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const fastify = require('fastify')
const fp = require('fastify-plugin')
const workloadPlugin = require('../plugins/workload')

function buildApp (calls) {
  const app = fastify({ logger: false })
  app.register(fp(async (app) => { app.decorate('env', {}) }, { name: 'env' }))
  app.register(fp(async (app) => {
    app.decorate('machinist', {
      applySecret: async (ns, secret) => { calls.applySecret.push({ ns, secret }) },
      applyDeployment: async (ns, dep) => { calls.applyDeployment.push({ ns, dep }) },
      applyService: async (ns, svc) => { calls.applyService.push({ ns, svc }) }
    })
  }, { name: 'machinist' }))
  app.register(workloadPlugin)
  return app
}

const ctx = { logger: { info () {}, error () {} } }
const baseOpts = { appName: 'leads-demo', image: 'reg.example.com/leads-demo:abc', version: 'v3', namespace: 'platformatic', port: 3042 }
const creds = { registry: 'reg.example.com', username: 'u', password: 'sekret' }

test('applyWorkload applies the pull Secret, then the Deployment and Service', async (t) => {
  const calls = { applySecret: [], applyDeployment: [], applyService: [] }
  const app = buildApp(calls)
  await app.ready()
  t.after(() => app.close())

  const res = await app.applyWorkload({ ...baseOpts, pullSecret: creds }, ctx)
  assert.strictEqual(res.applied, true)
  assert.strictEqual(res.controllerName, 'leads-demo-v3')
  assert.strictEqual(calls.applySecret.length, 1)
  assert.strictEqual(calls.applySecret[0].secret.type, 'kubernetes.io/dockerconfigjson')
  assert.deepStrictEqual(calls.applyDeployment[0].dep.spec.template.spec.imagePullSecrets, [{ name: 'leads-demo-v3-pull' }])
  assert.strictEqual(calls.applyService.length, 1)
})

test('applyWorkload skips the Secret when no credentials are supplied', async (t) => {
  const calls = { applySecret: [], applyDeployment: [], applyService: [] }
  const app = buildApp(calls)
  await app.ready()
  t.after(() => app.close())

  await app.applyWorkload({ ...baseOpts }, ctx)
  assert.strictEqual(calls.applySecret.length, 0)
  assert.strictEqual(calls.applyDeployment.length, 1)
  assert.strictEqual(calls.applyDeployment[0].dep.spec.template.spec.imagePullSecrets, undefined)
})

test('planWorkload includes a redacted Secret step and never leaks credentials', async (t) => {
  const calls = { applySecret: [], applyDeployment: [], applyService: [] }
  const app = buildApp(calls)
  await app.ready()
  t.after(() => app.close())

  const plan = app.planWorkload({ ...baseOpts, pullSecret: creds })
  const secretStep = plan.find(s => s.kind === 'Secret')
  assert.ok(secretStep, 'plan has a Secret step')
  assert.strictEqual(secretStep.manifest.data['.dockerconfigjson'], '<redacted>')
  assert.ok(!JSON.stringify(plan).includes('sekret'), 'plan does not contain the password')
  const depStep = plan.find(s => s.kind === 'Deployment')
  assert.deepStrictEqual(depStep.manifest.spec.template.spec.imagePullSecrets, [{ name: 'leads-demo-v3-pull' }])
})

test('planWorkload has no Secret step when no credentials are supplied', async (t) => {
  const calls = { applySecret: [], applyDeployment: [], applyService: [] }
  const app = buildApp(calls)
  await app.ready()
  t.after(() => app.close())

  const plan = app.planWorkload({ ...baseOpts })
  assert.strictEqual(plan.find(s => s.kind === 'Secret'), undefined)
  assert.ok(plan.find(s => s.kind === 'Deployment'))
})
