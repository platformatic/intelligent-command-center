'use strict'

// Cases mirror upstream src/algorithms/structural/test/biweekly.test.js

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const H = require('./helpers')

const MONDAY = H.ourDow(0)

describe('pure biweekly — every other Monday elevated', () => {
  const vals = []
  for (let i = 0; i < 56; i++) {
    const week = Math.floor(i / 7)
    vals.push(i % 7 === 0 && week % 2 === 0 ? 100 : 10)
  }

  test('elevated (even-week) Monday and baseline (odd-week) Monday are distinguished', () => {
    const even = H.predictVals(vals, 56) // week 8 (even) Monday
    const odd = H.predictVals(vals, 63) // week 9 (odd) Monday
    assert.ok(Math.abs(even - 100) <= 5, `even-week Monday=${even}, want ~100`)
    assert.ok(Math.abs(odd - 10) <= 5, `odd-week Monday=${odd}, want ~10`)
  })
})

describe('GUARD: a single freak must not turn a weekly pattern into biweekly', () => {
  const vals = []
  for (let i = 0; i < 70; i++) {
    let v = i % 7 === 0 ? 100 : 10
    if (i === 35) v += 400
    vals.push(v)
  }

  test('picks a dow=Monday term, not a biweekly one', () => {
    const model = H.modelFromVals(vals)
    const mon = model.patterns.find((p) => p.scope.feature === 'dow' && p.scope.value === MONDAY)
    const bi = model.patterns.find((p) => p.scope.feature === 'biweekly_dow')
    assert.ok(mon && Math.abs(mon.effect - 90) < 2, `expected Monday +90, got ${mon && mon.effect}`)
    assert.ok(!bi, 'must not introduce a biweekly term for one freak')
  })

  test('both next Mondays predict ~100', () => {
    assert.equal(H.predictVals(vals, 70), 100)
    assert.equal(H.predictVals(vals, 77), 100)
  })
})
