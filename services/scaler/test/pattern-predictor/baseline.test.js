'use strict'

// Cases mirror upstream src/algorithms/structural/test/baseline.test.js

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const H = require('./helpers')

describe('global moving baseline + scoped effect (case-8 essence)', () => {
  // Broad linear growth (+2/day) with a Monday lift of +50.
  const vals = []
  for (let i = 0; i < 84; i++) vals.push(100 + 2 * i + (i % 7 === 0 ? 50 : 0))

  test('one-step-ahead tracks the trend (a non-Monday)', () => {
    const truth = 100 + 2 * 85
    const got = H.predictVals(vals, 85)
    assert.ok(Math.abs(got - truth) <= 5, `got ${got}, want ~${truth}`)
  })

  test('one-step-ahead tracks trend + Monday lift', () => {
    const truth = 100 + 2 * 84 + 50
    const got = H.predictVals(vals, 84)
    assert.ok(Math.abs(got - truth) <= 8, `got ${got}, want ~${truth}`)
  })
})
