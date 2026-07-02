'use strict'

// Cases mirror upstream src/algorithms/structural/test/line.test.js

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const H = require('./helpers')

const MONDAY = H.ourDow(0)

describe('per-scope linear effect — Mondays grow +10 each week', () => {
  const vals = []
  for (let i = 0; i < 84; i++) {
    const w = Math.floor(i / 7)
    vals.push(i % 7 === 0 ? 10 + 10 * w : 10)
  }

  test('Monday term is a line, not a level or micro-steps', () => {
    const model = H.modelFromVals(vals)
    const mon = model.patterns.find((p) => p.scope.feature === 'dow' && p.scope.value === MONDAY)
    assert.ok(mon, 'expected a Monday term')
    assert.equal(mon.kind, 'line')
    assert.ok(Math.abs(mon.slope - 10) < 1, `slope=${mon.slope}, want ~10`)
  })

  test('next two Mondays extrapolate to 130 then 140', () => {
    assert.equal(H.predictVals(vals, 84), 130)
    assert.equal(H.predictVals(vals, 91), 140)
  })

  test('non-Mondays stay at baseline 10', () => {
    assert.equal(H.predictVals(vals, 85), 10)
    assert.equal(H.predictVals(vals, 86), 10)
  })
})
