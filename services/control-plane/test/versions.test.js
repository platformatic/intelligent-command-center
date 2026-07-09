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
    // Mimic auth-context-plugin: the gateway injects the principal as x-user and
    // control-plane exposes it as req.user (token-scoped routes read the app id).
    app.addHook('onRequest', async (req) => {
      if (req.headers['x-user']) req.user = JSON.parse(req.headers['x-user'])
    })

    app.decorate('getApplicationById', async (id) => {
      return applications[id] || null
    })

    if (opts.actuationPlan !== undefined) {
      app.decorate('planVersionActuation', async (applicationId, versionLabel) => {
        return typeof opts.actuationPlan === 'function'
          ? opts.actuationPlan(applicationId, versionLabel)
          : opts.actuationPlan
      })
    }

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

    if (opts.rpsByVersion) {
      app.decorate('getVersionRPS', async (appLabel, versionLabel) => {
        return opts.rpsByVersion[versionLabel] ?? null
      })
    }

    app.decorate('expireAndCleanup', async (version, ctx) => {
      const result = await app.expireVersion(version.appLabel, version.versionLabel, ctx)
      if (!result.expired) return result

      if (app.applyHTTPRoute && result.activeVersion) {
        await app.applyHTTPRoute({
          appName: version.appLabel,
          namespace: version.namespace,
          pathPrefix: version.pathPrefix,
          hostname: version.hostname || null,
          productionVersion: result.activeVersion,
          drainingVersions: result.drainingVersions
        }, ctx)
      }

      return result
    })
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
      controllerName: 'my-app-v1',
      serviceName: 'my-app-v1-svc',
      servicePort: 3042,
      namespace: 'platformatic',
      pathPrefix: '/my-app',
      hostname: null,
      status: 'draining',
      expirePolicy: 'http-traffic',
      createdAt: '2026-01-01T00:00:00.000Z',
      expiredAt: null
    },
    {
      id: '2',
      applicationId: APP_ID,
      appLabel: 'my-app',
      versionLabel: 'v2',
      controllerName: 'my-app-v2',
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
  assert.strictEqual(result.totalCount, 2)
  // Active version is ordered first regardless of creation time.
  assert.strictEqual(result.versions[0].versionLabel, 'v2')
  assert.strictEqual(result.versions[0].status, 'active')
  assert.strictEqual(result.versions[1].versionLabel, 'v1')
  assert.strictEqual(result.versions[1].expirePolicy, 'http-traffic')
})

test('GET /applications/:id/versions paginates server-side with limit/offset', async (t) => {
  const versions = makeVersions()
  const { app } = buildApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    versions
  })
  await app.ready()
  t.after(() => app.close())

  // Page 0 holds the active version (ordered first), page 1 the draining one.
  const first = await app.inject({ url: `/applications/${APP_ID}/versions?limit=1&offset=0` })
  assert.strictEqual(first.statusCode, 200)
  const firstResult = JSON.parse(first.body)
  assert.strictEqual(firstResult.versions.length, 1)
  assert.strictEqual(firstResult.totalCount, 2)
  assert.strictEqual(firstResult.versions[0].versionLabel, 'v2')

  const second = await app.inject({ url: `/applications/${APP_ID}/versions?limit=1&offset=1` })
  const secondResult = JSON.parse(second.body)
  assert.strictEqual(secondResult.versions.length, 1)
  assert.strictEqual(secondResult.totalCount, 2)
  assert.strictEqual(secondResult.versions[0].versionLabel, 'v1')
})

test('GET /applications/:id/versions/rps reports active, draining and staged; skips expired', async (t) => {
  // v1 draining, v2 active, plus a staged (preview-traffic) and an expired one.
  const versions = [
    ...makeVersions(),
    {
      id: '3',
      applicationId: APP_ID,
      appLabel: 'my-app',
      versionLabel: 'v3',
      controllerName: 'my-app-v3',
      serviceName: 'my-app-v3-svc',
      servicePort: 3042,
      namespace: 'platformatic',
      pathPrefix: '/my-app',
      hostname: null,
      status: 'staged',
      createdAt: '2026-01-03T00:00:00.000Z',
      expiredAt: null
    },
    {
      id: '4',
      applicationId: APP_ID,
      appLabel: 'my-app',
      versionLabel: 'v0',
      controllerName: 'my-app-v0',
      serviceName: 'my-app-v0-svc',
      servicePort: 3042,
      namespace: 'platformatic',
      pathPrefix: '/my-app',
      hostname: null,
      status: 'expired',
      createdAt: '2025-12-31T00:00:00.000Z',
      expiredAt: '2026-01-01T00:00:00.000Z'
    }
  ]
  const { app } = buildApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    versions,
    rpsByVersion: { v1: 2.5, v2: 97.5, v3: 0.3, v0: 5 }
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode, body } = await app.inject({
    url: `/applications/${APP_ID}/versions/rps`
  })

  assert.strictEqual(statusCode, 200)
  const result = JSON.parse(body)
  // The static `rps` path resolves to this route, not GET /versions/:versionLabel.
  assert.ok(Array.isArray(result.rps))
  assert.strictEqual(result.rps.length, 3)

  const byLabel = Object.fromEntries(result.rps.map(r => [r.versionLabel, r]))
  assert.strictEqual(byLabel.v2.status, 'active')
  assert.strictEqual(byLabel.v2.rps, 97.5)
  assert.strictEqual(byLabel.v1.status, 'draining')
  assert.strictEqual(byLabel.v1.rps, 2.5)
  // Staged reports its preview traffic.
  assert.strictEqual(byLabel.v3.status, 'staged')
  assert.strictEqual(byLabel.v3.rps, 0.3)
  // Expired has no workload -> never reported, even if the metric reader returns a value.
  assert.strictEqual(byLabel.v0, undefined)
})

test('GET /applications/:id/versions/rps returns null rps when the metric reader is absent', async (t) => {
  const versions = makeVersions()
  const { app } = buildApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    versions
    // no rpsByVersion -> app.getVersionRPS is not decorated (skew metric off)
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode, body } = await app.inject({
    url: `/applications/${APP_ID}/versions/rps`
  })

  assert.strictEqual(statusCode, 200)
  const result = JSON.parse(body)
  assert.strictEqual(result.rps.length, 2)
  for (const entry of result.rps) {
    assert.strictEqual(entry.rps, null)
  }
})

test('GET /applications/:id/versions/rps returns 404 for unknown app', async (t) => {
  const { app } = buildApp()
  await app.ready()
  t.after(() => app.close())

  const { statusCode } = await app.inject({
    url: '/applications/unknown-id/versions/rps'
  })

  assert.strictEqual(statusCode, 404)
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

test('POST expire returns 400 for a non-expirable version (already expired)', async (t) => {
  const versions = makeVersions()
  versions.push({ ...versions[0], id: '9', versionLabel: 'v0', status: 'expired' })
  const { app } = buildApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    versions
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode } = await app.inject({
    method: 'POST',
    url: `/applications/${APP_ID}/versions/v0/expire`
  })

  assert.strictEqual(statusCode, 400)
})

test('POST expire returns 400 for the active version (not directly expirable)', async (t) => {
  const versions = makeVersions() // v2 is active
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

// --- actuation-plan (app-scoped and token-scoped) ---

const expirePlan = { intent: 'expire', steps: [{ kind: 'HTTPRoute', action: 'apply', manifest: { metadata: { name: 'my-app' } } }] }

test('GET /applications/:id/versions/:v/actuation-plan returns the plan', async (t) => {
  const { app } = buildApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    actuationPlan: expirePlan
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode, body } = await app.inject({ url: `/applications/${APP_ID}/versions/v1/actuation-plan` })
  assert.strictEqual(statusCode, 200)
  assert.deepStrictEqual(JSON.parse(body), expirePlan)
})

test('GET /versions/:v/actuation-plan (token-scoped) resolves the app from the token', async (t) => {
  const seen = []
  const { app } = buildApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    actuationPlan: (applicationId, versionLabel) => { seen.push({ applicationId, versionLabel }); return expirePlan }
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode, body } = await app.inject({
    url: '/versions/v1/actuation-plan',
    headers: { 'x-user': JSON.stringify({ type: 'deploy-token', applicationId: APP_ID }) }
  })
  assert.strictEqual(statusCode, 200)
  assert.deepStrictEqual(JSON.parse(body), expirePlan)
  assert.deepStrictEqual(seen, [{ applicationId: APP_ID, versionLabel: 'v1' }])
})

test('GET /versions/:v/actuation-plan (token-scoped) is a 400 without a token principal', async (t) => {
  const { app } = buildApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    actuationPlan: expirePlan
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode } = await app.inject({ url: '/versions/v1/actuation-plan' })
  assert.strictEqual(statusCode, 400)
})

// --- Skew protection policy routes ---

function buildPolicyApp (opts = {}) {
  const app = fastify({ logger: false })
  const applications = opts.applications || {}
  const versionStore = opts.versions || []
  const policyStore = opts.policyStore || []
  const disableCalls = []
  let policyIdCounter = 0

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

    app.decorate('expireVersion', async () => ({
      expired: false, activeVersion: null, drainingVersions: []
    }))

    app.decorate('expireAndCleanup', async () => ({
      expired: false, activeVersion: null, drainingVersions: []
    }))

    app.decorate('resolveSkewPolicy', async (applicationId) => {
      const row = policyStore.find(r => r.applicationId === applicationId)
      return {
        httpGracePeriodMs: row?.httpGracePeriodMs ?? 1800000,
        httpMaxAliveMs: row?.httpMaxAliveMs ?? 86400000,
        workflowGracePeriodMs: row?.workflowGracePeriodMs ?? 3600000,
        workflowMaxAliveMs: row?.workflowMaxAliveMs ?? 259200000,
        maxAgeS: row?.maxAgeS ?? 43200,
        maxVersions: row?.maxVersions ?? null,
        cookieName: row?.cookieName ?? '__plt_dpl',
        autoCleanup: row?.autoCleanup ?? false,
        enabled: row?.enabled ?? true,
        mode: row?.mode ?? 'observe',
        requiresApproval: row?.requiresApproval ?? false
      }
    })

    app.decorate('applyVersioningDisable', async (applicationId) => {
      disableCalls.push(applicationId)
      return { expired: [] }
    })

    app.decorate('getSkewPolicyOverrides', async (applicationId) => {
      const row = policyStore.find(r => r.applicationId === applicationId)
      return row || null
    })

    app.decorate('saveSkewPolicy', async (applicationId, overrides) => {
      const existing = policyStore.find(r => r.applicationId === applicationId)
      if (existing) {
        Object.assign(existing, overrides)
        existing.updatedAt = new Date().toISOString()
        return existing
      }
      const row = {
        id: String(++policyIdCounter),
        applicationId,
        httpGracePeriodMs: overrides.httpGracePeriodMs ?? null,
        httpMaxAliveMs: overrides.httpMaxAliveMs ?? null,
        workflowGracePeriodMs: overrides.workflowGracePeriodMs ?? null,
        workflowMaxAliveMs: overrides.workflowMaxAliveMs ?? null,
        maxAgeS: overrides.maxAgeS ?? null,
        maxVersions: overrides.maxVersions ?? null,
        cookieName: overrides.cookieName ?? null,
        autoCleanup: overrides.autoCleanup ?? null,
        enabled: overrides.enabled ?? null,
        mode: overrides.mode ?? null,
        requiresApproval: overrides.requiresApproval ?? null,
        updatedAt: new Date().toISOString()
      }
      policyStore.push(row)
      return row
    })
  }, { name: 'mocks' }))

  app.register(versionsRoute)

  return { app, policyStore, disableCalls }
}

test('GET policy returns 404 for unknown app', async (t) => {
  const { app } = buildPolicyApp()
  await app.ready()
  t.after(() => app.close())

  const { statusCode } = await app.inject({
    url: '/applications/unknown-id/skew-protection/policy'
  })

  assert.strictEqual(statusCode, 404)
})

test('GET policy returns defaults when no override exists', async (t) => {
  const { app } = buildPolicyApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } }
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode, body } = await app.inject({
    url: `/applications/${APP_ID}/skew-protection/policy`
  })

  assert.strictEqual(statusCode, 200)
  const result = JSON.parse(body)
  assert.strictEqual(result.overrides, null)
  assert.strictEqual(result.resolved.httpGracePeriodMs, 1800000)
  assert.strictEqual(result.resolved.httpMaxAliveMs, 86400000)
  assert.strictEqual(result.resolved.workflowGracePeriodMs, 3600000)
  assert.strictEqual(result.resolved.workflowMaxAliveMs, 259200000)
  assert.strictEqual(result.resolved.maxAgeS, 43200)
  assert.strictEqual(result.resolved.maxVersions, null)
  assert.strictEqual(result.resolved.cookieName, '__plt_dpl')
  assert.strictEqual(result.resolved.autoCleanup, false)
})

test('PUT policy creates override and returns resolved', async (t) => {
  const { app } = buildPolicyApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } }
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode, body } = await app.inject({
    method: 'PUT',
    url: `/applications/${APP_ID}/skew-protection/policy`,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ httpGracePeriodMs: 5000, maxVersions: 2 })
  })

  assert.strictEqual(statusCode, 200)
  const result = JSON.parse(body)
  assert.strictEqual(result.overrides.httpGracePeriodMs, 5000)
  assert.strictEqual(result.overrides.maxVersions, 2)
  assert.strictEqual(result.overrides.maxAgeS, null)
  assert.strictEqual(result.resolved.httpGracePeriodMs, 5000)
  assert.strictEqual(result.resolved.maxVersions, 2)
  assert.strictEqual(result.resolved.maxAgeS, 43200)
})

test('PUT policy updates existing override', async (t) => {
  const policyStore = [{
    id: '1',
    applicationId: APP_ID,
    httpGracePeriodMs: 5000,
    httpMaxAliveMs: null,
    workflowGracePeriodMs: null,
    workflowMaxAliveMs: null,
    maxAgeS: null,
    maxVersions: null,
    cookieName: null,
    autoCleanup: null
  }]

  const { app } = buildPolicyApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    policyStore
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode, body } = await app.inject({
    method: 'PUT',
    url: `/applications/${APP_ID}/skew-protection/policy`,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ cookieName: 'my_cookie' })
  })

  assert.strictEqual(statusCode, 200)
  const result = JSON.parse(body)
  assert.strictEqual(result.overrides.cookieName, 'my_cookie')
})

test('PUT policy returns 404 for unknown app', async (t) => {
  const { app } = buildPolicyApp()
  await app.ready()
  t.after(() => app.close())

  const { statusCode } = await app.inject({
    method: 'PUT',
    url: '/applications/unknown-id/skew-protection/policy',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ httpGracePeriodMs: 5000 })
  })

  assert.strictEqual(statusCode, 404)
})

// --- Version manager API (promote / approve / reject / detail / plan / bulk) ---

function buildManagerApp (opts = {}) {
  const app = fastify({ logger: false })
  const applications = opts.applications || {}
  const versionStore = opts.versions || []
  const calls = { promote: [], approve: [], reject: [], expire: [] }

  app.register(fp(async (app) => {
    app.decorate('getApplicationById', async (id) => applications[id] || null)

    app.decorate('listVersions', async (applicationId, status) => {
      return versionStore.filter(v => {
        if (v.applicationId !== applicationId) return false
        if (status && v.status !== status) return false
        return true
      })
    })

    app.decorate('getVersion', async (applicationId, versionLabel) => {
      return versionStore.find(
        v => v.applicationId === applicationId && v.versionLabel === versionLabel
      ) || null
    })

    app.decorate('planVersion', async (applicationId, versionLabel) => {
      const v = versionStore.find(
        x => x.applicationId === applicationId && x.versionLabel === versionLabel
      )
      if (!v) return null
      if (v.status === 'active') return { steps: [] }
      return { steps: [{ kind: 'HTTPRoute', action: 'apply', description: 'route default traffic' }] }
    })

    app.decorate('getVersionAudit', async (applicationId, versionLabel) => {
      return (opts.audit || []).filter(
        a => a.applicationId === applicationId && a.versionLabel === versionLabel
      )
    })

    app.decorate('promoteAndApply', async (appLabel, versionLabel) => {
      calls.promote.push({ appLabel, versionLabel })
      return {
        promoted: true,
        activeVersion: { versionId: versionLabel, serviceName: 'svc', port: 3042 },
        drainingVersions: []
      }
    })

    app.decorate('approveAndApply', async (appLabel, versionLabel) => {
      calls.approve.push({ appLabel, versionLabel })
      return {
        approved: true,
        activeVersion: { versionId: versionLabel, serviceName: 'svc', port: 3042 },
        drainingVersions: []
      }
    })

    app.decorate('rejectAndCleanup', async (appLabel, versionLabel) => {
      calls.reject.push({ appLabel, versionLabel })
      return { rejected: true, activeVersion: null, drainingVersions: [] }
    })

    app.decorate('expireAndCleanup', async (version) => {
      calls.expire.push(version.versionLabel)
      version.status = 'expired'
      return { expired: true, activeVersion: null, drainingVersions: [] }
    })
  }, { name: 'manager-mocks' }))

  app.register(versionsRoute)

  return { app, calls, versionStore }
}

test('GET /versions/:versionLabel returns version detail', async (t) => {
  const { app } = buildManagerApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    versions: makeVersions()
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode, body } = await app.inject({ url: `/applications/${APP_ID}/versions/v2` })

  assert.strictEqual(statusCode, 200)
  const result = JSON.parse(body)
  assert.strictEqual(result.version.versionLabel, 'v2')
  assert.strictEqual(result.version.status, 'active')
})

test('GET /versions/:versionLabel returns 404 for unknown version', async (t) => {
  const { app } = buildManagerApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    versions: makeVersions()
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode } = await app.inject({ url: `/applications/${APP_ID}/versions/v99` })
  assert.strictEqual(statusCode, 404)
})

test('GET /versions/:versionLabel/plan returns steps', async (t) => {
  const { app } = buildManagerApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    versions: makeVersions()
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode, body } = await app.inject({ url: `/applications/${APP_ID}/versions/v1/plan` })

  assert.strictEqual(statusCode, 200)
  const result = JSON.parse(body)
  assert.ok(Array.isArray(result.steps))
  assert.strictEqual(result.steps[0].kind, 'HTTPRoute')
})

test('GET plan returns 404 for unknown version', async (t) => {
  const { app } = buildManagerApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    versions: makeVersions()
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode } = await app.inject({ url: `/applications/${APP_ID}/versions/v99/plan` })
  assert.strictEqual(statusCode, 404)
})

test('GET /versions/:versionLabel/audit returns the timeline', async (t) => {
  const { app } = buildManagerApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    versions: makeVersions(),
    audit: [
      { applicationId: APP_ID, versionLabel: 'v1', event: 'registered', fromState: null, toState: 'active', actorType: 'system', actorId: null, actorName: 'system', reason: null, detail: null, createdAt: '2026-01-01T00:00:00.000Z' },
      { applicationId: APP_ID, versionLabel: 'v1', event: 'drained', fromState: 'active', toState: 'draining', actorType: 'user', actorId: '7', actorName: 'alice', reason: 'superseded', detail: null, createdAt: '2026-01-02T00:00:00.000Z' }
    ]
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode, body } = await app.inject({ url: `/applications/${APP_ID}/versions/v1/audit` })

  assert.strictEqual(statusCode, 200)
  const result = JSON.parse(body)
  assert.strictEqual(result.audit.length, 2)
  assert.strictEqual(result.audit[0].event, 'registered')
  assert.strictEqual(result.audit[1].event, 'drained')
  assert.strictEqual(result.audit[1].actorName, 'alice')
})

test('GET audit returns 404 for unknown app', async (t) => {
  const { app } = buildManagerApp()
  await app.ready()
  t.after(() => app.close())

  const { statusCode } = await app.inject({ url: '/applications/nope/versions/v1/audit' })
  assert.strictEqual(statusCode, 404)
})

test('POST /versions/:versionLabel/promote promotes by appLabel', async (t) => {
  const { app, calls } = buildManagerApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    versions: makeVersions()
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode, body } = await app.inject({
    method: 'POST',
    url: `/applications/${APP_ID}/versions/v1/promote`
  })

  assert.strictEqual(statusCode, 200)
  const result = JSON.parse(body)
  assert.strictEqual(result.promoted, true)
  assert.strictEqual(result.activeVersion.versionId, 'v1')
  assert.strictEqual(calls.promote.length, 1)
  assert.strictEqual(calls.promote[0].appLabel, 'my-app')
})

test('POST promote returns 404 for unknown app and unknown version', async (t) => {
  const { app } = buildManagerApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    versions: makeVersions()
  })
  await app.ready()
  t.after(() => app.close())

  const unknownApp = await app.inject({ method: 'POST', url: '/applications/nope/versions/v1/promote' })
  assert.strictEqual(unknownApp.statusCode, 404)

  const unknownVersion = await app.inject({ method: 'POST', url: `/applications/${APP_ID}/versions/v99/promote` })
  assert.strictEqual(unknownVersion.statusCode, 404)
})

test('POST /versions/:versionLabel/approve approves a staged version', async (t) => {
  const versions = makeVersions()
  versions[1].status = 'staged'
  const { app, calls } = buildManagerApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    versions
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode, body } = await app.inject({
    method: 'POST',
    url: `/applications/${APP_ID}/versions/v2/approve`
  })

  assert.strictEqual(statusCode, 200)
  const result = JSON.parse(body)
  assert.strictEqual(result.approved, true)
  assert.strictEqual(calls.approve[0].versionLabel, 'v2')
})

test('POST /versions/:versionLabel/reject rejects a staged version', async (t) => {
  const versions = makeVersions()
  versions[1].status = 'staged'
  const { app, calls } = buildManagerApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    versions
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode, body } = await app.inject({
    method: 'POST',
    url: `/applications/${APP_ID}/versions/v2/reject`
  })

  assert.strictEqual(statusCode, 200)
  const result = JSON.parse(body)
  assert.strictEqual(result.rejected, true)
  assert.strictEqual(calls.reject[0].versionLabel, 'v2')
})

test('POST /versions/expire bulk-expires draining versions', async (t) => {
  const { app, calls } = buildManagerApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    versions: makeVersions()
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode, body } = await app.inject({
    method: 'POST',
    url: `/applications/${APP_ID}/versions/expire`,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ versionLabels: ['v1', 'v99'] })
  })

  assert.strictEqual(statusCode, 200)
  const result = JSON.parse(body)
  assert.deepStrictEqual(result.expired, ['v1'])
  assert.strictEqual(result.skipped.length, 1)
  assert.strictEqual(result.skipped[0].versionLabel, 'v99')
  assert.strictEqual(result.skipped[0].reason, 'not-found')
  assert.deepStrictEqual(calls.expire, ['v1'])
})

test('POST /versions/expire refuses to expire the active version', async (t) => {
  const { app, calls } = buildManagerApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } },
    versions: makeVersions()
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode } = await app.inject({
    method: 'POST',
    url: `/applications/${APP_ID}/versions/expire`,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ versionLabels: ['v2'] })
  })

  assert.strictEqual(statusCode, 400)
  assert.deepStrictEqual(calls.expire, []) // nothing expired — validated up front
})

test('POST /versions/expire returns 404 for unknown app', async (t) => {
  const { app } = buildManagerApp()
  await app.ready()
  t.after(() => app.close())

  const { statusCode } = await app.inject({
    method: 'POST',
    url: '/applications/nope/versions/expire',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ versionLabels: ['v1'] })
  })

  assert.strictEqual(statusCode, 404)
})

// --- Per-app versioning config over the policy API ---

test('GET policy surfaces per-app config defaults (enabled/mode/requiresApproval)', async (t) => {
  const { app } = buildPolicyApp({ applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } } })
  await app.ready()
  t.after(() => app.close())

  const { statusCode, body } = await app.inject({
    url: `/applications/${APP_ID}/skew-protection/policy`
  })

  assert.strictEqual(statusCode, 200)
  const result = JSON.parse(body)
  assert.strictEqual(result.resolved.enabled, true)
  assert.strictEqual(result.resolved.mode, 'observe')
  assert.strictEqual(result.resolved.requiresApproval, false)
})

test('PUT policy sets mode and requiresApproval', async (t) => {
  const { app } = buildPolicyApp({ applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } } })
  await app.ready()
  t.after(() => app.close())

  const { statusCode, body } = await app.inject({
    method: 'PUT',
    url: `/applications/${APP_ID}/skew-protection/policy`,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'manage', requiresApproval: true })
  })

  assert.strictEqual(statusCode, 200)
  const result = JSON.parse(body)
  assert.strictEqual(result.overrides.mode, 'manage')
  assert.strictEqual(result.overrides.requiresApproval, true)
  assert.strictEqual(result.resolved.mode, 'manage')
  assert.strictEqual(result.resolved.requiresApproval, true)
})

test('PUT policy rejects an invalid mode via body schema', async (t) => {
  const { app } = buildPolicyApp({ applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } } })
  await app.ready()
  t.after(() => app.close())

  const { statusCode } = await app.inject({
    method: 'PUT',
    url: `/applications/${APP_ID}/skew-protection/policy`,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'bogus' })
  })

  assert.strictEqual(statusCode, 400)
})

test('PUT policy triggers the disable transition when enabled flips to false', async (t) => {
  const { app, disableCalls } = buildPolicyApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } }
  })
  await app.ready()
  t.after(() => app.close())

  const { statusCode } = await app.inject({
    method: 'PUT',
    url: `/applications/${APP_ID}/skew-protection/policy`,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ enabled: false })
  })

  assert.strictEqual(statusCode, 200)
  assert.deepStrictEqual(disableCalls, [APP_ID])
})

test('PUT policy does not trigger the disable transition while staying enabled', async (t) => {
  const { app, disableCalls } = buildPolicyApp({
    applications: { [APP_ID]: { id: APP_ID, name: 'my-app' } }
  })
  await app.ready()
  t.after(() => app.close())

  await app.inject({
    method: 'PUT',
    url: `/applications/${APP_ID}/skew-protection/policy`,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requiresApproval: true })
  })

  assert.deepStrictEqual(disableCalls, [])
})
