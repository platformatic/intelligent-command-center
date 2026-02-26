'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const fastify = require('fastify')
const fp = require('fastify-plugin')
const reconcilerPlugin = require('../plugins/httproute-reconciler')

function buildApp (opts = {}) {
  const app = fastify({ logger: false })
  const applyHTTPRouteCalls = []
  const leaderCallbacks = []

  // Register mocks as separate named plugins to satisfy dependency checks
  app.register(fp(async (app) => {
    app.decorate('env', {
      PLT_FEATURE_SKEW_PROTECTION: opts.skewEnabled !== false
    })
  }, { name: 'env' }))

  app.register(fp(async (app) => {
    app.decorate('onBecomeLeader', function (fn) {
      leaderCallbacks.push(fn)
    })
  }, { name: 'leader', dependencies: ['env'] }))

  app.register(fp(async (app) => {
    app.decorate('platformatic', {
      entities: {
        versionRegistry: {
          find: async ({ where }) => {
            return (opts.versions || []).filter(v => {
              if (where.status && where.status.in) {
                return where.status.in.includes(v.status)
              }
              return true
            })
          }
        }
      }
    })
  }, { name: 'version-registry', dependencies: ['env'] }))

  app.register(fp(async (app) => {
    app.decorate('applyHTTPRoute', async (routeOpts, ctx) => {
      if (opts.applyError && opts.applyError === routeOpts.appName) {
        throw new Error('apply failed')
      }
      applyHTTPRouteCalls.push(routeOpts)
      return routeOpts
    })
  }, { name: 'gateway', dependencies: ['env'] }))

  app.register(reconcilerPlugin)

  return {
    app,
    applyHTTPRouteCalls: () => applyHTTPRouteCalls,
    leaderCallbacks: () => leaderCallbacks,
    triggerLeader: async () => {
      for (const fn of leaderCallbacks) {
        await fn()
      }
    }
  }
}

function makeVersions () {
  return [
    {
      id: '1',
      applicationId: 'app-1',
      appLabel: 'my-app',
      versionLabel: 'v1',
      k8SDeploymentName: 'my-app-v1',
      serviceName: 'my-app-v1-svc',
      servicePort: 3042,
      namespace: 'platformatic',
      pathPrefix: '/my-app',
      hostname: null,
      status: 'draining'
    },
    {
      id: '2',
      applicationId: 'app-1',
      appLabel: 'my-app',
      versionLabel: 'v2',
      k8SDeploymentName: 'my-app-v2',
      serviceName: 'my-app-v2-svc',
      servicePort: 3042,
      namespace: 'platformatic',
      pathPrefix: '/my-app',
      hostname: null,
      status: 'active'
    }
  ]
}

test('skew protection disabled - no callback registered', async (t) => {
  const { app, leaderCallbacks } = buildApp({
    skewEnabled: false,
    versions: makeVersions()
  })
  await app.ready()
  t.after(() => app.close())

  assert.strictEqual(leaderCallbacks().length, 0)
})

test('no versions in registry - no applyHTTPRoute calls', async (t) => {
  const { app, triggerLeader, applyHTTPRouteCalls } = buildApp({
    versions: []
  })
  await app.ready()
  t.after(() => app.close())

  await triggerLeader()
  assert.strictEqual(applyHTTPRouteCalls().length, 0)
})

test('single app with active + draining - calls applyHTTPRoute once', async (t) => {
  const { app, triggerLeader, applyHTTPRouteCalls } = buildApp({
    versions: makeVersions()
  })
  await app.ready()
  t.after(() => app.close())

  await triggerLeader()
  const calls = applyHTTPRouteCalls()
  assert.strictEqual(calls.length, 1)
  assert.strictEqual(calls[0].appName, 'my-app')
  assert.strictEqual(calls[0].namespace, 'platformatic')
  assert.strictEqual(calls[0].pathPrefix, '/my-app')
  assert.strictEqual(calls[0].hostname, null)
  assert.deepStrictEqual(calls[0].productionVersion, {
    versionId: 'v2',
    serviceName: 'my-app-v2-svc',
    port: 3042
  })
  assert.strictEqual(calls[0].drainingVersions.length, 1)
  assert.strictEqual(calls[0].drainingVersions[0].versionId, 'v1')
})

test('multiple apps - calls applyHTTPRoute once per app', async (t) => {
  const versions = [
    ...makeVersions(),
    {
      id: '3',
      applicationId: 'app-2',
      appLabel: 'other-app',
      versionLabel: 'v1',
      k8SDeploymentName: 'other-app-v1',
      serviceName: 'other-app-v1-svc',
      servicePort: 8080,
      namespace: 'platformatic',
      pathPrefix: '/other-app',
      hostname: 'other.example.com',
      status: 'active'
    }
  ]

  const { app, triggerLeader, applyHTTPRouteCalls } = buildApp({ versions })
  await app.ready()
  t.after(() => app.close())

  await triggerLeader()
  const calls = applyHTTPRouteCalls()
  assert.strictEqual(calls.length, 2)

  const myAppCall = calls.find(c => c.appName === 'my-app')
  const otherAppCall = calls.find(c => c.appName === 'other-app')

  assert.ok(myAppCall)
  assert.ok(otherAppCall)
  assert.strictEqual(otherAppCall.hostname, 'other.example.com')
  assert.strictEqual(otherAppCall.drainingVersions.length, 0)
})

test('app with only draining versions - logs warning and skips', async (t) => {
  const versions = [
    {
      id: '1',
      applicationId: 'app-1',
      appLabel: 'my-app',
      versionLabel: 'v1',
      k8SDeploymentName: 'my-app-v1',
      serviceName: 'my-app-v1-svc',
      servicePort: 3042,
      namespace: 'platformatic',
      pathPrefix: '/my-app',
      hostname: null,
      status: 'draining'
    }
  ]

  const { app, triggerLeader, applyHTTPRouteCalls } = buildApp({ versions })
  await app.ready()
  t.after(() => app.close())

  await triggerLeader()
  assert.strictEqual(applyHTTPRouteCalls().length, 0)
})

test('error on one app does not block others', async (t) => {
  const versions = [
    ...makeVersions(),
    {
      id: '3',
      applicationId: 'app-2',
      appLabel: 'other-app',
      versionLabel: 'v1',
      k8SDeploymentName: 'other-app-v1',
      serviceName: 'other-app-v1-svc',
      servicePort: 8080,
      namespace: 'platformatic',
      pathPrefix: '/other-app',
      hostname: null,
      status: 'active'
    }
  ]

  const { app, triggerLeader, applyHTTPRouteCalls } = buildApp({
    versions,
    applyError: 'my-app'
  })
  await app.ready()
  t.after(() => app.close())

  await triggerLeader()
  const calls = applyHTTPRouteCalls()
  assert.strictEqual(calls.length, 1)
  assert.strictEqual(calls[0].appName, 'other-app')
})
