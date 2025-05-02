'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const { request } = require('undici')
const { startCacheManager, startNextCacheApp } = require('./helper')

test('should get an application next cache with search', async (t) => {
  const applicationId = randomUUID()
  const cacheManager = await startCacheManager(t)

  const keyPrefix = `${applicationId}:`
  const nextApp = await startNextCacheApp(t, keyPrefix)

  {
    const { statusCode } = await request(nextApp.url)
    assert.strictEqual(statusCode, 200)
  }

  const { statusCode, body } = await cacheManager.inject({
    url: `/applications/${applicationId}/http-cache`,
    query: { search: '/foo' }
  })
  assert.deepStrictEqual(statusCode, 200, body)

  const { client } = JSON.parse(body)
  assert.strictEqual(client.length, 1)

  const fetchEntry = client[0]
  assert.strictEqual(fetchEntry.kind, 'NEXT_CACHE_FETCH')
  assert.strictEqual(fetchEntry.origin, 'http://backend.plt.local')
  assert.strictEqual(fetchEntry.method, 'GET')
  assert.strictEqual(fetchEntry.path, '/foo')
  assert.strictEqual(fetchEntry.statusCode, 200)
  assert.ok(fetchEntry.headers)
  assert.ok(fetchEntry.id)
  assert.ok(fetchEntry.cachedAt)
  assert.ok(fetchEntry.deleteAt)
})

test('should get an application next cache with search', async (t) => {
  const applicationId = randomUUID()
  const cacheManager = await startCacheManager(t)

  const keyPrefix = `${applicationId}:`
  const nextApp = await startNextCacheApp(t, keyPrefix)

  {
    const { statusCode } = await request(nextApp.url)
    assert.strictEqual(statusCode, 200)
  }

  const { statusCode, body } = await cacheManager.inject({
    url: `/applications/${applicationId}/http-cache`,
    query: { search: '/index' }
  })
  assert.deepStrictEqual(statusCode, 200, body)

  const { server } = JSON.parse(body)
  assert.strictEqual(server.length, 1)

  const pageEntry = server[0]
  assert.strictEqual(pageEntry.kind, 'NEXT_CACHE_PAGE')
  assert.strictEqual(pageEntry.serviceId, 'frontend')
  assert.strictEqual(pageEntry.route, '/index')
  assert.strictEqual(pageEntry.statusCode, 200)
  assert.ok(pageEntry.headers)
  assert.ok(pageEntry.id)
  assert.ok(pageEntry.cachedAt)
  assert.ok(pageEntry.deleteAt)
})
