'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { generateSuggestions, groupSuggestions, toSchedule, scopeMatchesDay, patternWindows } = require('../../../lib/pattern-predictor/suggestions')
const { isActiveAt } = require('../../../lib/scheduler/occurrences')

// A hand-specified schedule to validate the flat suggestion list AND the grouping:
//   3 months · baseline 10 pods all day, EXCEPT a 17:00–21:00 (5–9 PM) window where
//     Monday = 15 and Friday = 3 (every other day stays 10) · ±1 pod noise everywhere.
// Expected flat list: Mon/Fri patterns appear ONLY in the evening slots (17–20).
// Expected groups: baseline (all day = 10), Mon (17:00–21:00 = 15), Fri (17:00–21:00 = 3).

function mulberry32 (seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DAY_MS = 24 * 60 * 60 * 1000
const START = Date.UTC(2025, 0, 6) // a Monday
const SLOTS = 24 // 1-hour slots
const DAYS = 90 // ~3 months
const isEvening = (s) => s >= 17 && s <= 20 // 17:00–21:00

// day.getUTCDay(): Sunday=0 … Monday=1 … Friday=5 (matches the algorithm's dow convention).
function baseFor (jsDay, slot) {
  if (isEvening(slot) && jsDay === 1) return 15 // Monday evening
  if (isEvening(slot) && jsDay === 5) return 3 // Friday evening
  return 10
}

function makeHistory () {
  const rng = mulberry32(0xC0FFEE)
  const noise = () => rng() * 2 - 1 // uniform ±1
  const history = []
  for (let i = 0; i < DAYS; i++) {
    const date = new Date(START + i * DAY_MS)
    const jsDay = date.getUTCDay()
    const slots = []
    for (let s = 0; s < SLOTS; s++) slots.push(Math.max(0, Math.round(baseFor(jsDay, s) + noise())))
    history.push({ date, slots })
  }
  return history
}

const suggestions = generateSuggestions(makeHistory())
const groups = groupSuggestions(suggestions)
const groupFor = (days) => groups.find((g) => g.pattern === days)

test('flat list: Mon/Fri patterns appear ONLY in the 17:00–21:00 window', () => {
  for (const s of suggestions.filter((x) => x.days === 'Mons' || x.days === 'Fris')) {
    assert.ok(isEvening(s.slotIndex), `${s.days} leaked outside the evening window at slot ${s.slotIndex} (${s.slot})`)
  }
})

test('grouping collapses to: baseline all-day, Mon 5–9 PM, Fri 5–9 PM', () => {
  const base = groupFor('most days')
  const mon = groupFor('Mons')
  const fri = groupFor('Fris')
  assert.ok(base && mon && fri, 'expected one group each for baseline / Mon / Fri')

  assert.equal(base.value, 10)
  assert.ok(base.slots[0] <= 1 && base.slots[1] >= 22, `baseline window ${base.window} should be ~all day`)

  assert.deepEqual(mon.slots, [17, 20], `Mon window ${mon.window}`)
  assert.equal(mon.value, 15)
  assert.deepEqual(fri.slots, [17, 20], `Fri window ${fri.window}`)
  assert.equal(fri.value, 3)

  // Each group carries a plain-language "when this happens".
  assert.equal(base.when, 'By default, all day')
  assert.equal(mon.when, 'Every Monday, from 5 PM to 9 PM')
  assert.equal(fri.when, 'Every Friday, from 5 PM to 9 PM')
})

test('no spurious strong groups', () => {
  for (const g of groups) {
    if (!['most days', 'Mons', 'Fris'].includes(g.pattern)) {
      assert.ok(g.confidence < 0.7, `unexpected group ${g.pattern} @ ${g.window} conf ${g.confidence}`)
    }
  }
})

test('sorted by confidence, descending', () => {
  for (let i = 1; i < suggestions.length; i++) assert.ok(suggestions[i - 1].confidence >= suggestions[i].confidence)
})

// Translate groups into scheduler-ready RRULE schedules, then prove correctness by round-tripping
// each one through the ACTUAL scheduler (isActiveAt) — not just string-matching the RRULE.
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

  // Identical recurrence — the two parities are unrepresentable in the RRULE alone…
  assert.equal(even.rrule, 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO')
  assert.equal(odd.rrule, even.rrule)
  // …so the phase is carried by anchoring dtstart one week apart.
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

test('patternWindows: observed (exact) + 60-day forecast; baseline enumerates nothing', () => {
  const WINDOW_MS = 60 * 60 * 1000 // 1-hour slots (SLOTS = 24)
  const observed = new Map()
  for (const h of makeHistory()) {
    observed.set(Date.UTC(h.date.getUTCFullYear(), h.date.getUTCMonth(), h.date.getUTCDate()), h.slots)
  }
  const anchor = START
  const now = START + DAYS * DAY_MS // just past the history
  const groups = groupSuggestions(generateSuggestions(makeHistory()))

  const mon = groups.find((x) => x.pattern === 'Mons')
  const wins = patternWindows(mon, { observed, anchor, now, futureDays: 60, windowMs: WINDOW_MS })
  const past = wins.filter((w) => !w.predicted)
  const future = wins.filter((w) => w.predicted)
  assert.ok(past.length > 0 && future.length > 0, 'both observed and forecast windows')

  for (const w of wins) {
    const d = new Date(w.slotStart)
    assert.equal(d.getUTCDay(), 1, 'every window is a Monday')
    assert.ok(d.getUTCHours() >= 17 && d.getUTCHours() <= 20, 'in the 17:00–21:00 block')
  }
  for (const w of future) assert.equal(w.pods, mon.value, 'forecast uses the pattern floor')
  for (let i = 1; i < wins.length; i++) assert.ok(Date.parse(wins[i].slotStart) >= Date.parse(wins[i - 1].slotStart), 'sorted')

  const baseline = groups.find((x) => x.kind === 'baseline')
  assert.deepEqual(patternWindows(baseline, { observed, anchor, now, futureDays: 60, windowMs: WINDOW_MS }), [])
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

  // The baseline is an always-on daily floor at the lowest priority — effects override it.
  const base = toSchedule({ kind: 'baseline', scopeValue: null, window: '00:00–24:00', value: 10 }, ANCHOR, ANCHOR)
  assert.equal(base.rrule, 'FREQ=DAILY')
  assert.equal(base.priority, 0)
  assert.equal(base.minPods, 10)
  assert.ok(isActiveAt(base, at(2025, 1, 8, 3)), 'baseline is active on any day')
})

// The whole point of priority: a below-baseline effect (quiet Friday) must win over the always-on
// baseline — which the pre-priority MAX resolver could never do. Round-trip through the resolver.
test('toSchedule + resolver: a below-baseline effect overrides the baseline', async () => {
  const resolve = require('../../../lib/scheduler/default-resolver')
  const baseline = toSchedule({ kind: 'baseline', scopeValue: null, window: '00:00–24:00', value: 10 }, ANCHOR, ANCHOR)
  const friEve = toSchedule({ kind: 'dow', scopeValue: 5, window: '17:00–21:00', value: 3 }, ANCHOR, ANCHOR)

  // Friday 18:00 — both active. Priority makes the quiet-Friday floor (3) win over baseline (10).
  const friday6pm = at(2025, 1, 10, 18) // 2025-01-10 is a Friday
  const active = [baseline, friEve].filter((s) => isActiveAt(s, friday6pm))
  assert.equal(active.length, 2, 'both baseline and Friday effect are active')
  assert.deepEqual(await resolve({ schedules: active }), { minPods: 3, maxPods: null })

  // Tuesday 18:00 — only the baseline is active → 10.
  const tue6pm = at(2025, 1, 7, 18)
  const activeTue = [baseline, friEve].filter((s) => isActiveAt(s, tue6pm))
  assert.deepEqual(await resolve({ schedules: activeTue }), { minPods: 10, maxPods: null })
})
