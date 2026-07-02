'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { baselineForecast, holt, robustLine } = require('../../../lib/pattern-predictor/forecast')

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`)
const ramp = (n) => Array.from({ length: n }, (_, i) => i)

test('robustLine recovers a clean slope and intercept', () => {
  const { slope, intercept } = robustLine([0, 2, 4, 6])
  close(slope, 2)
  close(intercept, 0)
})

test('robustLine of a flat series has zero slope', () => {
  const { slope, intercept } = robustLine([5, 5, 5])
  close(slope, 0)
  close(intercept, 5)
})

test('holt of a flat series forecasts the same level', () => {
  close(holt([5, 5, 5, 5], 1), 5)
})

test('holt of a rising series carries a positive trend (further ahead → higher)', () => {
  // the smoothed level lags on a rise (that's what the de-lag corrects); the trend is positive
  assert.ok(holt(ramp(10), 5) > holt(ramp(10), 1), 'forecast should grow with the horizon')
})

test('baselineForecast of a flat series returns that level', () => {
  close(baselineForecast(Array(28).fill(7), 1), 7)
})

test('baselineForecast de-lags a trend forward past the last value', () => {
  // centered median lags ~window/2 behind; the forecast projects it to the next point
  const forecast = baselineForecast(ramp(28), 1)
  assert.ok(forecast > 27, `forecast ${forecast} should be past the last value 27`)
})

test('baselineForecast handles a short series', () => {
  close(baselineForecast([4], 1), 4)
  close(baselineForecast([], 1), 0)
})
