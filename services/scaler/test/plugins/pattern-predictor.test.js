'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { buildServerWithPlugins } = require('../helper')

const envPlugin = require('../../plugins/env')
const storePlugin = require('../../plugins/store')
const patternConfigPlugin = require('../../plugins/pattern-config')
const windowCategoryPlugin = require('../../plugins/window-category')
const patternPredictorPlugin = require('../../plugins/pattern-predictor')
const predictionsRoutes = require('../../routes/predictions')

const WINDOW_CATEGORIES = 5 // default PLT_SCALER_WINDOW_CATEGORIES

const SLOTS_PER_DAY = 48 // the schedule scenarios are 48 half-hour slots
const WINDOW_MINUTES = 30 // 1440 / 48
const WINDOW_MS = WINDOW_MINUTES * 60 * 1000
const MS_PER_DAY = 24 * 60 * 60 * 1000
const PREDICTION_DAYS = 60
const PERCENTILE = 'p90'

// One of the schedule scenarios: chronological days, each carrying its 48 slot values.
function loadScheduleScenario (n) {
  const raw = readFileSync(join(__dirname, '..', 'pattern-predictor', 'schedule', `${n}.history.csv`), 'utf8')
  const byDate = new Map()
  const order = []
  for (const line of raw.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))) {
    const [day, month, year, , slot, value] = line.split(',').map(Number)
    const key = `${year}-${month}-${day}`
    let d = byDate.get(key)
    if (!d) { d = { slots: [] }; byDate.set(key, d); order.push(d) }
    d.slots[slot] = value
  }
  return order
}

test('updatePredictions: learns a schedule scenario and writes per-window forecasts', async (t) => {
  const server = await buildServerWithPlugins(t, {
    PLT_SCALER_TIME_WINDOW_MINUTES: String(WINDOW_MINUTES),
    PLT_SCALER_PATTERN_PERCENTILE: PERCENTILE,
    PLT_SCALER_PATTERN_PREDICTION_DAYS: String(PREDICTION_DAYS)
  }, [envPlugin, storePlugin, patternConfigPlugin, windowCategoryPlugin, patternPredictorPlugin, predictionsRoutes])

  const { entities, db, sql } = server.platformatic
  const appId = randomUUID()

  // Seed time_window_stats from the scenario, re-anchored so the last history day is yesterday
  // (UTC) — the last observed slot ends at todayMidnight, so predictions start there and cover
  // the next N days. Every percentile column is set to the scenario value (the plugin reads only
  // the configured one).
  const days = loadScheduleScenario(1)
  const todayMidnight = Math.floor(Date.now() / MS_PER_DAY) * MS_PER_DAY
  const inputs = []
  days.forEach((day, i) => {
    const dayStart = todayMidnight - (days.length - i) * MS_PER_DAY
    for (let s = 0; s < SLOTS_PER_DAY; s++) {
      const slotStart = dayStart + s * WINDOW_MS
      const v = day.slots[s]
      inputs.push({
        applicationId: appId,
        slotStart: new Date(slotStart),
        slotEnd: new Date(slotStart + WINDOW_MS),
        slotOfDay: s + 1,
        localSlotOfDay: s + 1,
        pods: v
      })
    }
  })
  for (let i = 0; i < inputs.length; i += 500) {
    await entities.timeWindowStat.insert({ inputs: inputs.slice(i, i + 500) })
  }

  // Act — trigger generation via the API endpoint.
  const res = await server.inject({ method: 'POST', url: `/applications/${appId}/predictions` })
  assert.equal(res.statusCode, 200)

  // Full grid: one forecast per (window, day).
  assert.equal(res.json().written, SLOTS_PER_DAY * PREDICTION_DAYS)
  const rows = await entities.timeWindowPrediction.find({ where: { applicationId: { eq: appId } }, limit: 10000 })
  assert.equal(rows.length, SLOTS_PER_DAY * PREDICTION_DAYS)

  // Every row is a valid, slot-aligned forecast anchored at or after the end of history — the
  // forecast joins the actuals seamlessly instead of skipping today.
  const horizonEnd = todayMidnight + PREDICTION_DAYS * MS_PER_DAY
  for (const r of rows) {
    assert.equal(r.percentile, PERCENTILE)
    assert.ok(Number.isInteger(r.predictedPods) && r.predictedPods >= 0, `pods ${r.predictedPods}`)
    assert.ok(r.slotOfDay >= 1 && r.slotOfDay <= SLOTS_PER_DAY)
    const slotStartMs = new Date(r.slotStart).getTime()
    assert.ok(slotStartMs >= todayMidnight && slotStartMs < horizonEnd, 'prediction lies in [lastSlotEnd, +N days)')
    const intoDay = ((slotStartMs % MS_PER_DAY) + MS_PER_DAY) % MS_PER_DAY
    assert.equal(Math.floor(intoDay / WINDOW_MS) + 1, r.slotOfDay, 'slot_start aligns to slot_of_day')
    assert.equal(new Date(r.slotEnd).getTime() - slotStartMs, WINDOW_MS)
  }

  // It actually learned the intraday shape: the busiest historical slot forecasts higher than the
  // quietest one (summed across the horizon to average out day-to-day calendar effects).
  const historyBySlot = new Array(SLOTS_PER_DAY).fill(0)
  for (const day of days) for (let s = 0; s < SLOTS_PER_DAY; s++) historyBySlot[s] += day.slots[s]
  let peak = 0
  let trough = 0
  for (let s = 1; s < SLOTS_PER_DAY; s++) {
    if (historyBySlot[s] > historyBySlot[peak]) peak = s
    if (historyBySlot[s] < historyBySlot[trough]) trough = s
  }
  const forecastBySlot = new Array(SLOTS_PER_DAY).fill(0)
  for (const r of rows) forecastBySlot[r.slotOfDay - 1] += r.predictedPods
  assert.ok(
    forecastBySlot[peak] > forecastBySlot[trough],
    `busiest slot ${peak + 1} (${forecastBySlot[peak]}) should forecast higher than quietest slot ${trough + 1} (${forecastBySlot[trough]})`
  )

  // Every forecast is colored on the same history-derived bands: category set, bounded 1..N, and
  // non-decreasing in the forecast pod count (the same rule that colors the history).
  for (const r of rows) {
    assert.ok(r.category >= 1 && r.category <= WINDOW_CATEGORIES, `category ${r.category} in range`)
  }
  const sortedByPods = rows.slice().sort((a, b) => a.predictedPods - b.predictedPods)
  let prevCat = 0
  for (const r of sortedByPods) {
    assert.ok(r.category >= prevCat, `category dropped at ${r.predictedPods} pods`)
    prevCat = r.category
  }

  // A forecast is colored exactly as a historical window of the same pod count would be: seed one
  // known history value, recategorize, and check a prediction with that value matches.
  const probe = sortedByPods[Math.floor(sortedByPods.length / 2)].predictedPods
  // In the past (so it doesn't move the forecast anchor / lastSlotEnd), within the 1-year
  // categorize scope, and before the 112-day seeded range so it collides with nothing.
  const probeSlot = todayMidnight - 200 * MS_PER_DAY
  await entities.timeWindowStat.insert({
    inputs: [{
      applicationId: appId,
      slotStart: new Date(probeSlot),
      slotEnd: new Date(probeSlot + WINDOW_MS),
      slotOfDay: 1,
      localSlotOfDay: 1,
      pods: probe
    }]
  })
  await server.updateWindowCategories(appId)
  const historyProbe = await entities.timeWindowStat.find({ where: { applicationId: { eq: appId }, pods: { eq: probe } }, limit: 1 })
  const predictionProbe = await entities.timeWindowPrediction.find({ where: { applicationId: { eq: appId }, predictedPods: { eq: probe } }, limit: 1 })
  assert.equal(predictionProbe[0].category, historyProbe[0].category, 'forecast and history of the same pod count share a category')

  // Re-run upserts on (application_id, slot_start): same grid, no duplicates.
  const res2 = await server.inject({ method: 'POST', url: `/applications/${appId}/predictions` })
  assert.equal(res2.statusCode, 200)
  assert.equal(res2.json().written, SLOTS_PER_DAY * PREDICTION_DAYS)
  const rows2 = await entities.timeWindowPrediction.find({ where: { applicationId: { eq: appId } }, limit: 10000 })
  assert.equal(rows2.length, SLOTS_PER_DAY * PREDICTION_DAYS, 'upsert does not duplicate rows')

  // Side-effect: the same run cached the per-window suggestions (new format — no dedup/grouping).
  const sres = await server.inject({ method: 'GET', url: `/applications/${appId}/suggestions` })
  assert.equal(sres.statusCode, 200)
  const cached = sres.json()
  assert.ok(Array.isArray(cached.suggestions) && cached.suggestions.length > 0, 'per-window suggestions cached')
  assert.equal(cached.groups, undefined, 'no grouped/deduped shape anymore')
  assert.ok(Number.isFinite(cached.computedAt))

  // Each suggestion: identity (slotOfDay/scopeKeys) + value at top; display fields under `details`
  // (same shape as an accepted suggestion) + history/predictions rows.
  const s = cached.suggestions[0]
  assert.deepEqual(Object.keys(s).sort(), ['details', 'history', 'predictions', 'scopeKeys', 'slotOfDay', 'value'])
  assert.equal(typeof s.details.when, 'string')
  assert.ok(Array.isArray(s.details.effects) && Array.isArray(s.history) && Array.isArray(s.predictions))

  // The baseline suggestion has no INCLUDED effect and confidence 1 (certain); an effect suggestion
  // carries at least one included effect. value/confidence derive from the included subset.
  const included = (x) => x.details.effects.filter((e) => e.included)
  const baseline = cached.suggestions.find((x) => x.details.when.startsWith('Every day'))
  assert.ok(baseline && included(baseline).length === 0 && baseline.details.confidence === 1)
  const effect = cached.suggestions.find((x) => included(x).length > 0)
  assert.ok(effect, 'the weekday/weekend scenario yields at least one effect suggestion')
  assert.equal(effect.details.confidence, Math.min(...included(effect).map((e) => e.confidence)))
  assert.equal(effect.value, effect.details.baseline + included(effect).reduce((a, e) => a + e.delta, 0))
  // Every effect has a stable id; history rows reference effects by that id.
  assert.ok(effect.details.effects.every((e) => typeof e.id === 'string' && typeof e.included === 'boolean'))

  // History rows link back to a DB id, carry the baseline, and reference effects by id + delta only
  // (date/value are resolved client-side from the id — the response no longer returns them).
  const ids = new Set(effect.details.effects.map((e) => e.id))
  for (const row of effect.history.slice(0, 5)) {
    assert.equal(typeof row.baseline, 'number')
    assert.ok(row.effects.every((e) => ids.has(e.id) && typeof e.delta === 'number'))
  }

  // Prediction rows carry ONLY their DB id — a persisted time_window_predictions uuid, never null
  // (we surface only future days that actually have a stored forecast), no decomposition.
  for (const s of cached.suggestions) {
    for (const row of s.predictions) {
      assert.deepEqual(Object.keys(row), ['id'])
      assert.ok(typeof row.id === 'string' && row.id.length > 0, 'prediction row carries its DB id')
    }
  }

  // An application with no generated predictions yet has no suggestions.
  const miss = await server.inject({ method: 'GET', url: `/applications/${randomUUID()}/suggestions` })
  assert.equal(miss.statusCode, 404)

  await server.store.clearSuggestions(appId)

  // Cleanup while the DB pool is still alive (t.after runs after the server is torn down).
  await db.query(sql`DELETE FROM time_window_predictions WHERE application_id = ${appId}`)
  await db.query(sql`DELETE FROM time_window_stats WHERE application_id = ${appId}`)
})
