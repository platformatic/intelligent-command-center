'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { allScopes } = require('../../../lib/pattern-predictor/scopes')

// Build a slot's UTC calendar fields from an ISO date, the way parseWindowDate + imputeMissing-
// Windows do. dayIndex is the series-relative cycle position; here we anchor it at the UTC epoch
// so day-to-day spacing is exact — biweekly_dow / p14 only care about relative offsets (+7 flips
// parity, +14 returns), so any consistent linear anchor exercises the predicate identically.
const DAY_MS = 24 * 60 * 60 * 1000
const dayOf = (iso) => {
  const d = new Date(iso + 'T00:00:00Z')
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    dom: d.getUTCDate(),
    dow: d.getUTCDay(),
    dayIndex: Math.floor(d.getTime() / DAY_MS)
  }
}

const scopeOf = (feature, value) =>
  allScopes().find((s) => s.feature === feature && s.value === value)

test('the catalogue has the expected families and counts', () => {
  const scopes = allScopes()
  const count = (feature) => scopes.filter((s) => s.feature === feature).length
  assert.equal(count('dow'), 7)
  assert.equal(count('dom'), 31)
  assert.equal(count('eom'), 1)
  assert.equal(count('biweekly_dow'), 14)
  assert.equal(count('p14'), 14)
  assert.equal(scopes.length, 67)
})

test('every scope carries a precomputed key of feature|value', () => {
  for (const scope of allScopes()) {
    assert.equal(scope.key, scope.feature + '|' + scope.value)
  }
})

test('the catalogue is emitted in pick order: anchors before generated aliases', () => {
  // discover sweeps the catalogue in this order directly (no runtime sort), so the emission
  // order is the contract: dow, eom, dom, then biweekly_dow, p14 (eom claims before generic dom).
  const familyOrder = []
  for (const scope of allScopes()) {
    if (familyOrder[familyOrder.length - 1] !== scope.feature) familyOrder.push(scope.feature)
  }
  assert.deepEqual(familyOrder, ['dow', 'eom', 'dom', 'biweekly_dow', 'p14'])
})

test('dow scope matches only its day-of-week', () => {
  const monday = dayOf('2026-06-29') // dow 1
  assert.equal(monday.dow, 1)
  assert.equal(scopeOf('dow', 1).matches(monday), true)
  assert.equal(scopeOf('dow', 2).matches(monday), false)
})

test('dom scope matches only its day-of-month', () => {
  const day = dayOf('2026-06-15')
  assert.equal(scopeOf('dom', 15).matches(day), true)
  assert.equal(scopeOf('dom', 16).matches(day), false)
})

test('eom scope matches the last day of any month, including leap February', () => {
  const eom = allScopes().find((s) => s.feature === 'eom')
  assert.equal(eom.matches(dayOf('2026-01-31')), true)
  assert.equal(eom.matches(dayOf('2026-02-28')), true) // 2026 not a leap year
  assert.equal(eom.matches(dayOf('2026-02-27')), false)
  assert.equal(eom.matches(dayOf('2024-02-29')), true) // 2024 leap year
  assert.equal(eom.matches(dayOf('2024-02-28')), false)
})

test('biweekly_dow splits a weekday into alternating-week parities', () => {
  const monday = dayOf('2026-06-29')
  const nextMonday = dayOf('2026-07-06') // +7 days
  const fortnightMonday = dayOf('2026-07-13') // +14 days
  const tuesday = dayOf('2026-06-30')

  const parityA = scopeOf('biweekly_dow', 1 * 2 + 0)
  const parityB = scopeOf('biweekly_dow', 1 * 2 + 1)

  // Exactly one of the two parities owns this Monday.
  assert.notEqual(parityA.matches(monday), parityB.matches(monday))

  // The owning parity flips the next week and returns the week after.
  const owner = parityA.matches(monday) ? parityA : parityB
  assert.equal(owner.matches(nextMonday), false)
  assert.equal(owner.matches(fortnightMonday), true)

  // Neither parity ever matches a different weekday.
  assert.equal(parityA.matches(tuesday), false)
  assert.equal(parityB.matches(tuesday), false)
})

test('p14 assigns one fixed 14-day cycle position per day', () => {
  const day = dayOf('2026-06-29')
  const plus14 = dayOf('2026-07-13')
  const plus13 = dayOf('2026-07-12')

  const owners = allScopes().filter((s) => s.feature === 'p14' && s.matches(day))
  assert.equal(owners.length, 1) // exactly one position matches any day

  const owner = owners[0]
  assert.equal(owner.matches(plus14), true) // 14 days apart share the position
  assert.equal(owner.matches(plus13), false) // 13 days apart do not
})
