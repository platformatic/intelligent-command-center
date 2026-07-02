'use strict'

// Cases mirror upstream src/algorithms/structural/test/robust.test.js
//
// DIVERGENCE: the reference's noiseFloor (magnitude-based max(0.1·|v|, 3)) and
// clippedResidual (magnitude-clipped |r|/σ) have NO counterpart here — ours uses
// a diff-based noiseScale and a squared, clipped robustLoss. Those two reference
// describe() blocks are intentionally omitted; the behavioural effect of the
// different noise model surfaces in the discover / segment-gate / complex suites.

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { median } = require('../../lib/pattern-predictor/utils')
const { robustLine } = require('../../lib/pattern-predictor/forecast')

describe('robustLocation (→ our median)', () => {
  test('median of clean values', () => assert.equal(median([90, 90, 90, 90]), 90))
  test('one freak does not move the level — the founding case', () => assert.equal(median([90, 90, 490, 90, 90]), 90))
  test('single value', () => assert.equal(median([10]), 10))
  test('empty → 0', () => assert.equal(median([]), 0))
})

describe('robustLine (Theil–Sen)', () => {
  test('clean ramp → exact slope and intercept (occurrence index k=0..n-1)', () => {
    const fit = robustLine([10, 20, 30, 40, 50])
    assert.equal(fit.slope, 10)
    assert.equal(fit.intercept, 10)
  })
  test('one freak point does not move the slope', () => {
    const fit = robustLine([10, 20, 300, 40, 50])
    assert.equal(fit.slope, 10)
    assert.equal(fit.intercept, 10)
  })
})
