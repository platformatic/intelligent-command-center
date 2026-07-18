'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { timeWeightedPercentiles } = require('../../../lib/time-slot-stats/stats')

test('empty targets → null', () => {
  assert.equal(timeWeightedPercentiles([], 0, 300000), null)
})

test('worked example: duration-weighted, non-interpolated', () => {
  // slot [0, 300000): seed (0,5), then (100000,12), (240000,8)
  // segments: 5 for 100s, 12 for 140s, 8 for 60s
  const targets = [
    { ts: 0, value: 5 },
    { ts: 100000, value: 12 },
    { ts: 240000, value: 8 }
  ]
  const r = timeWeightedPercentiles(targets, 0, 300000)
  assert.equal(r.min, 5)
  assert.equal(r.max, 12)
  assert.equal(r.p50, 8) // first value whose cumulative time fraction >= 50%
  assert.equal(r.p75, 12)
  assert.equal(r.p90, 12)
  assert.equal(r.p95, 12)
  assert.equal(r.p99, 12)
})

test('single constant value across the whole slot', () => {
  const r = timeWeightedPercentiles([{ ts: 0, value: 7 }], 0, 300000)
  assert.deepEqual(r, { min: 7, max: 7, p50: 7, p75: 7, p90: 7, p95: 7, p99: 7 })
})

test('time-weighting differs from naive count-weighting', () => {
  // two samples of 5, one long sample of 50 dominating the time
  const targets = [
    { ts: 0, value: 5 },
    { ts: 10000, value: 5 },
    { ts: 20000, value: 50 }
  ]
  const r = timeWeightedPercentiles(targets, 0, 300000)
  // 50 holds [20000, 300000) = 280s of 300s → dominates upper percentiles
  assert.equal(r.p90, 50)
  assert.equal(r.min, 5)
  assert.equal(r.max, 50)
})

test('aggregates duration for a value that recurs in non-adjacent segments', () => {
  // 5 appears in two separate segments; their durations sum (200s of 300s)
  const r = timeWeightedPercentiles([
    { ts: 0, value: 5 },
    { ts: 100000, value: 9 },
    { ts: 200000, value: 5 }
  ], 0, 300000)
  assert.equal(r.min, 5)
  assert.equal(r.max, 9)
  assert.equal(r.p50, 5)
  assert.equal(r.p75, 9)
  assert.equal(r.p90, 9)
})

test('assigns every percentile in one ascending pass (all distinct)', () => {
  const r = timeWeightedPercentiles([
    { ts: 0, value: 1 },
    { ts: 150000, value: 2 },
    { ts: 225000, value: 3 },
    { ts: 270000, value: 4 },
    { ts: 285000, value: 5 }
  ], 0, 300000)
  assert.deepEqual(r, { min: 1, max: 5, p50: 1, p75: 2, p90: 3, p95: 4, p99: 5 })
})

test('drops zero-duration samples (duplicate timestamp) without polluting min', () => {
  const r = timeWeightedPercentiles([
    { ts: 0, value: 3 },
    { ts: 0, value: 8 },
    { ts: 100000, value: 8 }
  ], 0, 300000)
  // the 3 has zero duration (next sample shares its ts) → excluded entirely
  assert.deepEqual(r, { min: 8, max: 8, p50: 8, p75: 8, p90: 8, p95: 8, p99: 8 })
})

test('sorts out-of-order samples by timestamp before weighting', () => {
  const r = timeWeightedPercentiles([
    { ts: 200000, value: 8 },
    { ts: 0, value: 5 },
    { ts: 100000, value: 12 }
  ], 0, 300000)
  assert.equal(r.min, 5)
  assert.equal(r.max, 12)
  assert.equal(r.p50, 8)
  assert.equal(r.p75, 12)
})

test('exact threshold boundary picks the lower value (cum >= threshold)', () => {
  // 50/50 split: at exactly 50% the cumulative reaches the lower value first
  const r = timeWeightedPercentiles([
    { ts: 0, value: 4 },
    { ts: 150000, value: 10 }
  ], 0, 300000)
  assert.equal(r.min, 4)
  assert.equal(r.max, 10)
  assert.equal(r.p50, 4)
  assert.equal(r.p75, 10)
})

test('carries the last value to the slot end (tail extension)', () => {
  const r = timeWeightedPercentiles([
    { ts: 0, value: 5 },
    { ts: 10000, value: 7 }
  ], 0, 300000)
  // 7 holds [10s, 300s) = 290s → dominates
  assert.equal(r.min, 5)
  assert.equal(r.max, 7)
  assert.equal(r.p50, 7)
  assert.equal(r.p99, 7)
})

test('valueOf accessor selects an alternate field on each target', () => {
  // one array carrying two independent series; the accessor picks which to weight
  const targets = [
    { ts: 0, unclamped: 12, actual: 4 },
    { ts: 150000, unclamped: 12, actual: 8 }
  ]
  const unclamped = timeWeightedPercentiles(targets, 0, 300000, (t) => t.unclamped)
  const actual = timeWeightedPercentiles(targets, 0, 300000, (t) => t.actual)
  assert.deepEqual(unclamped, { min: 12, max: 12, p50: 12, p75: 12, p90: 12, p95: 12, p99: 12 })
  // actual: 4 holds [0,150s), 8 holds [150s,300s) → 50% boundary picks the lower (4)
  assert.equal(actual.min, 4)
  assert.equal(actual.max, 8)
  assert.equal(actual.p50, 4)
  assert.equal(actual.p75, 8)
})

test('defaults the accessor to the .value field (back-compat)', () => {
  const r = timeWeightedPercentiles([{ ts: 0, value: 7 }], 0, 300000)
  assert.equal(r.min, 7)
  assert.equal(r.max, 7)
})
