'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const isUrlAllowed = require('../lib/k8s-allowed-routes')

function createMockRequest (url, method = 'GET') {
  return {
    url,
    method
  }
}

test('isUrlAllowed returns false for undefined or null URL', async (t) => {
  const undefinedRequest = { method: 'GET' }
  const nullRequest = { url: null, method: 'GET' }

  assert.equal(isUrlAllowed(undefinedRequest), false, 'Should return false for undefined URL')
  assert.equal(isUrlAllowed(nullRequest), false, 'Should return false for null URL')
})

test('isUrlAllowed handles URLs with query parameters correctly', async (t) => {
  const requestWithParams = createMockRequest('/compliance/metadata?param1=value1&param2=value2', 'POST')

  assert.equal(isUrlAllowed(requestWithParams), true, 'Should allow route with query parameters')
})

test('isUrlAllowed handles exact path matches correctly', async (t) => {
  const validRequests = [
    createMockRequest('/cron/watt-jobs', 'PUT'),
    createMockRequest('/risk-service/dump', 'DELETE'),
    createMockRequest('/risk-manager/db-schema', 'POST'),
    createMockRequest('/compliance/metadata', 'POST'),
    createMockRequest('/compliance/compliance', 'POST')
  ]

  for (const req of validRequests) {
    assert.equal(isUrlAllowed(req), true, `Should allow ${req.method} ${req.url}`)
  }

  const invalidMethodRequests = [
    createMockRequest('/cron/watt-jobs', 'POST'),
    createMockRequest('/risk-manager/db-schema', 'GET'),
    createMockRequest('/compliance/metadata', 'GET'),
    createMockRequest('/compliance/compliance', 'GET')
  ]

  for (const req of invalidMethodRequests) {
    assert.equal(isUrlAllowed(req), false, `Should not allow ${req.method} ${req.url}`)
  }
})

test('isUrlAllowed handles pattern matches correctly', async (t) => {
  const validPatternRequests = [
    createMockRequest('/control-plane/pods/pod-123/instance', 'POST'),
    createMockRequest('/control-plane/pods/abc-def-456/instance', 'POST'),
    createMockRequest('/control-plane/pods/pod123/instance/state', 'POST'),
    createMockRequest('/control-plane/pods/complex-name-123/instance/state', 'POST'),
    createMockRequest('/compliance/metadata', 'POST'),
    createMockRequest('/compliance/metadata/additional/path', 'POST')
  ]

  for (const req of validPatternRequests) {
    assert.equal(isUrlAllowed(req), true, `Should allow ${req.method} ${req.url}`)
  }

  const invalidPatternMethodRequests = [
    createMockRequest('/control-plane/pods/pod-123/instance', 'GET'),
    createMockRequest('/control-plane/pods/abc-def-456/instance/state', 'GET'),
    createMockRequest('/compliance/metadata/additional', 'GET')
  ]

  for (const req of invalidPatternMethodRequests) {
    assert.equal(isUrlAllowed(req), false, `Should not allow ${req.method} ${req.url}`)
  }
})

test('isUrlAllowed handles non-matching paths correctly', async (t) => {
  const nonMatchingRequests = [
    createMockRequest('/non-existent-path', 'GET'),
    createMockRequest('/api/unknown', 'POST'),
    createMockRequest('/control-plane/unknown', 'GET'),
    createMockRequest('/control-plane/pods', 'POST'),
    createMockRequest('/control-plane/pods//instance', 'POST'),
    createMockRequest('/control-plane/pods/pod-123', 'POST')
  ]

  for (const req of nonMatchingRequests) {
    assert.equal(isUrlAllowed(req), false, `Should not allow ${req.method} ${req.url}`)
  }
})

test('isUrlAllowed behavior with path extensions', async (t) => {
  const allowedExtendedPaths = [
    createMockRequest('/compliance/metadata/extra/path', 'POST'),
    createMockRequest('/cron/watt-jobs/extra', 'PUT')
  ]

  for (const req of allowedExtendedPaths) {
    assert.equal(isUrlAllowed(req), true, `${req.method} ${req.url} is allowed per the startsWith behavior`)
  }

  const disallowedPaths = [
    createMockRequest('/risk-cold-storage', 'GET'),
    createMockRequest('/trafficante/request', 'POST')
  ]

  for (const req of disallowedPaths) {
    assert.equal(isUrlAllowed(req), false, `${req.method} ${req.url} should not be allowed`)
  }
})

test('isUrlAllowed works with wildcard methods correctly', async (t) => {
  const wildcardMethodTests = [
    { url: '/risk-service/dump', method: 'GET' },
    { url: '/risk-service/dump', method: 'POST' },
    { url: '/risk-service/dump', method: 'PATCH' }
  ]

  for (const { url, method } of wildcardMethodTests) {
    const req = createMockRequest(url, method)
    assert.equal(isUrlAllowed(req), true, `Should allow ${method} ${url} with wildcard method`)
  }
})

test('isUrlAllowed checks method against specific allowed methods', async (t) => {
  const specificMethodTests = [
    { url: '/compliance/metadata', method: 'POST', expected: true },
    { url: '/compliance/metadata', method: 'GET', expected: false },
    { url: '/compliance/compliance', method: 'POST', expected: true },
    { url: '/compliance/compliance', method: 'PUT', expected: false },
    { url: '/risk-cold-storage/sync', method: 'DELETE', expected: false }
  ]

  for (const { url, method, expected } of specificMethodTests) {
    const req = createMockRequest(url, method)
    assert.equal(isUrlAllowed(req), expected,
      `Should ${expected ? 'allow' : 'not allow'} ${method} ${url}`)
  }
})

test('isUrlAllowed handles regex route patterns correctly', async (t) => {
  const podInstanceTests = [
    { url: '/control-plane/pods/pod-123/instance', method: 'POST', expected: true },
    { url: '/control-plane/pods/pod-123/instance', method: 'GET', expected: false },
    { url: '/control-plane/pods/abc123/instance', method: 'POST', expected: true },
    { url: '/control-plane/pods/ABCDEF/instance', method: 'POST', expected: true },
    { url: '/control-plane/pods/1234567890/instance', method: 'POST', expected: true }
  ]

  const podInstanceStateTests = [
    { url: '/control-plane/pods/pod-123/instance/state', method: 'POST', expected: true },
    { url: '/control-plane/pods/pod-123/instance/state', method: 'GET', expected: false },
    { url: '/control-plane/pods/test-pod/instance/state', method: 'POST', expected: true },
    { url: '/control-plane/pods/123456/instance/state', method: 'POST', expected: true },
    { url: '/control-plane/pods/123-abc-def/instance/state', method: 'POST', expected: true }
  ]

  for (const { url, method, expected } of podInstanceTests) {
    const req = createMockRequest(url, method)
    assert.equal(isUrlAllowed(req), expected,
      `Should ${expected ? 'allow' : 'not allow'} ${method} ${url}`)
  }

  for (const { url, method, expected } of podInstanceStateTests) {
    const req = createMockRequest(url, method)
    assert.equal(isUrlAllowed(req), expected,
      `Should ${expected ? 'allow' : 'not allow'} ${method} ${url}`)
  }

  const complianceMetadataTests = [
    { url: '/compliance/metadata', method: 'POST', expected: true },
    { url: '/compliance/metadata/additional', method: 'POST', expected: true },
    { url: '/compliance/metadata/1/2/3', method: 'POST', expected: true },
    { url: '/compliance/metadata', method: 'GET', expected: false },
    { url: '/compliance/metadataextra', method: 'POST', expected: true }
  ]

  for (const { url, method, expected } of complianceMetadataTests) {
    const req = createMockRequest(url, method)
    assert.equal(isUrlAllowed(req), expected,
      `Should ${expected ? 'allow' : 'not allow'} ${method} ${url}`)
  }
})
