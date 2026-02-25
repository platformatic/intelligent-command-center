'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { buildHTTPRoute } = require('../lib/httproute-builder')

const URL_REWRITE_FILTER = {
  type: 'URLRewrite',
  urlRewrite: {
    path: {
      type: 'ReplacePrefixMatch',
      replacePrefixMatch: '/'
    }
  }
}

const defaultParams = {
  appName: 'myapp',
  namespace: 'myapp-ns',
  hostname: 'myapp.example.com',
  pathPrefix: '/myapp',
  gateway: { name: 'platform-gateway', namespace: 'platformatic' },
  productionVersion: {
    versionId: 'v2.0.0-prod',
    serviceName: 'myapp-v2.0.0',
    port: 3042
  },
  drainingVersions: []
}

test('should build HTTPRoute with production version only', async () => {
  const route = buildHTTPRoute(defaultParams)

  assert.strictEqual(route.apiVersion, 'gateway.networking.k8s.io/v1')
  assert.strictEqual(route.kind, 'HTTPRoute')
  assert.strictEqual(route.metadata.name, 'myapp')
  assert.strictEqual(route.metadata.namespace, 'myapp-ns')
  assert.deepStrictEqual(route.metadata.labels, {
    'plt.dev/managed-by': 'icc',
    'plt.dev/application': 'myapp'
  })

  assert.deepStrictEqual(route.spec.parentRefs, [{
    kind: 'Gateway',
    name: 'platform-gateway',
    namespace: 'platformatic'
  }])
  assert.deepStrictEqual(route.spec.hostnames, ['myapp.example.com'])

  assert.strictEqual(route.spec.rules.length, 1)

  const defaultRule = route.spec.rules[0]
  assert.deepStrictEqual(defaultRule.matches, [{
    path: { type: 'PathPrefix', value: '/myapp' }
  }])
  assert.deepStrictEqual(defaultRule.backendRefs, [{
    name: 'myapp-v2.0.0',
    port: 3042
  }])
  assert.strictEqual(defaultRule.filters.length, 2)
  assert.deepStrictEqual(defaultRule.filters[0], URL_REWRITE_FILTER)
  assert.strictEqual(defaultRule.filters[1].type, 'ResponseHeaderModifier')
  assert.deepStrictEqual(defaultRule.filters[1].responseHeaderModifier.add, [{
    name: 'Set-Cookie',
    value: '__plt_dpl=v2.0.0-prod; HttpOnly; Secure; SameSite=Strict; Max-Age=43200'
  }])
})

test('should build HTTPRoute with one draining version', async () => {
  const route = buildHTTPRoute({
    ...defaultParams,
    drainingVersions: [{
      versionId: 'v1.0.0-old',
      serviceName: 'myapp-v1.0.0',
      port: 3042
    }]
  })

  // 2 rules for draining version + 1 default rule
  assert.strictEqual(route.spec.rules.length, 3)

  // Cookie match rule — has path prefix + cookie header
  const cookieRule = route.spec.rules[0]
  assert.deepStrictEqual(cookieRule.matches[0].path, { type: 'PathPrefix', value: '/myapp' })
  assert.strictEqual(cookieRule.matches[0].headers[0].name, 'Cookie')
  assert.strictEqual(cookieRule.matches[0].headers[0].type, 'RegularExpression')
  assert.strictEqual(
    cookieRule.matches[0].headers[0].value,
    '(^|;\\s*)__plt_dpl=v1.0.0-old(;|$)'
  )
  assert.deepStrictEqual(cookieRule.filters, [URL_REWRITE_FILTER])
  assert.deepStrictEqual(cookieRule.backendRefs, [{
    name: 'myapp-v1.0.0',
    port: 3042
  }])

  // x-deployment-id header match rule — has path prefix
  const headerRule = route.spec.rules[1]
  assert.deepStrictEqual(headerRule.matches[0].path, { type: 'PathPrefix', value: '/myapp' })
  assert.strictEqual(headerRule.matches[0].headers[0].name, 'x-deployment-id')
  assert.strictEqual(headerRule.matches[0].headers[0].type, 'Exact')
  assert.strictEqual(headerRule.matches[0].headers[0].value, 'v1.0.0-old')
  assert.deepStrictEqual(headerRule.filters, [URL_REWRITE_FILTER])
  assert.deepStrictEqual(headerRule.backendRefs, [{
    name: 'myapp-v1.0.0',
    port: 3042
  }])

  // Default production rule — has path prefix
  const defaultRule = route.spec.rules[2]
  assert.deepStrictEqual(defaultRule.matches, [{
    path: { type: 'PathPrefix', value: '/myapp' }
  }])
  assert.deepStrictEqual(defaultRule.backendRefs, [{
    name: 'myapp-v2.0.0',
    port: 3042
  }])
  assert.ok(defaultRule.filters)
})

test('should build HTTPRoute with multiple draining versions', async () => {
  const route = buildHTTPRoute({
    ...defaultParams,
    drainingVersions: [
      { versionId: 'v1.0.0-aaa', serviceName: 'myapp-v1.0.0', port: 3042 },
      { versionId: 'v1.5.0-bbb', serviceName: 'myapp-v1.5.0', port: 3042 }
    ]
  })

  // 2 rules per draining version + 1 default = 5
  assert.strictEqual(route.spec.rules.length, 5)

  // All rules should have path prefix
  for (const rule of route.spec.rules) {
    assert.deepStrictEqual(rule.matches[0].path, { type: 'PathPrefix', value: '/myapp' })
  }

  // First draining version cookie rule
  assert.strictEqual(
    route.spec.rules[0].matches[0].headers[0].value,
    '(^|;\\s*)__plt_dpl=v1.0.0-aaa(;|$)'
  )
  assert.strictEqual(route.spec.rules[0].backendRefs[0].name, 'myapp-v1.0.0')

  // First draining version header rule
  assert.strictEqual(route.spec.rules[1].matches[0].headers[0].value, 'v1.0.0-aaa')
  assert.strictEqual(route.spec.rules[1].backendRefs[0].name, 'myapp-v1.0.0')

  // Second draining version cookie rule
  assert.strictEqual(
    route.spec.rules[2].matches[0].headers[0].value,
    '(^|;\\s*)__plt_dpl=v1.5.0-bbb(;|$)'
  )
  assert.strictEqual(route.spec.rules[2].backendRefs[0].name, 'myapp-v1.5.0')

  // Second draining version header rule
  assert.strictEqual(route.spec.rules[3].matches[0].headers[0].value, 'v1.5.0-bbb')
  assert.strictEqual(route.spec.rules[3].backendRefs[0].name, 'myapp-v1.5.0')

  // Default rule is last
  const defaultRule = route.spec.rules[4]
  assert.strictEqual(defaultRule.backendRefs[0].name, 'myapp-v2.0.0')
  assert.ok(defaultRule.filters)
})

test('should use the port from each version', async () => {
  const route = buildHTTPRoute({
    ...defaultParams,
    productionVersion: {
      versionId: 'v2.0.0-prod',
      serviceName: 'myapp-v2.0.0',
      port: 8080
    },
    drainingVersions: [{
      versionId: 'v1.0.0-old',
      serviceName: 'myapp-v1.0.0',
      port: 9090
    }]
  })

  assert.strictEqual(route.spec.rules[0].backendRefs[0].port, 9090)
  assert.strictEqual(route.spec.rules[1].backendRefs[0].port, 9090)
  assert.strictEqual(route.spec.rules[2].backendRefs[0].port, 8080)
})

test('should produce correct cookie regex pattern', async () => {
  const route = buildHTTPRoute({
    ...defaultParams,
    drainingVersions: [{
      versionId: 'v1.2.3-abc123',
      serviceName: 'myapp-v1.2.3',
      port: 3042
    }]
  })

  const regex = route.spec.rules[0].matches[0].headers[0].value
  const re = new RegExp(regex)

  // Cookie is the only one
  assert.ok(re.test('__plt_dpl=v1.2.3-abc123'))
  // Cookie at the start with others after
  assert.ok(re.test('__plt_dpl=v1.2.3-abc123; other=value'))
  // Cookie after another
  assert.ok(re.test('other=value; __plt_dpl=v1.2.3-abc123'))
  // Cookie in the middle
  assert.ok(re.test('a=1; __plt_dpl=v1.2.3-abc123; b=2'))

  // Should not match different version
  assert.ok(!re.test('__plt_dpl=v9.9.9-zzz'))
  // Should not match partial
  assert.ok(!re.test('__plt_dpl=v1.2.3-abc123extra'))
})

test('should set correct Set-Cookie attributes on production rule', async () => {
  const route = buildHTTPRoute(defaultParams)

  const defaultRule = route.spec.rules[0]
  assert.deepStrictEqual(defaultRule.filters[0], URL_REWRITE_FILTER)
  const setCookie = defaultRule.filters[1].responseHeaderModifier.add[0]

  assert.strictEqual(setCookie.name, 'Set-Cookie')
  assert.ok(setCookie.value.includes('__plt_dpl=v2.0.0-prod'))
  assert.ok(setCookie.value.includes('HttpOnly'))
  assert.ok(setCookie.value.includes('Secure'))
  assert.ok(setCookie.value.includes('SameSite=Strict'))
  assert.ok(setCookie.value.includes('Max-Age=43200'))
})

test('should omit hostnames when hostname is not provided', async () => {
  const route = buildHTTPRoute({
    ...defaultParams,
    hostname: null
  })

  assert.strictEqual(route.spec.hostnames, undefined)
  assert.strictEqual(route.spec.rules.length, 1)
  assert.deepStrictEqual(route.spec.rules[0].matches, [{
    path: { type: 'PathPrefix', value: '/myapp' }
  }])
})

test('should include hostnames when hostname is provided', async () => {
  const route = buildHTTPRoute(defaultParams)

  assert.deepStrictEqual(route.spec.hostnames, ['myapp.example.com'])
})

test('should use custom pathPrefix on all rules', async () => {
  const route = buildHTTPRoute({
    ...defaultParams,
    pathPrefix: '/api/leads',
    drainingVersions: [{
      versionId: 'v1.0.0-old',
      serviceName: 'myapp-v1.0.0',
      port: 3042
    }]
  })

  // All 3 rules should use the custom path prefix
  for (const rule of route.spec.rules) {
    assert.deepStrictEqual(rule.matches[0].path, { type: 'PathPrefix', value: '/api/leads' })
  }
})
