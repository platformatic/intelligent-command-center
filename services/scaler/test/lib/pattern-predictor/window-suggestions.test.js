'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { buildModel } = require('../../../lib/pattern-predictor/model')
const { buildWindowSuggestions } = require('../../../lib/pattern-predictor/suggestions')

const DAY = 24 * 60 * 60 * 1000
const START = Date.UTC(2025, 0, 5) // a Sunday

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

// One slot's 90-day series: Friday = 22, every other day = 10, ±1 noise.
function fridaySeries (seed = 9) {
  const rng = mulberry32(seed)
  const series = []
  for (let d = 0; d < 90; d++) {
    const date = new Date(START + d * DAY)
    const fri = date.getUTCDay() === 5
    series.push({ date, value: Math.max(1, Math.round((fri ? 22 : 10) + (rng() * 2 - 1))) })
  }
  return series
}

const OPTS = { slot: 17, slotCount: 24, anchor: START, now: START + 90 * DAY, futureDays: 60 }

// 400-day series with two overlapping effects: Friday +8 and the 3rd-of-month +8 (both strong
// enough to be discovered, and the 3rd lands on a Friday a couple of times → a real intersection).
function friday3rdSeries (seed = 11) {
  const rng = mulberry32(seed)
  const start = Date.UTC(2024, 0, 1)
  const series = []
  for (let d = 0; d < 400; d++) {
    const date = new Date(start + d * DAY)
    let v = 10
    if (date.getUTCDay() === 5) v += 8
    if (date.getUTCDate() === 3) v += 8
    series.push({ date, value: Math.max(1, Math.round(v + (rng() * 2 - 1))) })
  }
  return { series, start }
}

test('per-window: emits one suggestion per realized COMBINATION, value = baseline + Σ combo effects', () => {
  const { series, start } = friday3rdSeries()
  const sugs = buildWindowSuggestions(buildModel(series), { slot: 12, slotCount: 24, anchor: start, now: start + 400 * DAY, futureDays: 120 })

  const byWhen = (frag) => sugs.find((s) => s.details.when.startsWith(frag))
  const incl = (s) => s.details.effects.filter((e) => e.included)
  const base = byWhen('Every day')
  const fri = byWhen('Every Friday')
  const third = byWhen('On the 3rd')
  const both = sugs.find((s) => incl(s).length === 2) // the {Fri,3rd} intersection
  assert.ok(base && fri && third && both, 'baseline + {Fri} + {3rd} + {Fri,3rd}')

  // value = baseline + Σ INCLUDED effect deltas (co-firing extras are listed but not summed).
  assert.equal(fri.value, fri.details.baseline + incl(fri).reduce((a, e) => a + e.delta, 0))
  assert.equal(third.value, third.details.baseline + incl(third).reduce((a, e) => a + e.delta, 0))

  // The intersection combination sums BOTH effects, confidence = min over the included ones.
  assert.equal(both.value, both.details.baseline + incl(both).reduce((a, e) => a + e.delta, 0))
  assert.equal(both.details.confidence, Math.min(...incl(both).map((e) => e.confidence)))
  assert.ok(incl(both).every((e) => typeof e.confidence === 'number'))
  assert.ok(both.value > fri.value && both.value > third.value, 'intersection is higher than either alone')

  // Every effect has a stable id; history rows reference effects by that id (no repeated `when`).
  assert.ok(fri.details.effects.every((e) => typeof e.id === 'string' && typeof e.when === 'string'))

  // Superset history: the {Friday} suggestion lists Friday-the-3rds too. That row references both the
  // Friday effect (included) and the 3rd effect (included:false, per the top-level effects list).
  const inc = new Map(fri.details.effects.map((e) => [e.id, e.included]))
  const mixed = fri.history.find((r) => r.effects.length > 1)
  assert.ok(mixed, 'a Friday-the-3rd appears in the Friday suggestion history')
  assert.ok(mixed.effects.every((e) => inc.has(e.id)), 'every history effect id resolves to a top-level effect')
  assert.ok(mixed.effects.some((e) => inc.get(e.id) === true) && mixed.effects.some((e) => inc.get(e.id) === false))
})

test('per-window: baseline + one suggestion per effect, no cross-slot grouping', () => {
  const suggestions = buildWindowSuggestions(buildModel(fridaySeries()), OPTS)
  assert.equal(suggestions.length, 2) // baseline + Friday
  const baseline = suggestions.find((s) => s.details.when.startsWith('Every day'))
  const fri = suggestions.find((s) => s.details.when.startsWith('Every Friday'))
  assert.ok(baseline && fri)

  // Baseline: no INCLUDED effect (value = resting level); any effect it lists (a Friday landing in
  // the last-14-day window) is included:false. History capped at the last 14 days (not all history).
  assert.ok(baseline.details.effects.every((e) => !e.included), 'baseline includes no effect')
  assert.equal(baseline.value, baseline.details.baseline)
  assert.equal(baseline.history.length, 14)
  assert.equal(baseline.predictions.length, 60)

  // Overall confidence = MIN of included effects; baseline has none → 1 (certain).
  const friEff = fri.details.effects.find((e) => e.included)
  assert.equal(baseline.details.confidence, 1)
  assert.equal(fri.details.confidence, friEff.confidence)

  // Friday: value = baseline + its delta; one own effect with a confidence and a stable id.
  assert.equal(fri.value, fri.details.baseline + friEff.delta)
  assert.equal(fri.details.effects.filter((e) => e.included).length, 1)
  assert.equal(typeof friEff.confidence, 'number')
  assert.equal(typeof friEff.id, 'string')
  assert.ok(friEff.when.startsWith('Every Friday'))
  // ~13 Fridays in 90 days of history, ~8 in the next 60.
  assert.ok(fri.history.length >= 12 && fri.history.length <= 14)
  assert.ok(fri.predictions.length >= 8 && fri.predictions.length <= 9)
})

test('per-window: rows decompose value = baseline + Σ effects, with included + id', () => {
  const statsIds = new Map()
  const predIds = new Map()
  // Tag a couple of known Fridays so we can assert id threading.
  const firstFri = Date.UTC(2025, 0, 10)
  statsIds.set(firstFri, 'stat-abc')
  const futureFri = Date.UTC(2025, 3, 11)
  predIds.set(futureFri, 'pred-xyz')

  const [, fri] = [null, buildWindowSuggestions(buildModel(fridaySeries()), { ...OPTS, statsIds, predIds })
    .find((s) => s.details.when.startsWith('Every Friday'))]

  const inc = new Map(fri.details.effects.map((e) => [e.id, e.included]))
  for (const row of fri.history) {
    const sum = row.baseline + row.effects.reduce((a, e) => a + e.delta, 0)
    assert.equal(row.value, Math.max(0, sum), 'value = baseline + Σ effects')
    assert.ok(row.effects.every((e) => typeof e.id === 'string' && inc.has(e.id)), 'effects reference top-level ids')
    assert.match(row.date, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(row.effects.some((e) => inc.get(e.id) === true), 'the own effect is marked included')
  }
  // Prediction rows carry only their DB id (the flat forecast's decomposition = the suggestion header).
  for (const row of fri.predictions) assert.deepEqual(Object.keys(row), ['id'])

  assert.equal(fri.history.find((r) => r.date === '2025-01-10').id, 'stat-abc')
  // Only days present in predIds are surfaced, each carrying that id.
  assert.deepEqual(fri.predictions, [{ id: 'pred-xyz' }])
})

test('per-window: a co-firing OTHER effect appears in rows as included:false', () => {
  // Add a day-of-month effect so some Fridays also carry the dom effect.
  const rng = mulberry32(3)
  const series = []
  for (let d = 0; d < 120; d++) {
    const date = new Date(START + d * DAY)
    let v = 10
    if (date.getUTCDay() === 5) v += 12 // Friday
    if (date.getUTCDate() === 15) v += 6 // 15th of month
    series.push({ date, value: Math.max(1, Math.round(v + (rng() * 2 - 1))) })
  }
  const suggestions = buildWindowSuggestions(buildModel(series), { ...OPTS, now: START + 120 * DAY })
  const fri = suggestions.find((s) => s.details.when.startsWith('Every Friday'))
  assert.ok(fri, 'a Friday suggestion exists')
  // Some Friday row (a Friday that is also the 15th) should reference a second effect that the
  // top-level effects list marks included:false.
  const inc = new Map(fri.details.effects.map((e) => [e.id, e.included]))
  const mixed = fri.history.find((r) => r.effects.length > 1)
  if (mixed) {
    assert.ok(mixed.effects.some((e) => inc.get(e.id) === true), 'own Friday effect included')
    assert.ok(mixed.effects.some((e) => inc.get(e.id) === false), 'the foreign effect is included:false but contributes')
    assert.equal(mixed.value, mixed.baseline + mixed.effects.reduce((a, e) => a + e.delta, 0))
  }
})
