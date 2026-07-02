'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const {
  discoverWindowPatterns,
  currentEffect,
  converged
} = require('../../../lib/pattern-predictor/patterns')

const DAY_MS = 24 * 60 * 60 * 1000
const keyOf = (scope) => scope.feature + '|' + scope.value

test('currentEffect: level reports its raw effect; line its value at the last fitted occurrence', () => {
  assert.equal(currentEffect({ kind: 'level', effect: 30 }), 30)
  assert.equal(currentEffect({ kind: 'line', effect: 10, slope: 2, startOcc: 3, lastOcc: 8 }), 10 + 2 * 5)
})

test('converged when both the forecast and the objective settle', () => {
  const prev = { objective: 100, baselineForward: 10, openEffects: { 'dow|1': 30 } }
  const sig = { objective: 101, baselineForward: 10.2, openEffects: { 'dow|1': 30.1 } }
  assert.equal(converged(sig, prev), true) // forecastΔ 0.3 < 0.5, objΔ 1 < 0.02·101
})

test('not converged when the forecast moves too much', () => {
  const prev = { objective: 100, baselineForward: 10, openEffects: { 'dow|1': 30 } }
  const sig = { objective: 100, baselineForward: 10, openEffects: { 'dow|1': 31 } }
  assert.equal(converged(sig, prev), false)
})

test('not converged when the objective is still improving', () => {
  const prev = { objective: 100, baselineForward: 10, openEffects: {} }
  const sig = { objective: 90, baselineForward: 10, openEffects: {} }
  assert.equal(converged(sig, prev), false)
})

test('converged sums the largest open change per family', () => {
  const prev = { objective: 50, baselineForward: 0, openEffects: { 'dow|1': 0, 'dom|15': 0 } }
  const sig = { objective: 50, baselineForward: 0, openEffects: { 'dow|1': 0.3, 'dom|15': 0.3 } }
  assert.equal(converged(sig, prev), false) // 0.3 + 0.3 = 0.6 ≥ 0.5
})

test('discoverWindowPatterns: a weekly pattern is claimed once; overlapping aliases earn nothing', () => {
  // 56 real consecutive days from a Monday (2024-01-01). Mondays sit +30 over a flat 0 baseline;
  // every 14-day window holds exactly two Mondays, which the centered trimmed mean trims out, so
  // the real rollingLevel returns a 0 baseline. dow|1 claims +30; the overlapping biweekly_dow /
  // p14 / dom scopes see 0 once it's subtracted, so they earn nothing.
  const start = Date.UTC(2024, 0, 1) // Monday
  const timeWindows = Array.from({ length: 56 }, (_, i) => {
    const date = new Date(start + i * DAY_MS)
    const dow = date.getUTCDay()
    return {
      value: dow === 1 ? 30 : 0,
      observed: true,
      dow,
      dom: date.getUTCDate(),
      month: date.getUTCMonth() + 1,
      year: date.getUTCFullYear()
    }
  })

  const patterns = discoverWindowPatterns(timeWindows)

  assert.equal(patterns.length, 1)
  assert.equal(keyOf(patterns[0].scope), 'dow|1')
  assert.equal(patterns[0].kind, 'level')
  assert.equal(patterns[0].effect, 30)
  assert.equal(patterns[0].end, undefined) // open/current regime
})
