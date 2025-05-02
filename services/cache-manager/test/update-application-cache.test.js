'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const { startCacheManager, generateRequests } = require('./helper')

test('should update an application cache', async (t) => {
  const applicationId = randomUUID()
  const cacheManager = await startCacheManager(t)

  const keyPrefix = `${applicationId}:`

  // Generate requests before making the first request to the cache manager
  const expectedEntries1 = await generateRequests(t, keyPrefix, [
    { method: 'GET', path: '/test-1' }
  ])

  {
    const { statusCode, body } = await cacheManager.inject({
      url: `/applications/${applicationId}/http-cache`
    })
    assert.deepStrictEqual(statusCode, 200, body)

    const { client: clientEntries } = JSON.parse(body)
    assert.strictEqual(clientEntries.length, 1)

    const entry = clientEntries[0]
    const expectedEntry = expectedEntries1[0]

    assert.strictEqual(entry.kind, 'HTTP_CACHE')
    assert.strictEqual(typeof entry.id, 'string')
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
  }

  // Generate requests after making the first request to the cache manager
  const expectedEntries2 = await generateRequests(t, keyPrefix, [
    { method: 'GET', path: '/test-2' }
  ])

  {
    const { statusCode, body } = await cacheManager.inject({
      url: `/applications/${applicationId}/http-cache`
    })
    assert.deepStrictEqual(statusCode, 200, body)

    const { client: clientEntries } = JSON.parse(body)
    assert.strictEqual(clientEntries.length, 2)

    const entry1 = clientEntries.find((entry) => entry.path === '/test-1')
    const entry2 = clientEntries.find((entry) => entry.path === '/test-2')

    const expectedEntry1 = expectedEntries1[0]
    const expectedEntry2 = expectedEntries2[0]

    assert.strictEqual(entry1.kind, 'HTTP_CACHE')
    assert.strictEqual(typeof entry1.id, 'string')
    // assert.strictEqual(entry1.origin, expectedEntry1.origin)
    assert.strictEqual(entry1.method, expectedEntry1.method)
    assert.strictEqual(entry1.path, expectedEntry1.path)
    assert.strictEqual(entry1.statusCode, expectedEntry1.statusCode)
    assert.strictEqual(
      entry1.headers['cache-control'],
      expectedEntry1.headers['cache-control']
    )
    assert.strictEqual(
      entry1.headers['cache-tag'],
      expectedEntry1.headers['cache-tag']
    )
    assert.ok(entry1.cachedAt)
    assert.ok(entry1.deleteAt)

    assert.strictEqual(entry2.kind, 'HTTP_CACHE')
    assert.strictEqual(typeof entry2.id, 'string')
    assert.strictEqual(entry2.origin, expectedEntry2.origin)
    assert.strictEqual(entry2.method, expectedEntry2.method)
    assert.strictEqual(entry2.path, expectedEntry2.path)
    assert.strictEqual(entry2.statusCode, expectedEntry2.statusCode)
    assert.strictEqual(
      entry2.headers['cache-control'],
      expectedEntry2.headers['cache-control']
    )
    assert.strictEqual(
      entry2.headers['cache-tag'],
      expectedEntry2.headers['cache-tag']
    )
    assert.ok(entry2.cachedAt)
    assert.ok(entry2.deleteAt)
  }
})
