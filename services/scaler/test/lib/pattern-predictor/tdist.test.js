'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { tCriticalTwoSided, studentTwoSidedTail } = require('../../../lib/pattern-predictor/tdist')

const close = (a, b, eps) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`)

// tCriticalTwoSided(df, 0.05 / familySize) against the reference validation table.
const FAMILY = { eom: 1, dow: 7, biweekly: 14, dom: 31 }
const TABLE = {
  1: { eom: 12.706, dow: 89.123, biweekly: 178.252, dom: 394.703 },
  2: { eom: 4.303, dow: 11.769, biweekly: 16.688, dom: 24.870 },
  3: { eom: 3.182, dow: 6.580, biweekly: 8.374, dom: 10.991 },
  4: { eom: 2.776, dow: 5.068, biweekly: 6.138, dom: 7.594 },
  5: { eom: 2.571, dow: 4.382, biweekly: 5.164, dom: 6.183 },
  6: { eom: 2.447, dow: 3.997, biweekly: 4.632, dom: 5.433 }
}

test('tCriticalTwoSided matches the reference table (df 1–6 × family Bonferroni)', () => {
  for (const df of Object.keys(TABLE)) {
    for (const fam of Object.keys(FAMILY)) {
      const got = tCriticalTwoSided(Number(df), 0.05 / FAMILY[fam])
      close(got, TABLE[df][fam], 5e-3)
    }
  }
})

test('studentTwoSidedTail spot check: tail(t=2, df=5) ≈ 0.102', () => {
  close(studentTwoSidedTail(2, 5), 0.102, 1e-3)
})

test('tCriticalTwoSided fails closed on invalid inputs', () => {
  assert.equal(tCriticalTwoSided(0, 0.05), Infinity)
  assert.equal(tCriticalTwoSided(5, 0), Infinity)
  assert.equal(tCriticalTwoSided(5, 1), Infinity)
})
