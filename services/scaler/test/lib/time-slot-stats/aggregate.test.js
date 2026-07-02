'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { averageStats } = require('../../../lib/time-slot-stats/aggregate')

test('empty rows → null', () => {
  assert.equal(averageStats([]), null)
})

test('rounded average of each column, independently', () => {
  const rows = [
    { minPods: 4, maxPods: 12, p50Pods: 8, p75Pods: 10, p90Pods: 12, p95Pods: 12, p99Pods: 12 },
    { minPods: 4, maxPods: 6, p50Pods: 5, p75Pods: 6, p90Pods: 6, p95Pods: 6, p99Pods: 6 },
    { minPods: 4, maxPods: 12, p50Pods: 8, p75Pods: 11, p90Pods: 12, p95Pods: 12, p99Pods: 12 }
  ]
  // min 4 | max (12+6+12)/3=10 | p50 (8+5+8)/3=7 | p75 (10+6+11)/3=9 | p90/p95/p99 (12+6+12)/3=10
  assert.deepEqual(averageStats(rows), {
    minPods: 4, maxPods: 10, p50Pods: 7, p75Pods: 9, p90Pods: 10, p95Pods: 10, p99Pods: 10
  })
})

test('rounds the average (6.67 → 7)', () => {
  const c = (v) => ({ minPods: v, maxPods: v, p50Pods: v, p75Pods: v, p90Pods: v, p95Pods: v, p99Pods: v })
  const r = averageStats([c(4), c(4), c(12)]) // (4+4+12)/3 = 6.667 → 7
  assert.deepEqual(r, { minPods: 7, maxPods: 7, p50Pods: 7, p75Pods: 7, p90Pods: 7, p95Pods: 7, p99Pods: 7 })
})

test('partial set (one row) returns that row', () => {
  const row = { minPods: 3, maxPods: 9, p50Pods: 5, p75Pods: 7, p90Pods: 9, p95Pods: 9, p99Pods: 9 }
  assert.deepEqual(averageStats([row]), row)
})
