'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const Store = require('../../../lib/store')
const { valkeyConnectionString } = require('../../helper')

function mockLog () {
  return { error () {}, warn () {}, info () {}, debug () {} }
}

test('saveSoftLimits / getSoftLimits / clearSoftLimits round-trip', async (t) => {
  const store = new Store(valkeyConnectionString, mockLog())
  t.after(() => store.close())
  const appId = randomUUID()

  assert.equal(await store.getSoftLimits(appId), null)

  await store.saveSoftLimits(appId, { min: 3, max: 7, scheduleIds: ['a'] }, 120)
  const got = await store.getSoftLimits(appId)
  assert.equal(got.min, 3)
  assert.equal(got.max, 7)
  assert.deepEqual(got.scheduleIds, ['a'])

  await store.clearSoftLimits(appId)
  assert.equal(await store.getSoftLimits(appId), null)
})
