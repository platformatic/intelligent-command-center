'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { setTimeout: sleep } = require('node:timers/promises')
const { randomUUID } = require('node:crypto')
const { startCacheManager, generateRequests } = require('./helper')

test('should invalidate cache store entries', async (t) => {
  const applicationId = randomUUID()
  const cacheManager = await startCacheManager(t)

  const keyPrefix = `${applicationId}:`
  await generateRequests(t, keyPrefix, [{ method: 'GET', path: '/test-1' }])

  let entries = null
  {
    // Check that the cache store entries are present
    const { statusCode, body } = await cacheManager.inject({
      url: `/applications/${applicationId}/http-cache`
    })
    assert.deepStrictEqual(statusCode, 200, body)

    const data = JSON.parse(body)
    entries = data.client
    assert.strictEqual(entries.length, 1)
  }

  {
    const entry = entries.find((entry) => entry.path === '/test-1')
    // Invalidate the cache store entries
    const { statusCode, body } = await cacheManager.inject({
      method: 'POST',
      url: `/applications/${applicationId}/http-cache/invalidate`,
      body: {
        httpCacheIds: [entry.id]
      }
    })
    assert.deepStrictEqual(statusCode, 200, body)
  }

  // Wait for the cache to be invalidated
  await sleep(1000)

  {
    // Check that the cache store entries are not present
    const { statusCode, body } = await cacheManager.inject({
      url: `/applications/${applicationId}/http-cache`
    })
    assert.deepStrictEqual(statusCode, 200, body)

    const { client } = JSON.parse(body)
    assert.strictEqual(client.length, 0)
  }
})
