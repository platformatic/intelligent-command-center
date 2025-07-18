'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const { setTimeout: sleep } = require('node:timers/promises')
const { request } = require('undici')
const { startCacheManager, startNextCacheApp } = require('./helper')

test('should get a nextjs fetch cache entry', async (t) => {
  const applicationId = randomUUID()
  const cacheManager = await startCacheManager(t)

  const keyPrefix = `${applicationId}:`
  const nextApp = await startNextCacheApp(t, keyPrefix)

  {
    // Generate nextjs cache entries
    const { statusCode } = await request(nextApp.url)
    assert.strictEqual(statusCode, 200)
  }

  // Wait for the cache to be populated
  await sleep(1000)

  let entryId = null
  {
    // Get the cache entries
    const { statusCode, body } = await cacheManager.inject({
      url: `/applications/${applicationId}/http-cache`
    })
    assert.deepStrictEqual(statusCode, 200, body)

    const { client } = JSON.parse(body)
    entryId = client.find((entry) => entry.path === '/time').id
  }

  const { statusCode, body } = await cacheManager.inject({
    url: `/applications/${applicationId}/http-cache/${entryId}`,
    query: { kind: 'NEXT_CACHE_FETCH' }
  })
  assert.strictEqual(statusCode, 200, body)
  assert.strictEqual(body, '{"time":"time"}')
})

test('should get a nextjs page cache entry', async (t) => {
  const applicationId = randomUUID()
  const cacheManager = await startCacheManager(t)

  const keyPrefix = `${applicationId}:`
  const nextApp = await startNextCacheApp(t, keyPrefix)

  {
    // Generate nextjs cache entries
    const { statusCode } = await request(nextApp.url)
    assert.strictEqual(statusCode, 200)
  }

  // Wait for the cache to be populated
  await sleep(1000)

  let entryId = null
  {
    // Get the cache entries
    const { statusCode, body } = await cacheManager.inject({
      url: `/applications/${applicationId}/http-cache`
    })
    assert.deepStrictEqual(statusCode, 200, body)

    const { server } = JSON.parse(body)
    entryId = server[0].id
  }

  const { statusCode, body } = await cacheManager.inject({
    url: `/applications/${applicationId}/http-cache/${entryId}`,
    query: { kind: 'NEXT_CACHE_PAGE' }
  })
  assert.strictEqual(statusCode, 200, body)
  assert.strictEqual(typeof body, 'string')
})

test('should return 400 if cache is not enabled', async (t) => {
  const applicationId = randomUUID()
  const cacheManager = await startCacheManager(t, {
    PLT_FEATURE_CACHE: false
  })

  const { statusCode, body } = await cacheManager.inject({
    url: `/applications/${applicationId}/http-cache/foo`,
    query: { kind: 'NEXT_CACHE_FETCH' }
  })
  assert.deepStrictEqual(statusCode, 400)

  const error = JSON.parse(body)
  assert.deepStrictEqual(error, {
    code: 'PLT_CACHE_MANAGER_CACHE_NOT_ENABLED',
    error: 'Bad Request',
    message: 'Cache is not enabled',
    statusCode: 400
  })
})
