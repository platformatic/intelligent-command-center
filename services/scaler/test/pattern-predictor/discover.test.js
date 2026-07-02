'use strict'

// Cases mirror upstream src/algorithms/structural/test/discover.test.js
// discover(rows).terms → buildModel(vals).patterns; Monday is ref dow 0 → our dow 1.

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const H = require('./helpers')

const MONDAY = H.ourDow(0)

describe('founding case — one freak Monday must not poison the pattern', () => {
  // 70 days: baseline 10, Mondays at 100 (+90), week-5 Monday carries +400.
  const vals = []
  for (let i = 0; i < 70; i++) {
    let v = i % 7 === 0 ? 100 : 10
    if (i === 35) v += 400
    vals.push(v)
  }

  test('Monday level term is the clean +90, not the contaminated +130', () => {
    const model = H.modelFromVals(vals)
    const mon = H.patternFor(model, 'dow', MONDAY)
    assert.ok(mon, 'expected a Monday term')
    assert.equal(mon.kind, 'level')
    assert.ok(Math.abs(mon.effect - 90) < 1, `Monday effect=${mon.effect}, want ~90`)
  })

  test('next Monday predicts ~100 (the +400 is not extrapolated)', () => {
    assert.equal(H.predictVals(vals, 70), 100)
  })

  test('a non-Monday predicts ~10', () => {
    assert.equal(H.predictVals(vals, 71), 10)
  })
})

describe('must not regress the deterministic basics', () => {
  test('constant series → predicts the constant', () => {
    const vals = new Array(28).fill(10)
    assert.equal(H.predictVals(vals, 28), 10)
    assert.equal(H.predictVals(vals, 35), 10)
  })

  test('Mondays elevated → exact readout', () => {
    const vals = []
    for (let i = 0; i < 28; i++) vals.push(i % 7 === 0 ? 100 : 10)
    for (let k = 0; k < 7; k++) {
      const targetIndex = 28 + k
      const isMonday = targetIndex % 7 === 0
      assert.equal(H.predictVals(vals, targetIndex), isMonday ? 100 : 10)
    }
  })
})
