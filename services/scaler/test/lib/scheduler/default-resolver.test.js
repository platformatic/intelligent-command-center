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

test('missing priority is treated as 0 → all one tier (backward compatible)', async () => {
  const r = await defaultResolver({
    schedules: [
      { minPods: 3, maxPods: 9 },
      { minPods: 5, maxPods: 7 }
    ]
  })
  assert.deepEqual(r, { minPods: 5, maxPods: 7 })
})

test('higher priority fully shadows lower — even when it is LESS restrictive', async () => {
  // A below-baseline effect (min 3, priority 1) overrides an always-on baseline (min 10, priority 0).
  const r = await defaultResolver({
    schedules: [
      { minPods: 10, maxPods: null, priority: 0 },
      { minPods: 3, maxPods: null, priority: 1 }
    ]
  })
  assert.deepEqual(r, { minPods: 3, maxPods: null })
})

test('above-baseline effect also wins by priority (not by being the max)', async () => {
  const r = await defaultResolver({
    schedules: [
      { minPods: 10, maxPods: null, priority: 0 },
      { minPods: 15, maxPods: null, priority: 1 }
    ]
  })
  assert.deepEqual(r, { minPods: 15, maxPods: null })
})

test('within the top tier, the usual max/min intersection still applies', async () => {
  const r = await defaultResolver({
    schedules: [
      { minPods: 99, maxPods: null, priority: 0 }, // shadowed by the higher tier
      { minPods: 4, maxPods: 20, priority: 5 },
      { minPods: 6, maxPods: 12, priority: 5 }
    ]
  })
  assert.deepEqual(r, { minPods: 6, maxPods: 12 })
})
