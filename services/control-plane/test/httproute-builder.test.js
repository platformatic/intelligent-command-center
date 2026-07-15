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
    value: '__plt_dpl=v2.0.0-prod; Path=/myapp; HttpOnly; Secure; SameSite=Lax; Max-Age=43200'
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
    '(.*;\\s*)?__plt_dpl=v1\\.0\\.0-old(\\s*;.*)?'
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
    '(.*;\\s*)?__plt_dpl=v1\\.0\\.0-aaa(\\s*;.*)?'
  )
  assert.strictEqual(route.spec.rules[0].backendRefs[0].name, 'myapp-v1.0.0')

  // First draining version header rule
  assert.strictEqual(route.spec.rules[1].matches[0].headers[0].value, 'v1.0.0-aaa')
  assert.strictEqual(route.spec.rules[1].backendRefs[0].name, 'myapp-v1.0.0')

  // Second draining version cookie rule
  assert.strictEqual(
    route.spec.rules[2].matches[0].headers[0].value,
    '(.*;\\s*)?__plt_dpl=v1\\.5\\.0-bbb(\\s*;.*)?'
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
  // Gateway controllers (e.g. Envoy) evaluate a RegularExpression header match as
  // a FULL-string match over the entire Cookie header. Anchor the pattern here to
  // mirror that: a substring (unanchored) check would pass even for a pattern that
  // only matches when our cookie is the sole one present, which is the real bug
  // this rule must avoid (browsers send multiple cookies).
  const re = new RegExp('^' + regex + '$')

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
  // The dots in the label are matched LITERALLY (escaped): a value with other
  // characters in the dot positions must not match. Without escaping, `.` would
  // match any character and over-match this -- the routing bug the escape fixes.
  assert.ok(!re.test('__plt_dpl=v1X2X3-abc123'))
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
  assert.ok(setCookie.value.includes('SameSite=Lax'))
  assert.ok(setCookie.value.includes('Path=/myapp'))
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

test('should use custom cookieName in cookie regex and Set-Cookie header', async () => {
  const route = buildHTTPRoute({
    ...defaultParams,
    cookieName: 'my_cookie',
    drainingVersions: [{
      versionId: 'v1.0.0-old',
      serviceName: 'myapp-v1.0.0',
      port: 3042
    }]
  })

  // Cookie match rule should use custom cookie name
  const cookieRule = route.spec.rules[0]
  assert.strictEqual(
    cookieRule.matches[0].headers[0].value,
    '(.*;\\s*)?my_cookie=v1\\.0\\.0-old(\\s*;.*)?'
  )

  // Set-Cookie header should use custom cookie name
  const defaultRule = route.spec.rules[2]
  const setCookie = defaultRule.filters[1].responseHeaderModifier.add[0]
  assert.ok(setCookie.value.startsWith('my_cookie='))
})

test('should use default cookieName __plt_dpl when not specified', async () => {
  const route = buildHTTPRoute({
    ...defaultParams,
    drainingVersions: [{
      versionId: 'v1.0.0-old',
      serviceName: 'myapp-v1.0.0',
      port: 3042
    }]
  })

  const cookieRule = route.spec.rules[0]
  assert.ok(cookieRule.matches[0].headers[0].value.includes('__plt_dpl='))

  const defaultRule = route.spec.rules[2]
  const setCookie = defaultRule.filters[1].responseHeaderModifier.add[0]
  assert.ok(setCookie.value.startsWith('__plt_dpl='))
})

test('staged version gets a cookie rule + header rule, but no default rule change', async () => {
  const route = buildHTTPRoute({
    ...defaultParams,
    stagedVersions: [{
      versionId: 'v3.0.0-staged',
      serviceName: 'myapp-v3.0.0',
      port: 3042
    }]
  })

  // 2 rules for the staged version (cookie + header) + 1 default rule
  assert.strictEqual(route.spec.rules.length, 3)

  // Staged cookie rule comes first: browser-pinnable via the __plt_dpl cookie a
  // tester sets by hand. This is what makes a staged version testable in a plain
  // browser (a header rule alone cannot be — a browser can't set a header on a
  // navigation).
  const cookieRule = route.spec.rules[0]
  assert.strictEqual(cookieRule.matches[0].headers[0].name, 'Cookie')
  assert.strictEqual(cookieRule.matches[0].headers[0].type, 'RegularExpression')
  assert.strictEqual(
    cookieRule.matches[0].headers[0].value,
    '(.*;\\s*)?__plt_dpl=v3\\.0\\.0-staged(\\s*;.*)?'
  )
  assert.deepStrictEqual(cookieRule.backendRefs, [{ name: 'myapp-v3.0.0', port: 3042 }])
  assert.deepStrictEqual(cookieRule.filters, [URL_REWRITE_FILTER])

  // Staged header rule second: x-deployment-id preview header.
  const previewRule = route.spec.rules[1]
  assert.strictEqual(previewRule.matches[0].headers[0].name, 'x-deployment-id')
  assert.strictEqual(previewRule.matches[0].headers[0].type, 'Exact')
  assert.strictEqual(previewRule.matches[0].headers[0].value, 'v3.0.0-staged')
  assert.deepStrictEqual(previewRule.backendRefs, [{ name: 'myapp-v3.0.0', port: 3042 }])

  // The staged version must NOT have a default rule — no ordinary client (which
  // never holds a staged cookie) can reach it; only an explicit opt-in does.
  const defaultRule = route.spec.rules[2]
  assert.deepStrictEqual(defaultRule.matches, [{ path: { type: 'PathPrefix', value: '/myapp' } }])
  assert.strictEqual(defaultRule.backendRefs[0].name, 'myapp-v2.0.0')
})

test('staged rules precede draining rules and the default rule', async () => {
  const route = buildHTTPRoute({
    ...defaultParams,
    drainingVersions: [{ versionId: 'v1.0.0-old', serviceName: 'myapp-v1.0.0', port: 3042 }],
    stagedVersions: [{ versionId: 'v3.0.0-staged', serviceName: 'myapp-v3.0.0', port: 3042 }]
  })

  // 2 staged (cookie + header) + 2 draining (cookie + header) + 1 default = 5
  assert.strictEqual(route.spec.rules.length, 5)

  // Staged cookie + header first
  assert.strictEqual(route.spec.rules[0].matches[0].headers[0].name, 'Cookie')
  assert.strictEqual(
    route.spec.rules[0].matches[0].headers[0].value,
    '(.*;\\s*)?__plt_dpl=v3\\.0\\.0-staged(\\s*;.*)?'
  )
  assert.strictEqual(route.spec.rules[1].matches[0].headers[0].name, 'x-deployment-id')
  assert.strictEqual(route.spec.rules[1].matches[0].headers[0].value, 'v3.0.0-staged')

  // Then draining cookie + header rules
  assert.strictEqual(route.spec.rules[2].matches[0].headers[0].name, 'Cookie')
  assert.strictEqual(route.spec.rules[3].matches[0].headers[0].name, 'x-deployment-id')
  assert.strictEqual(route.spec.rules[3].matches[0].headers[0].value, 'v1.0.0-old')

  // Default rule last
  assert.strictEqual(route.spec.rules[4].backendRefs[0].name, 'myapp-v2.0.0')
})

test('should default pathPrefix to / when hostname is provided but pathPrefix is not', async () => {
  const route = buildHTTPRoute({
    appName: 'myapp',
    namespace: 'myapp-ns',
    hostname: 'myapp.example.com',
    gateway: { name: 'platform-gateway', namespace: 'platformatic' },
    productionVersion: {
      versionId: 'v2.0.0-prod',
      serviceName: 'myapp-v2.0.0',
      port: 3042
    },
    drainingVersions: []
  })

  assert.deepStrictEqual(route.spec.hostnames, ['myapp.example.com'])
  assert.deepStrictEqual(route.spec.rules[0].matches, [{
    path: { type: 'PathPrefix', value: '/' }
  }])

  const setCookie = route.spec.rules[0].filters[1].responseHeaderModifier.add[0]
  assert.ok(setCookie.value.includes('Path=/'))
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
