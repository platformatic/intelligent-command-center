'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const { startCacheManager, generateRequests } = require('./helper')

test('should get an application cache', async (t) => {
  const applicationId = randomUUID()
  const cacheManager = await startCacheManager(t)

  const keyPrefix = `${applicationId}:`
  const expectedEntries = await generateRequests(t, keyPrefix, [
    { method: 'GET', path: '/foo' },
    { method: 'GET', path: '/bar' },
    { method: 'GET', path: '/123' }
  ])

  const { statusCode, body } = await cacheManager.inject({
    url: `/applications/${applicationId}/http-cache`,
    query: { search: '/foo' }
  })
  assert.deepStrictEqual(statusCode, 200, body)

  const { client } = JSON.parse(body)
  assert.strictEqual(client.length, 1)

  const entry = client[0]
  const expectedEntry = expectedEntries.find((e) => e.path === '/foo')

  assert.strictEqual(entry.kind, 'HTTP_CACHE')
  assert.strictEqual(entry.origin, expectedEntry.origin)
  assert.strictEqual(entry.method, expectedEntry.method)
  assert.strictEqual(entry.path, expectedEntry.path)
  assert.strictEqual(entry.statusCode, expectedEntry.statusCode)
  assert.strictEqual(
    entry.headers['cache-control'],
    expectedEntry.headers['cache-control']
  )
  assert.strictEqual(
    entry.headers['cache-tag'],
    expectedEntry.headers['cache-tag']
  )
  assert.ok(entry.cachedAt)
  assert.ok(entry.deleteAt)
})
