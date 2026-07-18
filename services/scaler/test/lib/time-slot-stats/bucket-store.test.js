'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const Store = require('../../../lib/store')
const { valkeyConnectionString } = require('../../helper')

function mockLog () {
  return { error () {}, warn () {}, info () {}, debug () {} }
}

test('bucket open / append / read / clear round-trip', async (t) => {
  const store = new Store(valkeyConnectionString, mockLog())
  t.after(() => store.close())
  const appId = randomUUID()

  assert.equal(await store.readBucket(appId), null)

  await store.openBucket({ applicationId: appId, slotStart: 1000, isFirst: true, seed: null, ttlSeconds: 60 })
  await store.appendBucketTarget({ applicationId: appId, ts: 1500, unclamped: 7, actual: 3, ttlSeconds: 60 })
  await store.appendBucketTarget({ applicationId: appId, ts: 2500, unclamped: 9, actual: 5, ttlSeconds: 60 })

  const b = await store.readBucket(appId)
  assert.equal(b.slotStart, 1000)
  assert.equal(b.isFirst, true)
  assert.deepEqual(b.targets, [
    { ts: 1500, unclamped: 7, actual: 3 },
    { ts: 2500, unclamped: 9, actual: 5 }
  ])

  // open a new (non-first) bucket with a seed carrying both values
  await store.openBucket({ applicationId: appId, slotStart: 4000, isFirst: false, seed: { ts: 4000, unclamped: 9, actual: 5 }, ttlSeconds: 60 })
  const b2 = await store.readBucket(appId)
  assert.equal(b2.slotStart, 4000)
  assert.equal(b2.isFirst, false)
  assert.deepEqual(b2.targets, [{ ts: 4000, unclamped: 9, actual: 5 }])

  await store.clearBucket(appId)
  assert.equal(await store.readBucket(appId), null)
})
