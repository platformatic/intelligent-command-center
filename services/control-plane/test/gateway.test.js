'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const fastify = require('fastify')
const fp = require('fastify-plugin')
const gatewayPlugin = require('../plugins/gateway')

function buildApp (env, machinistMock) {
  const app = fastify({ logger: false })

  app.register(fp(async (app) => {
    app.decorate('env', env)
  }, { name: 'env' }))

  app.register(fp(async (app) => {
    app.decorate('machinist', machinistMock)
  }, { name: 'machinist' }))

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
