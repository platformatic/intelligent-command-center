'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const { setTimeout: sleep } = require('node:timers/promises')
const { request } = require('undici')
const { startCacheManager, startNextCacheApp } = require('./helper')

test('should update an application nextjs cache', async (t) => {
  const applicationId = randomUUID()
  const cacheManager = await startCacheManager(t)

  const keyPrefix = `${applicationId}:`
  const nextApp = await startNextCacheApp(t, keyPrefix)

  {
    // First request to populate the cache
    const { statusCode, body } = await cacheManager.inject({
      url: `/applications/${applicationId}/http-cache`
    })
    assert.deepStrictEqual(statusCode, 200, body)
    const { client, server } = JSON.parse(body)

    assert.strictEqual(client.length, 0)
    assert.strictEqual(server.length, 0)
  }

  {
    // Second request to update the cache
    const { statusCode } = await request(nextApp.url)
    assert.strictEqual(statusCode, 200)
  }

  // Wait for the cache to be updated
  await sleep(1000)

  const { statusCode, body } = await cacheManager.inject({
    url: `/applications/${applicationId}/http-cache`
  })
  assert.deepStrictEqual(statusCode, 200, body)

  const { client, server } = JSON.parse(body)
  const fetchEntry = client.find((entry) => entry.path === '/time')
  assert.strictEqual(fetchEntry.kind, 'NEXT_CACHE_FETCH')
  assert.strictEqual(fetchEntry.origin, 'http://backend.plt.local')
  assert.strictEqual(fetchEntry.method, 'GET')
  assert.strictEqual(fetchEntry.path, '/time')
  assert.strictEqual(fetchEntry.statusCode, 200)
  assert.strictEqual(typeof fetchEntry.id, 'string')
  assert.strictEqual(typeof fetchEntry.headers, 'object')
  assert.strictEqual(typeof fetchEntry.cachedAt, 'number')
  assert.strictEqual(typeof fetchEntry.deleteAt, 'number')

  const pageEntry = server[0]
  assert.strictEqual(pageEntry.kind, 'NEXT_CACHE_PAGE')
  assert.strictEqual(pageEntry.serviceId, 'frontend')
  assert.strictEqual(pageEntry.route, '/index')
  assert.strictEqual(pageEntry.statusCode, 200)
  assert.strictEqual(typeof pageEntry.id, 'string')
  assert.strictEqual(typeof pageEntry.headers, 'object')
  assert.strictEqual(typeof pageEntry.cachedAt, 'number')
  assert.strictEqual(typeof pageEntry.deleteAt, 'number')
})
