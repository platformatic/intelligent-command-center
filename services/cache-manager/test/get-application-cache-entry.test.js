'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const { startCacheManager, generateRequests } = require('./helper')

test('should get an application cache entry', async (t) => {
  const applicationId = randomUUID()
  const cacheManager = await startCacheManager(t)

  const keyPrefix = `${applicationId}:`
  const expectedEntries = await generateRequests(t, keyPrefix, [
    { method: 'GET', path: '/test-1' }
  ])

  let entryId = null
  {
    const { statusCode, body } = await cacheManager.inject({
      url: `/applications/${applicationId}/http-cache`
    })
    assert.deepStrictEqual(statusCode, 200, body)

    const { client } = JSON.parse(body)
    entryId = client[0].id
  }

  const { statusCode, body } = await cacheManager.inject({
    url: `/applications/${applicationId}/http-cache/${entryId}`
  })
  assert.deepStrictEqual(statusCode, 200, body)

  const expectedEntry = expectedEntries[0]
  assert.strictEqual(body, expectedEntry.body)
})

test('should return 404 if there are not such key', async (t) => {
  const applicationId = randomUUID()
  const cacheManager = await startCacheManager(t)

  const { statusCode, body } = await cacheManager.inject({
    url: `/applications/${applicationId}/http-cache/foo`
  })
  assert.deepStrictEqual(statusCode, 404)

  const error = JSON.parse(body)
  assert.deepStrictEqual(error, {
    code: 'PLT_CACHE_MANAGER_CACHE_ENTRY_NOT_FOUND',
    error: 'Not Found',
    message: 'Cache entry "foo" is not found',
    statusCode: 404
  })
})

test('should return 400 if cache is not enabled', async (t) => {
  const applicationId = randomUUID()
  const cacheManager = await startCacheManager(t, {
    PLT_FEATURE_CACHE: false
  })

  const { statusCode, body } = await cacheManager.inject({
    url: `/applications/${applicationId}/http-cache/foo`
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
