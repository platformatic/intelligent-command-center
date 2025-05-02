'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const { startCacheManager, generateRequests } = require('./helper')

test('should invalidate cache store entries', async (t) => {
  const applicationId1 = randomUUID()
  const applicationId2 = randomUUID()
  const cacheManager = await startCacheManager(t)

  const keyPrefix1 = `${applicationId1}:`
  const keyPrefix2 = `${applicationId2}:`

  await generateRequests(t, keyPrefix1, [
    { method: 'GET', path: '/test-1', cacheTags: ['tag1', 'tag2'] },
    { method: 'GET', path: '/test-2', cacheTags: ['tag1', 'tag2', 'tag4'] },
    { method: 'GET', path: '/test-3', cacheTags: ['tag1', 'tag3', 'tag5'] }
  ])
  await generateRequests(t, keyPrefix2, [
    { method: 'GET', path: '/test-4', cacheTags: ['tag1', 'tag2'] },
    { method: 'GET', path: '/test-5', cacheTags: ['tag2', 'tag1', 'tag6'] },
    { method: 'GET', path: '/test-6', cacheTags: ['tag3', 'tag1', 'tag7'] },
    { method: 'GET', path: '/test-7', cacheTags: ['tag1', 'tag4', 'tag2'] },
    { method: 'GET', path: '/test-8', cacheTags: ['tag1', 'tag4', 'tag2', 'tag8'] }
  ])

  let entries1 = null
  let entries2 = null
  {
    // Check that the cache store entries are present
    const { statusCode, body } = await cacheManager.inject({
      url: `/applications/${applicationId1}/http-cache`
    })
    assert.deepStrictEqual(statusCode, 200, body)

    const data = JSON.parse(body)
    entries1 = data.client
    assert.strictEqual(entries1.length, 3)
  }

  {
    // Check that the cache store entries are present
    const { statusCode, body } = await cacheManager.inject({
      url: `/applications/${applicationId1}/http-cache`
    })
    assert.deepStrictEqual(statusCode, 200, body)

    const data = JSON.parse(body)
    entries2 = data.client
    assert.strictEqual(entries2.length, 3)
  }

  {
    const entry = entries1.find((entry) => entry.path === '/test-1')
    // Get dependent entries
    const { statusCode, body } = await cacheManager.inject({
      method: 'GET',
      url: `/applications/${applicationId1}/http-cache/${entry.id}/dependents`
    })
    assert.deepStrictEqual(statusCode, 200, body)

    const { dependents } = JSON.parse(body)

    // Root level
    assert.strictEqual(dependents.length, 5)

    const entry2 = dependents.find((entry) => entry.path === '/test-2')
    assert.strictEqual(entry2.applicationId, applicationId1)
    assert.strictEqual(entry2.statusCode, 200)
    assert.deepStrictEqual(entry2.cacheTags, ['tag1', 'tag2', 'tag4'])

    const entry4 = dependents.find((entry) => entry.path === '/test-4')
    assert.strictEqual(entry4.applicationId, applicationId2)
    assert.strictEqual(entry4.statusCode, 200)
    assert.deepStrictEqual(entry4.cacheTags, ['tag1', 'tag2'])

    const entry5 = dependents.find((entry) => entry.path === '/test-5')
    assert.strictEqual(entry5.applicationId, applicationId2)
    assert.strictEqual(entry5.statusCode, 200)
    assert.deepStrictEqual(entry5.cacheTags, ['tag1', 'tag2', 'tag6'])

    const entry7 = dependents.find((entry) => entry.path === '/test-7')
    assert.strictEqual(entry7.applicationId, applicationId2)
    assert.strictEqual(entry7.statusCode, 200)
    assert.deepStrictEqual(entry7.cacheTags, ['tag1', 'tag2', 'tag4'])

    const entry8 = dependents.find((entry) => entry.path === '/test-8')
    assert.strictEqual(entry8.applicationId, applicationId2)
    assert.strictEqual(entry8.statusCode, 200)
    assert.deepStrictEqual(entry8.cacheTags, ['tag1', 'tag2', 'tag4', 'tag8'])
  }
})
