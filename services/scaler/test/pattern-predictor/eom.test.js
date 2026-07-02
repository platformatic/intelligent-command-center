'use strict'

// Cases mirror upstream src/algorithms/structural/test/eom.test.js
// Same calendar (START = 2024-01-01); predictions made against real target dates.

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const H = require('./helpers')

// flat 10, +90 on the last calendar day of each month, Jan–late May 2024.
function eomVals () {
  const vals = []
  for (let i = 0; i < 150; i++) {
    const dt = H.dateAt(i)
    const lastDom = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate()
    vals.push(dt.getUTCDate() === lastDom ? 100 : 10)
  }
  return vals
}
const predictDate = (model, y, m, d) => H.predict(model, new Date(Date.UTC(y, m - 1, d)))

describe('end-of-month scope — last calendar day, varying month lengths', () => {
  const model = H.modelFromVals(eomVals())

  test('discovery finds an eom term capturing the lift', () => {
    const eom = model.patterns.find((p) => p.scope.feature === 'eom')
    assert.ok(eom, 'expected an eom term')
    assert.ok(Math.abs(eom.effect) > 50, `eom effect=${eom.effect}, want ~+90`)
  })

  test('predicts the last day of a future month, not a fixed dom', () => {
    assert.ok(Math.abs(predictDate(model, 2024, 6, 30) - 100) <= 8, 'EOM day ≈ 100')
    assert.ok(Math.abs(predictDate(model, 2024, 7, 31) - 100) <= 8, 'next EOM ≈ 100')
  })

  test('non-last days stay at baseline', () => {
    assert.ok(Math.abs(predictDate(model, 2024, 6, 15) - 10) <= 8, 'mid-month ≈ 10')
    assert.ok(Math.abs(predictDate(model, 2024, 6, 29) - 10) <= 8, 'day-before-EOM ≈ 10')
  })
})
