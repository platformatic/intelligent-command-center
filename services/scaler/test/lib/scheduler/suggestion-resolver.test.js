'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { prepare, resolveDay } = require('../../../lib/scheduler/suggestion-resolver')

const day = (y, m, d) => Date.UTC(y, m - 1, d)
// Reference days in 2025: the 3rd falls on Fri 2025-01-03; Fridays: 3,10,17,24,31.
const FRI = day(2025, 0 + 1, 10) // a plain Friday (10th)
const FRI_3RD = day(2025, 1, 3) // Friday AND the 3rd
const TUE = day(2025, 1, 7) // a plain Tuesday
const FEB_3 = day(2025, 2, 3) // Monday the 3rd (a 3rd that is not a Friday)

test('baseline only → baseline wins', () => {
  const s = prepare([{ id: 'base', scopeKeys: [], value: 10 }])
  assert.deepEqual(resolveDay(s, TUE), { value: 10, suggestionId: 'base' })
})

test('more specific wins even if lower', () => {
  const s = prepare([
    { id: 'base', scopeKeys: [], value: 10 },
    { id: 'fri', scopeKeys: ['dow|5'], value: 15 },
    { id: 'fri3', scopeKeys: ['dow|5', 'dom|3'], value: 8 } // lower, but most specific
  ])
  assert.equal(resolveDay(s, FRI).suggestionId, 'fri') // plain Friday
  assert.deepEqual(resolveDay(s, FRI_3RD), { value: 8, suggestionId: 'fri3' }) // subset wins, though lower
  assert.equal(resolveDay(s, TUE).suggestionId, 'base')
})

test('siblings (only intersect) → max', () => {
  const s = prepare([
    { id: 'fri', scopeKeys: ['dow|5'], value: 15 },
    { id: 'third', scopeKeys: ['dom|3'], value: 12 }
  ])
  // Friday-the-3rd: both fire, neither is a subset → siblings → max(15,12).
  assert.deepEqual(resolveDay(s, FRI_3RD), { value: 15, suggestionId: 'fri' })
  // A 3rd that is not a Friday → only {3rd} fires.
  assert.equal(resolveDay(s, FEB_3).suggestionId, 'third')
})

test('biweekly refines weekly at equal effect count', () => {
  // {biweekly-Fri, 3rd} ⊊ {Fri, 3rd} — must win despite both having 2 effects.
  // biweekly_dow value = weekday*2 + phase; Friday=5 → 10 or 11. Pick whichever phase fires on FRI_3RD.
  const mk = (bwVal) => prepare([
    { id: 'fri3', scopeKeys: ['dow|5', 'dom|3'], value: 20 },
    { id: 'bw3', scopeKeys: [`biweekly_dow|${bwVal}`, 'dom|3'], value: 6 }
  ])
  const s10 = mk(10)
  const r10 = resolveDay(s10, FRI_3RD)
  const s11 = mk(11)
  const r11 = resolveDay(s11, FRI_3RD)
  // Exactly one phase fires on that day; whichever does, the biweekly combo must win (subset).
  const winner = r10.suggestionId === 'bw3' ? r10 : r11
  assert.deepEqual(winner, { value: 6, suggestionId: 'bw3' }, 'biweekly subset overrides weekly')
})

test('nothing fires → null', () => {
  const s = prepare([{ id: 'fri', scopeKeys: ['dow|5'], value: 15 }])
  assert.equal(resolveDay(s, TUE), null)
})
