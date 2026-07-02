'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { buildServerWithPlugins } = require('../helper')

const envPlugin = require('../../plugins/env')
const patternPredictorPlugin = require('../../plugins/pattern-predictor')
const predictionsRoutes = require('../../routes/predictions')

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
  }, [envPlugin, patternPredictorPlugin, predictionsRoutes])

  const { entities, db, sql } = server.platformatic
  const appId = randomUUID()

  // Seed time_window_stats from the scenario, re-anchored so the last history day is yesterday
  // (UTC) — predictions for tomorrow..+N then continue the series. Every percentile column is set
  // to the scenario value (the plugin reads only the configured one).
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

  // Every row is a valid, future, slot-aligned forecast.
  const now = Date.now()
  for (const r of rows) {
    assert.equal(r.percentile, PERCENTILE)
    assert.ok(Number.isInteger(r.predictedPods) && r.predictedPods >= 0, `pods ${r.predictedPods}`)
    assert.ok(r.slotOfDay >= 1 && r.slotOfDay <= SLOTS_PER_DAY)
    const slotStartMs = new Date(r.slotStart).getTime()
    assert.ok(slotStartMs > now, 'prediction is in the future')
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

  // Re-run upserts on (application_id, slot_start): same grid, no duplicates.
  const res2 = await server.inject({ method: 'POST', url: `/applications/${appId}/predictions` })
  assert.equal(res2.statusCode, 200)
  assert.equal(res2.json().written, SLOTS_PER_DAY * PREDICTION_DAYS)
  const rows2 = await entities.timeWindowPrediction.find({ where: { applicationId: { eq: appId } }, limit: 10000 })
  assert.equal(rows2.length, SLOTS_PER_DAY * PREDICTION_DAYS, 'upsert does not duplicate rows')

  // Cleanup while the DB pool is still alive (t.after runs after the server is torn down).
  await db.query(sql`DELETE FROM time_window_predictions WHERE application_id = ${appId}`)
  await db.query(sql`DELETE FROM time_window_stats WHERE application_id = ${appId}`)
})
