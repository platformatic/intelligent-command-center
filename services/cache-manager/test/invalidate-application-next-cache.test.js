'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const { setTimeout: sleep } = require('node:timers/promises')
const { request } = require('undici')
const { startCacheManager, startNextCacheApp } = require('./helper')

test('should invalidate next cache store entries', async (t) => {
  const applicationId = randomUUID()
  const cacheManager = await startCacheManager(t)

  const keyPrefix = `${applicationId}:`
  const nextApp = await startNextCacheApp(t, keyPrefix)

  {
    // Generate nextjs cache entries
    const { statusCode } = await request(nextApp.url)
    assert.strictEqual(statusCode, 200)
  }

  let client = null
  let server = null
  {
    // Check that the cache store entries are present
    const { statusCode, body } = await cacheManager.inject({
      url: `/applications/${applicationId}/http-cache`
    })
    assert.deepStrictEqual(statusCode, 200, body)

    const entries = JSON.parse(body)
    client = entries.client
    server = entries.server
    assert.strictEqual(client.length, 4)
  }

  {
    const clientEntry = client.find((entry) => entry.path === '/time')
    const serverEntry = server[0]

    // Invalidate the cache store entries
    const { statusCode, body } = await cacheManager.inject({
      method: 'POST',
      url: `/applications/${applicationId}/http-cache/invalidate`,
      body: { nextCacheIds: [clientEntry.id, serverEntry.id] }
    })
    assert.deepStrictEqual(statusCode, 200, body)
  }

  // Wait for the invalidation to be processed
  await sleep(1000)

  {
    // Check that the cache store entries are not present
    const { statusCode, body } = await cacheManager.inject({
      url: `/applications/${applicationId}/http-cache`
    })
    assert.deepStrictEqual(statusCode, 200, body)

    const { client, server } = JSON.parse(body)
    assert.strictEqual(client.length, 3)
    assert.strictEqual(server.length, 0)

    const entry = client.find((entry) => entry.path === '/time')
    assert.strictEqual(entry, undefined)
  }
})
