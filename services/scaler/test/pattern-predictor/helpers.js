'use strict'

// Helpers for the unit suites. They build a value-per-day series anchored at a fixed Monday and
// drive lib/pattern-predictor, translating between the upstream algorithm's row shape and ours:
//   predict(history, target)        → predict(buildModel(series), targetDate)
//   discover(rows).terms            → buildModel(series).patterns
//   row { dayOfWeek(0=Mon), dom, … }→ series { date, value } (we derive dow/dom from the real date)
//   model.observed[]                → model.timeWindows[i].observed
//   dow value 0 (Monday)            → our dow value 1 (getUTCDay)
// BASE = 2024-01-01 is a Monday and days index from 0, so a real-date series reproduces the same
// calendar the upstream fixtures assume (i % 7 === 0 ⇒ Monday).

const { buildModel, predict } = require('../../lib/pattern-predictor/model')

const DAY_MS = 86400000
const BASE = Date.UTC(2024, 0, 1) // Monday, matching the fixtures' calendar anchor

const dateAt = (i) => new Date(BASE + i * DAY_MS)

// Reference `vals` array (one value per day from BASE) → our model / prediction.
const seriesFromVals = (vals) => vals.map((value, i) => ({ date: dateAt(i), value }))
const modelFromVals = (vals) => buildModel(seriesFromVals(vals))
const predictVals = (vals, targetIndex) => predict(modelFromVals(vals), dateAt(targetIndex))

// CSV fixture row { day, month, year, value } → our series entry.
const dateOfRow = (row) => new Date(Date.UTC(row.year, row.month - 1, row.day))
const seriesFromRows = (rows) => rows.map((row) => ({ date: dateOfRow(row), value: row.value }))

// Reference dow (0 = Monday) → our dow (getUTCDay, 1 = Monday).
const ourDow = (refDow) => (refDow + 1) % 7

// One scope feature/value lookup over a model's patterns.
const patternFor = (model, feature, value) =>
  model.patterns.find((p) => p.scope.feature === feature && p.scope.value === value)

module.exports = {
  buildModel,
  predict,
  DAY_MS,
  BASE,
  dateAt,
  seriesFromVals,
  modelFromVals,
  predictVals,
  dateOfRow,
  seriesFromRows,
  ourDow,
  patternFor
}
