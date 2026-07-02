'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { median, trimmedMean, robustScale, diffScale, robustLoss, noiseScale } = require('../../../lib/pattern-predictor/utils')

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`)

test('median of an empty list is 0', () => {
  assert.equal(median([]), 0)
})

test('median of a single value', () => {
  assert.equal(median([7]), 7)
})

test('median of an odd-length list (sorts first)', () => {
  assert.equal(median([3, 1, 2]), 2)
  assert.equal(median([5, 5, 1]), 5)
})

test('median of an even-length list averages the two middle values', () => {
  assert.equal(median([4, 1, 3, 2]), 2.5)
  assert.equal(median([1, 2]), 1.5)
})

test('trimmedMean of an empty list is 0', () => {
  assert.equal(trimmedMean([], 0.15), 0)
})

test('trimmedMean drops floor(n * trim) from each end', () => {
  // 1..14, trim 0.15 → cut 2 → average of 3..12 = 7.5
  const values = Array.from({ length: 14 }, (_, i) => i + 1)
  assert.equal(trimmedMean(values, 0.15), 7.5)
})

test('trimmedMean trims away outliers', () => {
  // 13 ones + one 1000, trim 0.15 → cut 2 → the 1000 is dropped → mean 1
  const values = [...Array.from({ length: 13 }, () => 1), 1000]
  assert.equal(trimmedMean(values, 0.15), 1)
})

test('trimmedMean does not trim when the cut rounds to zero', () => {
  // n = 3, trim 0.15 → cut floor(0.45) = 0 → plain mean
  assert.equal(trimmedMean([10, 20, 30], 0.15), 20)
})

test('robustScale is 0 for empty or single-value lists', () => {
  assert.equal(robustScale([]), 0)
  assert.equal(robustScale([7]), 0) // MAD of one point is 0
})

test('robustScale scales the MAD by 1.4826', () => {
  // median 3; abs deviations [2,1,0,1,2] → median 1 → 1.4826 * 1
  close(robustScale([1, 2, 3, 4, 5]), 1.4826)
})

test('robustScale ignores outliers (spread is around the median)', () => {
  // median 3; abs deviations [2,1,0,1,997] → median 1 → still 1.4826
  close(robustScale([1, 2, 3, 4, 1000]), 1.4826)
})

test('diffScale is 0 for short or flat series', () => {
  assert.equal(diffScale([]), 0)
  assert.equal(diffScale([5]), 0)
  assert.equal(diffScale([5, 5, 5, 5]), 0) // all diffs 0
})

test('diffScale = robustScale(diffs) / √2', () => {
  // diffs [1,2,3,4] → median 2.5, abs devs [1.5,0.5,0.5,1.5] median 1 → robustScale 1.4826
  close(diffScale([0, 1, 3, 6, 10]), 1.4826 / Math.sqrt(2))
})

test('robustLoss sums standardized squared error', () => {
  assert.equal(robustLoss([], 3), 0)
  assert.equal(robustLoss([0, 0], 3), 0)
  assert.equal(robustLoss([3, 3], 3), 2) // each (3/3)² = 1
})

test('robustLoss clips each term at clip²', () => {
  assert.equal(robustLoss([30], 3), 9) // (30/3)² = 100, clipped to 3² = 9
  assert.equal(robustLoss([30], 3, 10), 100) // wider clip → not clipped
})

test('noiseScale falls back to the floor with no within-regime spread', () => {
  assert.equal(noiseScale([5, 5, 5]), 3) // flat diffs → tau 0 → √(3²)
  assert.equal(noiseScale([]), 3) // empty → floor
})

test('noiseScale combines the floor with the diff-based spread', () => {
  // diffScale([0,1,3,6,10]) = 1.4826/√2; σ = √(3² + tau²)
  const tau = 1.4826 / Math.sqrt(2)
  close(noiseScale([0, 1, 3, 6, 10]), Math.sqrt(9 + tau * tau))
})
