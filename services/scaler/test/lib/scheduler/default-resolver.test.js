'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const defaultResolver = require('../../../lib/scheduler/default-resolver')

test('no schedules → both null', async () => {
  assert.deepEqual(await defaultResolver({ schedules: [] }), { minPods: null, maxPods: null })
})

test('single schedule passes through', async () => {
  const r = await defaultResolver({ schedules: [{ minPods: 3, maxPods: 7 }] })
  assert.deepEqual(r, { minPods: 3, maxPods: 7 })
})

test('intersection: max of mins, min of maxs', async () => {
  const r = await defaultResolver({
    schedules: [
      { minPods: 3, maxPods: 9 },
      { minPods: 5, maxPods: 7 }
    ]
  })
  assert.deepEqual(r, { minPods: 5, maxPods: 7 })
})

test('partial limits ignored where null', async () => {
  const r = await defaultResolver({
    schedules: [
      { minPods: 4, maxPods: null },
      { minPods: null, maxPods: 6 }
    ]
  })
  assert.deepEqual(r, { minPods: 4, maxPods: 6 })
})

test('inverted result collapses min to max', async () => {
  const r = await defaultResolver({
    schedules: [
      { minPods: 9, maxPods: null },
      { minPods: null, maxPods: 4 }
    ]
  })
  assert.deepEqual(r, { minPods: 4, maxPods: 4 })
})
