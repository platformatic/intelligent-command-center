'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { rollingLevel, computeBaselineAndResiduals } = require('../../../lib/pattern-predictor/baseline')

const series = (values, observedFlags) =>
  values.map((value, i) => ({ value, observed: observedFlags ? observedFlags[i] : true }))

test('rollingLevel: a short series (<= window) is a single trimmed mean everywhere', () => {
  // n = 5, trim cut 0 → plain mean 12
  assert.deepEqual(rollingLevel([10, 12, 11, 13, 14]), [12, 12, 12, 12, 12])
})

test('rollingLevel: centered window with clamped edges', () => {
  // values 0..20; a 14-int window [k..k+13] trims 2 each side → mean k + 6.5
  const level = rollingLevel(Array.from({ length: 21 }, (_, i) => i))
  assert.equal(level[0], 6.5) // leading edge
  assert.equal(level[8], 7.5) // interior
  assert.equal(level[20], 13.5) // trailing edge
})

test('rollingLevel: an in-window spike is trimmed out', () => {
  const values = Array.from({ length: 14 }, () => 10)
  values[5] = 1000
  assert.deepEqual(rollingLevel(values), Array.from({ length: 14 }, () => 10))
})

test('rollingLevel: does not mutate the input array', () => {
  const values = [1, 2, 3]
  const copy = values.slice()
  rollingLevel(values)
  assert.deepEqual(values, copy)
})

test('short series (<= window): one trimmed-mean baseline + residuals for every day', () => {
  // n = 5, trim cut = floor(5 * 0.15) = 0 → plain mean 12
  const s = series([10, 12, 11, 13, 14])
  computeBaselineAndResiduals(s)
  assert.deepEqual(s.map((d) => d.baseline), [12, 12, 12, 12, 12])
  assert.deepEqual(s.map((d) => d.residual), [-2, 0, -1, 1, 2])
})

test('centered window with clamped edges; residual = value − baseline', () => {
  // values 0..20; a 14-int window [k..k+13] trims 2 each side → mean = k + 6.5,
  // and day d uses window start clamp(d - 7, 0, 7)
  const s = series(Array.from({ length: 21 }, (_, i) => i))
  computeBaselineAndResiduals(s)
  assert.equal(s[0].baseline, 6.5) // leading edge
  assert.equal(s[8].baseline, 7.5) // interior
  assert.equal(s[20].baseline, 13.5) // trailing edge
  assert.equal(s[0].residual, -6.5) // 0 - 6.5
  assert.equal(s[8].residual, 0.5) // 8 - 7.5
  assert.equal(s[20].residual, 6.5) // 20 - 13.5
})

test('an in-window spike is trimmed out of the baseline but shows up in the residual', () => {
  const values = Array.from({ length: 14 }, () => 10)
  values[5] = 1000
  const s = series(values)
  computeBaselineAndResiduals(s)
  assert.deepEqual(s.map((d) => d.baseline), Array.from({ length: 14 }, () => 10))
  assert.equal(s[5].residual, 990) // 1000 - 10, the real leftover
})

test('a missing day uses its filled value in the baseline but gets a null residual', () => {
  // n = 3, cut 0 → mean 13 (includes the filled value 13)
  const s = series([10, 13, 16], [true, false, true])
  computeBaselineAndResiduals(s)
  assert.deepEqual(s.map((d) => d.baseline), [13, 13, 13]) // dense, uses the filled value
  assert.deepEqual(s.map((d) => d.residual), [-3, null, 3]) // missing day → null
})
