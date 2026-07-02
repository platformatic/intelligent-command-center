'use strict'

// Cases mirror upstream src/algorithms/structural/test/tdist.test.js
// (tTwoSidedTail → our studentTwoSidedTail; same data/expectations).

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { tCriticalTwoSided, studentTwoSidedTail } = require('../../lib/pattern-predictor/tdist')

const TABLE = [
  [1, 0.05, 12.706],
  [2, 0.05, 4.303],
  [4, 0.05, 2.776],
  [10, 0.05, 2.228],
  [30, 0.05, 2.042],
  [2, 0.01, 9.925],
  [4, 0.01, 4.604]
]

test('tCriticalTwoSided matches standard t-table values', () => {
  for (const [df, alpha, expected] of TABLE) {
    const got = tCriticalTwoSided(df, alpha)
    assert.ok(Math.abs(got - expected) < 0.01, `df=${df} α=${alpha}: got ${got}, expected ${expected}`)
  }
})

test('tail and critical value are inverse', () => {
  for (const df of [1, 2, 4, 8, 20]) {
    for (const alpha of [0.05, 0.01, 0.001]) {
      const t = tCriticalTwoSided(df, alpha)
      assert.ok(Math.abs(studentTwoSidedTail(t, df) - alpha) < 1e-6, `df=${df} α=${alpha}`)
    }
  }
})

test('family-corrected low-df values used by the gate', () => {
  const a = 0.05 / 31
  assert.ok(tCriticalTwoSided(2, a) > 22 && tCriticalTwoSided(2, a) < 28, 'df=2 ~24.9')
  assert.ok(tCriticalTwoSided(4, a) > 6.5 && tCriticalTwoSided(4, a) < 8.5, 'df=4 ~7.5')
  assert.ok(tCriticalTwoSided(1, a) > 200, 'df=1 huge (Cauchy)')
})

test('monotone decreasing tail in t', () => {
  let prev = 1
  for (const t of [0.5, 1, 2, 4, 8]) {
    const tail = studentTwoSidedTail(t, 5)
    assert.ok(tail < prev)
    prev = tail
  }
})
