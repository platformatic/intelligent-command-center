'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const {
  ols,
  candidateBoundaries,
  slopePassesGate,
  segmentJumpPasses,
  fitSegment,
  findScopePatterns
} = require('../../../lib/pattern-predictor/fit')

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`)
const occ = (residuals) => residuals.map((residual, pos) => ({ pos, residual }))
const filled = (value, count) => Array.from({ length: count }, () => value)

// ---- ols (§4e) ----

test('ols: a perfect line recovers slope and intercept, seB = 0', () => {
  const { intercept, slope, seB } = ols([0, 2, 4, 6])
  assert.equal(slope, 2)
  assert.equal(intercept, 0) // value at x = 0
  assert.equal(seB, 0) // exact fit
})

test('ols: the intercept is the fitted value at the segment start (x = 0)', () => {
  const { intercept, slope, seB } = ols([10, 13, 16])
  assert.equal(slope, 3)
  assert.equal(intercept, 10)
  assert.equal(seB, 0)
})

test('ols: a flat segment has zero slope', () => {
  const { intercept, slope, seB } = ols([5, 5, 5, 5])
  assert.equal(slope, 0)
  assert.equal(intercept, 5)
  assert.equal(seB, 0)
})

test('ols: standard error of the slope for a noisy segment', () => {
  // x = 0,1,2; y = 3,5,4 → slope 0.5, intercept 3.5, SSE 1.5, df 1, Sxx 2 → seB = √(1.5/2)
  const { intercept, slope, seB } = ols([3, 5, 4])
  close(slope, 0.5)
  close(intercept, 3.5)
  close(seB, Math.sqrt(0.75))
})

// ---- candidateBoundaries (§4c) ----

test('candidateBoundaries: too short to split returns none', () => {
  assert.deepEqual(candidateBoundaries([1, 2, 3]), []) // m = 3 < 2·MIN_SEG
})

test('candidateBoundaries: a single level shift is found at the shift point', () => {
  assert.deepEqual(candidateBoundaries([10, 10, 10, 40, 40, 40]), [3])
})

// ---- slopePassesGate (§4e) ----

test('slopePassesGate: a perfect fit (seB 0) passes — a deterministic ramp is maximally significant', () => {
  assert.equal(slopePassesGate(10, 5, 0, 1), true)
})

test('slopePassesGate: a strong, well-determined slope passes', () => {
  // |slope|/seB = 100 ≫ tCrit(df=8, 0.05) ≈ 2.306
  assert.equal(slopePassesGate(10, 10, 0.1, 1), true)
})

test('slopePassesGate: a weak slope fails', () => {
  assert.equal(slopePassesGate(10, 0.1, 1, 1), false)
})

// ---- segmentJumpPasses (§4d) ----

test('segmentJumpPasses: a clean large step passes (deterministic when spread is 0)', () => {
  assert.equal(segmentJumpPasses(filled(40, 5), 40, 10, 7), true) // se 0, delta 30
})

test('segmentJumpPasses: no step never passes', () => {
  assert.equal(segmentJumpPasses(filled(40, 3), 40, 40, 7), false) // delta 0
})

test('segmentJumpPasses: a small noisy step fails the family-corrected gate', () => {
  // step of 0.5 vs MAD spread, familySize 31 → far below tCrit(df=5, 0.05/31)
  assert.equal(segmentJumpPasses([10, 12, 11, 9, 13, 8], 10.5, 10, 31), false)
})

// ---- fitSegment (§4e) ----

test('fitSegment: a flat segment is a level', () => {
  const fit = fitSegment([5, 5, 5, 5, 5], 3, true, 7, Math.log(56))
  assert.equal(fit.kind, 'level')
  assert.equal(fit.effect, 5)
})

test('fitSegment: a strong noisy trend becomes a line when allowed', () => {
  const fit = fitSegment([1, 9, 21, 29, 41, 49, 61, 69, 81, 89], 3, true, 1, Math.log(56))
  assert.equal(fit.kind, 'line')
  assert.ok(fit.slope > 9 && fit.slope < 11, `slope ${fit.slope}`)
})

test('fitSegment: allowLine false keeps a trend as a level', () => {
  const fit = fitSegment([1, 9, 21, 29, 41, 49, 61, 69, 81, 89], 3, false, 1, Math.log(56))
  assert.equal(fit.kind, 'level')
})

// ---- findScopePatterns (§4, assembled) ----

test('findScopePatterns: a steady level earns one open level pattern', () => {
  // occurrences at window positions 0..7 (occ() sets pos = index)
  const patterns = findScopePatterns({ feature: 'dow' }, occ(filled(30, 8)), { allowLine: true, timeWindowCount: 56 })
  assert.equal(patterns.length, 1)
  assert.equal(patterns[0].kind, 'level')
  assert.equal(patterns[0].effect, 30)
  assert.equal(patterns[0].start, 0)
  assert.equal(patterns[0].end, undefined) // the open/current regime
  assert.equal(patterns[0].startOcc, 0)
  assert.equal(patterns[0].lastOcc, 7)
})

test('findScopePatterns: a regime shift earns a closed + an open level pattern', () => {
  const patterns = findScopePatterns(
    { feature: 'dow' },
    occ([...filled(10, 10), ...filled(40, 10)]),
    { allowLine: true, timeWindowCount: 56 }
  )
  assert.equal(patterns.length, 2)

  assert.equal(patterns[0].kind, 'level')
  assert.equal(patterns[0].effect, 10)
  assert.equal(patterns[0].start, 0)
  assert.equal(patterns[0].end, 9) // closed: window index of its last occurrence
  assert.equal(patterns[0].startOcc, 0)
  assert.equal(patterns[0].lastOcc, 9)

  assert.equal(patterns[1].kind, 'level')
  assert.equal(patterns[1].effect, 40)
  assert.equal(patterns[1].start, 10)
  assert.equal(patterns[1].end, undefined) // open/current regime
  assert.equal(patterns[1].startOcc, 10)
  assert.equal(patterns[1].lastOcc, 19)
})

test('findScopePatterns: a tiny effect that cannot pay its MDL cost is dropped', () => {
  const patterns = findScopePatterns({ feature: 'dow' }, occ(filled(1, 8)), { allowLine: true, timeWindowCount: 56 })
  assert.deepEqual(patterns, [])
})
