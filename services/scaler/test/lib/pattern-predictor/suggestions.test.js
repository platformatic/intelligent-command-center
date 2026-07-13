'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { toSchedule, scopeMatchesDay } = require('../../../lib/pattern-predictor/suggestions')
const { isActiveAt } = require('../../../lib/scheduler/occurrences')

// These exercise the scheduler-facing helpers that survive the dedup removal: turning a scope +
// time-window into an RRULE schedule, and the day-matching predicate. (Per-window suggestion
// generation is covered by window-suggestions.test.js.)

const at = (y, mo, d, h, mi = 0) => Date.UTC(y, mo - 1, d, h, mi)
const ANCHOR = Date.UTC(2025, 0, 6) // a Monday; stands in for the series' first history day

test('toSchedule: weekly dow → RRULE + windowed dtstart, active only in-window on that weekday', () => {
  const s = toSchedule({ kind: 'dow', scopeValue: 1, window: '17:00–21:00', value: 15 }, ANCHOR, ANCHOR)
  assert.equal(s.rrule, 'FREQ=WEEKLY;BYDAY=MO')
  assert.equal(s.minPods, 15)
  assert.equal(s.priority, 1, 'effects outrank the baseline')
  assert.ok(isActiveAt(s, at(2025, 1, 6, 18)), 'Monday inside window')
  assert.ok(isActiveAt(s, at(2025, 1, 13, 20)), 'the next Monday too (weekly)')
  assert.ok(!isActiveAt(s, at(2025, 1, 7, 18)), 'Tuesday')
  assert.ok(!isActiveAt(s, at(2025, 1, 6, 16)), 'Monday but before 17:00')
})

test('toSchedule: biweekly phase lives in dtstart, not the RRULE', () => {
  const opts = { kind: 'biweekly_dow', window: '17:00–21:00', value: 15 }
  const even = toSchedule({ ...opts, scopeValue: 2 }, ANCHOR, ANCHOR) // Mon, parity 0
  const odd = toSchedule({ ...opts, scopeValue: 3 }, ANCHOR, ANCHOR) // Mon, parity 1

  assert.equal(even.rrule, 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO')
  assert.equal(odd.rrule, even.rrule)
  assert.equal(new Date(odd.dtstart) - new Date(even.dtstart), 7 * 24 * 3600 * 1000)

  assert.ok(isActiveAt(even, at(2025, 1, 6, 18)) && !isActiveAt(even, at(2025, 1, 13, 18)) && isActiveAt(even, at(2025, 1, 20, 18)), 'even weeks')
  assert.ok(!isActiveAt(odd, at(2025, 1, 6, 18)) && isActiveAt(odd, at(2025, 1, 13, 18)) && isActiveAt(odd, at(2025, 1, 27, 18)), 'odd weeks — the complement')
})

test('scopeMatchesDay: each scope kind against the anchor', () => {
  const anchor = Date.UTC(2025, 0, 6) // a Monday
  assert.ok(scopeMatchesDay('dow', 1, Date.UTC(2025, 0, 13), anchor)) // a Monday
  assert.ok(!scopeMatchesDay('dow', 1, Date.UTC(2025, 0, 14), anchor)) // a Tuesday
  assert.ok(scopeMatchesDay('dom', 15, Date.UTC(2025, 2, 15), anchor))
  assert.ok(scopeMatchesDay('eom', 0, Date.UTC(2025, 1, 28), anchor)) // Feb 28 = last day
  assert.ok(scopeMatchesDay('baseline', null, Date.UTC(2030, 5, 5), anchor)) // every day
  assert.ok(scopeMatchesDay('biweekly_dow', 2, Date.UTC(2025, 0, 6), anchor)) // Mon, parity 0
  assert.ok(!scopeMatchesDay('biweekly_dow', 2, Date.UTC(2025, 0, 13), anchor)) // next Mon, parity 1
  assert.ok(scopeMatchesDay('p14', 0, Date.UTC(2025, 0, 20), anchor)) // anchor + 14 days
})

test('toSchedule: monthly dom, eom, 14-day cycle, and baseline', () => {
  const dom = toSchedule({ kind: 'dom', scopeValue: 15, window: '00:00–24:00', value: 8 }, ANCHOR, ANCHOR)
  assert.equal(dom.rrule, 'FREQ=MONTHLY;BYMONTHDAY=15')
  assert.ok(isActiveAt(dom, at(2025, 2, 15, 12)) && !isActiveAt(dom, at(2025, 2, 16, 12)))

  const eom = toSchedule({ kind: 'eom', scopeValue: 0, window: '00:00–24:00', value: 20 }, ANCHOR, ANCHOR)
  assert.equal(eom.rrule, 'FREQ=MONTHLY;BYMONTHDAY=-1')
  assert.ok(isActiveAt(eom, at(2025, 2, 28, 12)) && !isActiveAt(eom, at(2025, 2, 27, 12)), 'Feb last day')

  const p14 = toSchedule({ kind: 'p14', scopeValue: 0, window: '09:00–10:00', value: 5 }, ANCHOR, ANCHOR)
  assert.equal(p14.rrule, 'FREQ=DAILY;INTERVAL=14')
  assert.ok(isActiveAt(p14, at(2025, 1, 6, 9, 30)) && isActiveAt(p14, at(2025, 1, 20, 9, 30)) && !isActiveAt(p14, at(2025, 1, 13, 9, 30)))

  const base = toSchedule({ kind: 'baseline', scopeValue: null, window: '00:00–24:00', value: 10 }, ANCHOR, ANCHOR)
  assert.equal(base.rrule, 'FREQ=DAILY')
  assert.equal(base.priority, 0)
  assert.equal(base.minPods, 10)
  assert.ok(isActiveAt(base, at(2025, 1, 8, 3)), 'baseline is active on any day')
})

test('toSchedule + resolver: a below-baseline effect overrides the baseline', async () => {
  const resolve = require('../../../lib/scheduler/default-resolver')
  const baseline = toSchedule({ kind: 'baseline', scopeValue: null, window: '00:00–24:00', value: 10 }, ANCHOR, ANCHOR)
  const friEve = toSchedule({ kind: 'dow', scopeValue: 5, window: '17:00–21:00', value: 3 }, ANCHOR, ANCHOR)

  const friday6pm = at(2025, 1, 10, 18) // 2025-01-10 is a Friday
  const active = [baseline, friEve].filter((s) => isActiveAt(s, friday6pm))
  assert.equal(active.length, 2, 'both baseline and Friday effect are active')
  assert.deepEqual(await resolve({ schedules: active }), { minPods: 3, maxPods: null })

  const tue6pm = at(2025, 1, 7, 18)
  const activeTue = [baseline, friEve].filter((s) => isActiveAt(s, tue6pm))
  assert.deepEqual(await resolve({ schedules: activeTue }), { minPods: 10, maxPods: null })
})
