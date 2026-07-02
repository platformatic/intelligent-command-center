'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { recencyBlend, lineForecast, suffixOverride } = require('../../../lib/pattern-predictor/readout')

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`)
const filled = (value, count) => Array.from({ length: count }, () => value)

test('recencyBlend: a steady segment returns its median', () => {
  assert.equal(recencyBlend(filled(30, 6)), 30)
})

test('recencyBlend: a short segment is just the median (blend off)', () => {
  assert.equal(recencyBlend([10, 20]), 15)
})

test('recencyBlend: leans toward a drifted recent suffix', () => {
  const blended = recencyBlend([...filled(10, 9), ...filled(40, 3)])
  assert.ok(blended > 35, `expected lean toward 40, got ${blended}`)
})

test('lineForecast: in-sample value at the last fitted occurrence', () => {
  const pattern = { effect: 10, slope: 2, startOcc: 0, lastOcc: 5, seB: 0.1 }
  close(lineForecast(pattern, 5), 20) // 10 + 2·5, horizon 0
})

test('lineForecast: damps the extrapolation beyond the last occurrence', () => {
  const pattern = { effect: 10, slope: 2, startOcc: 0, lastOcc: 5, seB: 0.1 } // support 6 (no clamp)
  // horizon 2: rel = 4/(4 + 0.01·4) = 0.990…; contrib = 20 + rel·2·2
  close(lineForecast(pattern, 7), 20 + (4 / (4 + 0.01 * 4)) * 4)
})

test('lineForecast: a thin line is clamped to its in-sample range out of sample', () => {
  const pattern = { effect: 10, slope: 2, startOcc: 0, lastOcc: 2, seB: 0.1 } // support 3 ≤ 5
  // far horizon would push well past the fitted range [10, 14] → clamped to 14
  close(lineForecast(pattern, 10), 14)
})

test('suffixOverride: a stable scope yields no override', () => {
  assert.equal(suffixOverride(filled(10, 16), filled(10, 16)), null)
})

test('suffixOverride: a sustained recent shift overrides with the suffix level', () => {
  const partial = [...filled(10, 8), ...filled(30, 8)] // recent 8 sit at 30
  const globalEff = filled(10, 16) // global model still says 10
  assert.equal(suffixOverride(partial, globalEff), 30)
})
