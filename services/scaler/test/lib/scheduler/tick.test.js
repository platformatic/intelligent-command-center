'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { assertValidTickMinutes, nextBoundaryDelayMs } = require('../../../lib/scheduler/tick')

test('assertValidTickMinutes accepts divisors of 60', () => {
  for (const n of [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60]) {
    assert.doesNotThrow(() => assertValidTickMinutes(n))
  }
})

test('assertValidTickMinutes rejects non-divisors and out-of-range', () => {
  for (const n of [0, 7, 8, 9, 11, 13, 61, 1.5, -1]) {
    assert.throws(() => assertValidTickMinutes(n))
  }
})

test('nextBoundaryDelayMs aligns to the next interval boundary', () => {
  const intervalMs = 15 * 60 * 1000
  // 10:07:30 → next 15-min boundary is 10:15:00
  const now = Date.UTC(2026, 0, 1, 10, 7, 30)
  const delay = nextBoundaryDelayMs(now, intervalMs)
  assert.equal((now + delay) % intervalMs, 0)
  assert.ok(delay > 0 && delay <= intervalMs)
})

test('nextBoundaryDelayMs returns full interval when exactly on a boundary', () => {
  const intervalMs = 60 * 1000
  const now = Date.UTC(2026, 0, 1, 10, 7, 0)
  assert.equal(nextBoundaryDelayMs(now, intervalMs), intervalMs)
})
