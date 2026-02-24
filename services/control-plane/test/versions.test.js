'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const fastify = require('fastify')
const fp = require('fastify-plugin')
const versionsRoute = require('../routes/versions')

function buildApp (opts = {}) {
  const app = fastify({ logger: false })

  const applications = opts.applications || {}
  const versionStore = opts.versions || []
  const applyHTTPRouteCalls = []

  app.register(fp(async (app) => {
    app.decorate('getApplicationById', async (id) => {
      return applications[id] || null
    })

    app.decorate('listVersions', async (applicationId, status) => {
      return versionStore.filter(v => {
        if (v.applicationId !== applicationId) return false
        if (status && v.status !== status) return false
        return true
      })
    })

    app.decorate('expireVersion', async (appLabel, versionLabel, ctx) => {
      const version = versionStore.find(
        v => v.appLabel === appLabel && v.versionLabel === versionLabel
      )
      if (!version || version.status !== 'draining') {
        return {
          expired: false,
          activeVersion: null,
          drainingVersions: []
        }
      }

      version.status = 'expired'
      version.expiredAt = new Date().toISOString()

      const activeVersion = versionStore.find(
        v => v.appLabel === appLabel && v.status === 'active'
      )
      const drainingVersions = versionStore.filter(
        v => v.appLabel === appLabel && v.status === 'draining'
      )

      return {
        expired: true,
        activeVersion: activeVersion
          ? { versionId: activeVersion.versionLabel, serviceName: activeVersion.serviceName, port: activeVersion.servicePort }
          : null,
        drainingVersions: drainingVersions.map(v => ({
          versionId: v.versionLabel,
          serviceName: v.serviceName,
          port: v.servicePort
        }))
      }
    })

    if (opts.withApplyHTTPRoute) {
      app.decorate('applyHTTPRoute', async (routeOpts, ctx) => {
        applyHTTPRouteCalls.push(routeOpts)
        return routeOpts
      })
    }
  }, { name: 'mocks' }))

  app.register(versionsRoute)

  return { app, applyHTTPRouteCalls: () => applyHTTPRouteCalls }
}

const APP_ID = 'app-uuid-1'

function makeVersions () {
  return [
    {
      id: '1',
      applicationId: APP_ID,
      appLabel: 'my-app',
      versionLabel: 'v1',
      k8SDeploymentName: 'my-app-v1',
      serviceName: 'my-app-v1-svc',
      servicePort: 3042,
      namespace: 'platformatic',
      pathPrefix: '/my-app',
      hostname: null,
      status: 'draining',
      createdAt: '2026-01-01T00:00:00.000Z',
      expiredAt: null
    },
    {
      id: '2',
      applicationId: APP_ID,
      appLabel: 'my-app',
      versionLabel: 'v2',
      k8SDeploymentName: 'my-app-v2',
      serviceName: 'my-app-v2-svc',
      servicePort: 3042,
      namespace: 'platformatic',
      pathPrefix: '/my-app',
      hostname: null,
      status: 'active',
      createdAt: '2026-01-02T00:00:00.000Z',
      expiredAt: null
    }
  ]
}

test('GET /applications/:id/versions returns all versions', async (t) => {
  const versions = makeVersions()
  const { app } = buildApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    versions
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode, body } = await app.inject({
    url: `/applications/${APP_ID}/versions`
  })

  assert.strictEqual(statusCode, 200)
  const result = JSON.parse(body)
  assert.strictEqual(result.versions.length, 2)
  assert.strictEqual(result.versions[0].versionLabel, 'v1')
  assert.strictEqual(result.versions[1].versionLabel, 'v2')
})

test('GET /applications/:id/versions filters by status', async (t) => {
  const versions = makeVersions()
  const { app } = buildApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    versions
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode, body } = await app.inject({
    url: `/applications/${APP_ID}/versions?status=active`
  })

  assert.strictEqual(statusCode, 200)
  const result = JSON.parse(body)
  assert.strictEqual(result.versions.length, 1)
  assert.strictEqual(result.versions[0].versionLabel, 'v2')
  assert.strictEqual(result.versions[0].status, 'active')
})

test('GET /applications/:id/versions returns 404 for unknown app', async (t) => {
  const { app } = buildApp()
  await app.ready()
  t.after(() => app.close())

  const { statusCode } = await app.inject({
    url: '/applications/unknown-id/versions'
  })

  assert.strictEqual(statusCode, 404)
})

test('GET /applications/:id/versions returns empty array when no versions', async (t) => {
  const { app } = buildApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    versions: []
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode, body } = await app.inject({
    url: `/applications/${APP_ID}/versions`
  })

  assert.strictEqual(statusCode, 200)
  const result = JSON.parse(body)
  assert.strictEqual(result.versions.length, 0)
})

test('POST /applications/:id/versions/:versionLabel/expire expires a draining version', async (t) => {
  const versions = makeVersions()
  const { app } = buildApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    versions
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode, body } = await app.inject({
    method: 'POST',
    url: `/applications/${APP_ID}/versions/v1/expire`
  })

  assert.strictEqual(statusCode, 200)
  const result = JSON.parse(body)
  assert.strictEqual(result.expired, true)
  assert.deepStrictEqual(result.activeVersion, {
    versionId: 'v2',
    serviceName: 'my-app-v2-svc',
    port: 3042
  })
  assert.strictEqual(result.drainingVersions.length, 0)
})

test('POST expire returns 400 for non-draining version', async (t) => {
  const versions = makeVersions()
  const { app } = buildApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    versions
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode } = await app.inject({
    method: 'POST',
    url: `/applications/${APP_ID}/versions/v2/expire`
  })

  assert.strictEqual(statusCode, 400)
})

test('POST expire returns 404 for unknown app', async (t) => {
  const { app } = buildApp()
  await app.ready()
  t.after(() => app.close())

  const { statusCode } = await app.inject({
    method: 'POST',
    url: '/applications/unknown-id/versions/v1/expire'
  })

  assert.strictEqual(statusCode, 404)
})

test('POST expire returns 404 for unknown version', async (t) => {
  const versions = makeVersions()
  const { app } = buildApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    versions
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode } = await app.inject({
    method: 'POST',
    url: `/applications/${APP_ID}/versions/v99/expire`
  })

  assert.strictEqual(statusCode, 404)
})

test('POST expire calls applyHTTPRoute when available', async (t) => {
  const versions = makeVersions()
  const { app, applyHTTPRouteCalls } = buildApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    versions,
    withApplyHTTPRoute: true
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode } = await app.inject({
    method: 'POST',
    url: `/applications/${APP_ID}/versions/v1/expire`
  })

  assert.strictEqual(statusCode, 200)
  const calls = applyHTTPRouteCalls()
  assert.strictEqual(calls.length, 1)
  assert.strictEqual(calls[0].appName, 'my-app')
  assert.strictEqual(calls[0].namespace, 'platformatic')
  assert.strictEqual(calls[0].pathPrefix, '/my-app')
  assert.strictEqual(calls[0].hostname, null)
})

test('POST expire does not call applyHTTPRoute when not decorated', async (t) => {
  const versions = makeVersions()
  const { app } = buildApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    versions
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode, body } = await app.inject({
    method: 'POST',
    url: `/applications/${APP_ID}/versions/v1/expire`
  })

  assert.strictEqual(statusCode, 200)
  const result = JSON.parse(body)
  assert.strictEqual(result.expired, true)
})
