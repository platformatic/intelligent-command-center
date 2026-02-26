'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const fastify = require('fastify')
const fp = require('fastify-plugin')
const gatewayPlugin = require('../plugins/gateway')

const skewPolicyPlugin = require('../plugins/skew-policy')

function buildApp (env, machinistMock, opts = {}) {
  const app = fastify({ logger: false })

  app.register(fp(async (app) => {
    app.decorate('env', env)
  }, { name: 'env' }))

  app.register(fp(async (app) => {
    app.decorate('machinist', machinistMock)
  }, { name: 'machinist' }))

  if (opts.withSkewPolicy) {
    const policyStore = opts.policyStore || []
    let idCounter = 0
    app.register(fp(async (app) => {
      app.decorate('platformatic', {
        entities: {
          skewProtectionPolicy: {
            find: async ({ where }) => {
              return policyStore.filter(row => {
                for (const [key, condition] of Object.entries(where)) {
                  if (condition.eq !== undefined && row[key] !== condition.eq) return false
                }
                return true
              })
            },
            save: async ({ input }) => {
              if (input.id) {
                const idx = policyStore.findIndex(r => r.id === input.id)
                if (idx !== -1) {
                  policyStore[idx] = { ...policyStore[idx], ...input }
                  return policyStore[idx]
                }
              }
              const row = { id: String(++idCounter), ...input }
              policyStore.push(row)
              return row
            }
          }
        }
      })
    }, { name: 'platformatic-db' }))
    app.register(skewPolicyPlugin)
  } else {
    app.register(fp(async () => {}, { name: 'skew-policy', dependencies: ['env'] }))
  }

  app.register(gatewayPlugin)

  return app
}

const mockCtx = {
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {}
  }
}

test('should not register decorators when feature is disabled', async (t) => {
  const app = buildApp({ PLT_FEATURE_SKEW_PROTECTION: '' }, {})
  await app.ready()
  t.after(() => app.close())

  assert.strictEqual(app.applyHTTPRoute, undefined)
  assert.strictEqual(app.deleteHTTPRoute, undefined)
})

test('should register decorators when feature is enabled', async (t) => {
  const app = buildApp(
    { PLT_FEATURE_SKEW_PROTECTION: 'true' },
    { listGateways: () => [], applyHTTPRoute: () => {}, deleteHTTPRoute: () => {} }
  )
  await app.ready()
  t.after(() => app.close())

  assert.strictEqual(typeof app.applyHTTPRoute, 'function')
  assert.strictEqual(typeof app.deleteHTTPRoute, 'function')
})

test('applyHTTPRoute should discover gateway and call machinist', async (t) => {
  const appliedRoutes = []
  const app = buildApp(
    { PLT_FEATURE_SKEW_PROTECTION: 'true' },
    {
      listGateways: () => [{
        metadata: { name: 'platform-gateway', namespace: 'platformatic' }
      }],
      applyHTTPRoute: (namespace, httpRoute) => {
        appliedRoutes.push({ namespace, httpRoute })
        return httpRoute
      }
    }
  )
  await app.ready()
  t.after(() => app.close())

  const result = await app.applyHTTPRoute({
    appName: 'myapp',
    namespace: 'platformatic',
    pathPrefix: '/myapp',
    productionVersion: { versionId: 'v1.0.0', serviceName: 'myapp-v1', port: 3042 },
    drainingVersions: []
  }, mockCtx)

  assert.strictEqual(appliedRoutes.length, 1)
  assert.strictEqual(appliedRoutes[0].namespace, 'platformatic')
  assert.strictEqual(appliedRoutes[0].httpRoute.metadata.name, 'myapp')
  assert.strictEqual(appliedRoutes[0].httpRoute.spec.rules.length, 1)
  assert.ok(result)
})

test('applyHTTPRoute should return null when no gateway found', async (t) => {
  const app = buildApp(
    { PLT_FEATURE_SKEW_PROTECTION: 'true' },
    { listGateways: () => [] }
  )
  await app.ready()
  t.after(() => app.close())

  const result = await app.applyHTTPRoute({
    appName: 'myapp',
    namespace: 'platformatic',
    pathPrefix: '/myapp',
    productionVersion: { versionId: 'v1.0.0', serviceName: 'myapp-v1', port: 3042 },
    drainingVersions: []
  }, mockCtx)

  assert.strictEqual(result, null)
})

test('applyHTTPRoute should cache gateway across calls', async (t) => {
  let listGatewaysCalls = 0
  const app = buildApp(
    { PLT_FEATURE_SKEW_PROTECTION: 'true' },
    {
      listGateways: () => {
        listGatewaysCalls++
        return [{ metadata: { name: 'platform-gateway', namespace: 'platformatic' } }]
      },
      applyHTTPRoute: (namespace, httpRoute) => httpRoute
    }
  )
  await app.ready()
  t.after(() => app.close())

  const opts = {
    appName: 'myapp',
    namespace: 'platformatic',
    pathPrefix: '/myapp',
    productionVersion: { versionId: 'v1.0.0', serviceName: 'myapp-v1', port: 3042 },
    drainingVersions: []
  }

  await app.applyHTTPRoute(opts, mockCtx)
  await app.applyHTTPRoute(opts, mockCtx)
  await app.applyHTTPRoute(opts, mockCtx)

  assert.strictEqual(listGatewaysCalls, 1)
})

test('applyHTTPRoute should pass hostname when provided', async (t) => {
  const appliedRoutes = []
  const app = buildApp(
    { PLT_FEATURE_SKEW_PROTECTION: 'true' },
    {
      listGateways: () => [{
        metadata: { name: 'platform-gateway', namespace: 'platformatic' }
      }],
      applyHTTPRoute: (namespace, httpRoute) => {
        appliedRoutes.push({ namespace, httpRoute })
        return httpRoute
      }
    }
  )
  await app.ready()
  t.after(() => app.close())

  await app.applyHTTPRoute({
    appName: 'myapp',
    namespace: 'platformatic',
    pathPrefix: '/myapp',
    hostname: 'myapp.example.com',
    productionVersion: { versionId: 'v1.0.0', serviceName: 'myapp-v1', port: 3042 },
    drainingVersions: []
  }, mockCtx)

  assert.deepStrictEqual(appliedRoutes[0].httpRoute.spec.hostnames, ['myapp.example.com'])
})

test('applyHTTPRoute should omit hostname when not provided', async (t) => {
  const appliedRoutes = []
  const app = buildApp(
    { PLT_FEATURE_SKEW_PROTECTION: 'true' },
    {
      listGateways: () => [{
        metadata: { name: 'platform-gateway', namespace: 'platformatic' }
      }],
      applyHTTPRoute: (namespace, httpRoute) => {
        appliedRoutes.push({ namespace, httpRoute })
        return httpRoute
      }
    }
  )
  await app.ready()
  t.after(() => app.close())

  await app.applyHTTPRoute({
    appName: 'myapp',
    namespace: 'platformatic',
    pathPrefix: '/myapp',
    productionVersion: { versionId: 'v1.0.0', serviceName: 'myapp-v1', port: 3042 },
    drainingVersions: []
  }, mockCtx)

  assert.strictEqual(appliedRoutes[0].httpRoute.spec.hostnames, undefined)
})

test('applyHTTPRoute should resolve per-app policy for cookieName and maxAgeS', async (t) => {
  const policyStore = [{
    id: '1',
    applicationId: 'app-1',
    cookieName: 'custom_cookie',
    maxAgeS: 999,
    gracePeriodMs: null,
    maxVersions: null,
    autoCleanup: null
  }]
  const appliedRoutes = []
  const app = buildApp(
    {
      PLT_FEATURE_SKEW_PROTECTION: 'true',
      PLT_SKEW_COOKIE_MAX_AGE: 43200,
      PLT_SKEW_GRACE_PERIOD_MS: 86400000,
      PLT_SKEW_AUTO_CLEANUP: false
    },
    {
      listGateways: () => [{
        metadata: { name: 'platform-gateway', namespace: 'platformatic' }
      }],
      applyHTTPRoute: (namespace, httpRoute) => {
        appliedRoutes.push({ namespace, httpRoute })
        return httpRoute
      }
    },
    { withSkewPolicy: true, policyStore }
  )
  await app.ready()
  t.after(() => app.close())

  await app.applyHTTPRoute({
    appName: 'myapp',
    namespace: 'platformatic',
    pathPrefix: '/myapp',
    productionVersion: { versionId: 'v1.0.0', serviceName: 'myapp-v1', port: 3042 },
    drainingVersions: [{
      versionId: 'v0.9.0',
      serviceName: 'myapp-v0.9',
      port: 3042
    }],
    applicationId: 'app-1'
  }, mockCtx)

  assert.strictEqual(appliedRoutes.length, 1)
  const httpRoute = appliedRoutes[0].httpRoute

  // Cookie regex should use custom cookie name
  const cookieRule = httpRoute.spec.rules[0]
  assert.ok(cookieRule.matches[0].headers[0].value.includes('custom_cookie='))

  // Set-Cookie should use custom cookie name and custom max age
  const defaultRule = httpRoute.spec.rules[2]
  const setCookie = defaultRule.filters[1].responseHeaderModifier.add[0]
  assert.ok(setCookie.value.startsWith('custom_cookie='))
  assert.ok(setCookie.value.includes('Max-Age=999'))
})

test('applyHTTPRoute should use global defaults when no applicationId', async (t) => {
  const appliedRoutes = []
  const app = buildApp(
    {
      PLT_FEATURE_SKEW_PROTECTION: 'true',
      PLT_SKEW_COOKIE_MAX_AGE: 43200,
      PLT_SKEW_GRACE_PERIOD_MS: 86400000,
      PLT_SKEW_AUTO_CLEANUP: false
    },
    {
      listGateways: () => [{
        metadata: { name: 'platform-gateway', namespace: 'platformatic' }
      }],
      applyHTTPRoute: (namespace, httpRoute) => {
        appliedRoutes.push({ namespace, httpRoute })
        return httpRoute
      }
    },
    { withSkewPolicy: true }
  )
  await app.ready()
  t.after(() => app.close())

  await app.applyHTTPRoute({
    appName: 'myapp',
    namespace: 'platformatic',
    pathPrefix: '/myapp',
    productionVersion: { versionId: 'v1.0.0', serviceName: 'myapp-v1', port: 3042 },
    drainingVersions: []
  }, mockCtx)

  assert.strictEqual(appliedRoutes.length, 1)
  const httpRoute = appliedRoutes[0].httpRoute
  const defaultRule = httpRoute.spec.rules[0]
  const setCookie = defaultRule.filters[1].responseHeaderModifier.add[0]
  assert.ok(setCookie.value.includes('Max-Age=43200'))
  assert.ok(setCookie.value.startsWith('__plt_dpl='))
})

test('deleteHTTPRoute should call machinist with correct route name', async (t) => {
  const deletedRoutes = []
  const app = buildApp(
    { PLT_FEATURE_SKEW_PROTECTION: 'true' },
    {
      listGateways: () => [],
      deleteHTTPRoute: (namespace, routeName) => {
        deletedRoutes.push({ namespace, routeName })
      }
    }
  )
  await app.ready()
  t.after(() => app.close())

  await app.deleteHTTPRoute('myapp', 'platformatic', mockCtx)

  assert.strictEqual(deletedRoutes.length, 1)
  assert.strictEqual(deletedRoutes[0].namespace, 'platformatic')
  assert.strictEqual(deletedRoutes[0].routeName, 'myapp')
})
