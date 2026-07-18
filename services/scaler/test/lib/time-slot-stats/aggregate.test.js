'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { averageStats } = require('../../../lib/time-slot-stats/aggregate')

test('empty rows → null', () => {
  assert.equal(averageStats([]), null)
})

test('rounded average of each column, independently', () => {
  // actual columns held constant at 1 so the unclamped assertions stay the focus
  const z = { actualMinPods: 1, actualMaxPods: 1, actualP50Pods: 1, actualP75Pods: 1, actualP90Pods: 1, actualP95Pods: 1, actualP99Pods: 1 }
  const rows = [
    { minPods: 4, maxPods: 12, p50Pods: 8, p75Pods: 10, p90Pods: 12, p95Pods: 12, p99Pods: 12, ...z },
    { minPods: 4, maxPods: 6, p50Pods: 5, p75Pods: 6, p90Pods: 6, p95Pods: 6, p99Pods: 6, ...z },
    { minPods: 4, maxPods: 12, p50Pods: 8, p75Pods: 11, p90Pods: 12, p95Pods: 12, p99Pods: 12, ...z }
  ]
  // min 4 | max (12+6+12)/3=10 | p50 (8+5+8)/3=7 | p75 (10+6+11)/3=9 | p90/p95/p99 (12+6+12)/3=10
  assert.deepEqual(averageStats(rows), {
    minPods: 4, maxPods: 10, p50Pods: 7, p75Pods: 9, p90Pods: 10, p95Pods: 10, p99Pods: 10, ...z
  })
})

test('rounds the average (6.67 → 7)', () => {
  const c = (v) => ({
    minPods: v,
    maxPods: v,
    p50Pods: v,
    p75Pods: v,
    p90Pods: v,
    p95Pods: v,
    p99Pods: v,
    actualMinPods: v,
    actualMaxPods: v,
    actualP50Pods: v,
    actualP75Pods: v,
    actualP90Pods: v,
    actualP95Pods: v,
    actualP99Pods: v
  })
  const r = averageStats([c(4), c(4), c(12)]) // (4+4+12)/3 = 6.667 → 7
  assert.deepEqual(r, c(7))
})

test('partial set (one row) returns that row', () => {
  const row = {
    minPods: 3,
    maxPods: 9,
    p50Pods: 5,
    p75Pods: 7,
    p90Pods: 9,
    p95Pods: 9,
    p99Pods: 9,
    actualMinPods: 2,
    actualMaxPods: 6,
    actualP50Pods: 4,
    actualP75Pods: 5,
    actualP90Pods: 6,
    actualP95Pods: 6,
    actualP99Pods: 6
  }
  assert.deepEqual(averageStats([row]), row)
})

test('averages the actual-pods columns independently of the unclamped ones', () => {
  const c = (u, a) => ({
    minPods: u,
    maxPods: u,
    p50Pods: u,
    p75Pods: u,
    p90Pods: u,
    p95Pods: u,
    p99Pods: u,
    actualMinPods: a,
    actualMaxPods: a,
    actualP50Pods: a,
    actualP75Pods: a,
    actualP90Pods: a,
    actualP95Pods: a,
    actualP99Pods: a
  })
  const r = averageStats([c(10, 2), c(10, 4)]) // unclamped avg 10, actual avg (2+4)/2 = 3
  assert.equal(r.p90Pods, 10)
  assert.equal(r.actualMinPods, 3)
  assert.equal(r.actualP90Pods, 3)
})
