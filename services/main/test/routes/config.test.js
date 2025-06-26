'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { getServer, mockAuthorizeEndpoint } = require('../helper')

test('should return the config', async (t) => {
  const server = await getServer(t, {
    PLT_FEATURE_CACHE: true,
    PLT_FEATURE_CACHE_RECOMMENDATIONS: true,
    PLT_FEATURE_RISK_SERVICE_DUMP: true,
    PLT_FEATURE_FFC: true
  })

  mockAuthorizeEndpoint(null, (method, path, cookie) => {
    assert.equal(cookie, 'AUTH_COOKIE')
    assert.equal(method, 'GET')
    assert.equal(path, '/api/config')
    return {
      user: {},
      authorized: true
    }
  })

  await server.start()

  const { statusCode, headers, body } = await server.inject({
    method: 'GET',
    url: '/api/config',
    headers: {
      cookie: 'auth-cookie-name=AUTH_COOKIE'
    }
  })
  assert.equal(statusCode, 200)
  assert.equal(headers['content-type'], 'application/json; charset=utf-8')
  assert.deepEqual(JSON.parse(body), {
    cache: true,
    'cache-recommendations': true,
    'risk-service-dump': true,
    'fusion-fission-cascade': true
  })
})
