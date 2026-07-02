'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { buildModel, predict, predictSchedule } = require('../../../lib/pattern-predictor/model')

const DAY_MS = 24 * 60 * 60 * 1000
const START = Date.UTC(2024, 0, 1) // a Monday
const dateAt = (i) => new Date(START + i * DAY_MS)

test('buildModel → predict: a weekly +30 pattern forecasts +30 on a future Monday, 0 otherwise', () => {
  // 56 days; Mondays sit at 30 over a 0 baseline, everything else 0
  const series = Array.from({ length: 56 }, (_, i) => {
    const date = dateAt(i)
    return { date, value: date.getUTCDay() === 1 ? 30 : 0 }
  })
  const model = buildModel(series)

  // exactly one earned pattern: dow|Monday = +30
  assert.equal(model.patterns.length, 1)
  assert.equal(model.patterns[0].effect, 30)

  assert.equal(predict(model, dateAt(63)), 30) // a future Monday (dow 1)
  assert.equal(predict(model, dateAt(64)), 0) // the following Tuesday
})

test('buildModel: missing days (null) are imputed, not treated as zero', () => {
  const series = Array.from({ length: 56 }, (_, i) => {
    const date = dateAt(i)
    const value = date.getUTCDay() === 1 ? 30 : 0
    // drop one Monday's observation
    return { date, value: i === 21 ? null : value }
  })
  const model = buildModel(series)
  // the pattern still resolves to a +30 Monday despite the gap
  assert.equal(predict(model, dateAt(63)), 30)
})

test('predictSchedule: forecasts each slot independently', () => {
  // slot 0 has the Monday pattern, slot 1 is flat 5
  const history = Array.from({ length: 56 }, (_, i) => {
    const date = dateAt(i)
    return { date, slots: [date.getUTCDay() === 1 ? 30 : 0, 5] }
  })
  const forecasts = predictSchedule(history, dateAt(63)) // future Monday
  assert.equal(forecasts.length, 2)
  assert.equal(forecasts[0], 30) // slot 0: Monday pattern
  assert.equal(forecasts[1], 5) // slot 1: flat
})
