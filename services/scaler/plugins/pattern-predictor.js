'use strict'

const fp = require('fastify-plugin')
const { buildModel, predict } = require('../lib/pattern-predictor/model')
const { buildWindowSuggestions } = require('../lib/pattern-predictor/suggestions')

const MINUTES_PER_DAY = 24 * 60
const MS_PER_DAY = MINUTES_PER_DAY * 60 * 1000

// Every read is bounded to a recent window and an explicit LIMIT. The predictor is strictly PER
// SLOT (each slot_of_day is its own daily series), so nothing ever fetches across slots or the whole
// history — at 5-min windows that would be 288 slots × a year of rows. HISTORY_DAYS caps how far
// back a single slot's series reaches; it's a whole number of rows per slot, never the whole table.
const HISTORY_DAYS = 365

module.exports = fp(async function (app) {
  const sql = app.platformatic.sql
  const windowMs = Number(app.env.PLT_SCALER_TIME_WINDOW_MINUTES) * 60 * 1000
  const windowsPerDay = MS_PER_DAY / windowMs
  const percentile = app.env.PLT_SCALER_PATTERN_PERCENTILE // recorded on each prediction row
  const predictionDays = Number(app.env.PLT_SCALER_PATTERN_PREDICTION_DAYS)
  const dayMidnightOf = (t) => Math.floor(new Date(t).getTime() / MS_PER_DAY) * MS_PER_DAY

  // Forecast and persist, per time window, the next PLT_SCALER_PATTERN_PREDICTION_DAYS days
  // starting at the slot immediately after the last observed history row — so the forecast joins
  // the actuals seamlessly instead of skipping the remainder of today. Each window number
  // (slot_of_day) is an independent daily series — the configured percentile per day from
  // time_window_stats — fed through the pattern-predictor: history → impute → discover patterns
  // → forecast. The per-window model is built once and projected across the horizon (buildModel
  // dominates; predict is cheap), then the window's batch is upserted into time_window_predictions
  // on (application_id, slot_start) — so a re-run refreshes each slot in place. Returns the
  // number of prediction rows written; 0 if the app has no history yet.
  app.decorate('updatePredictions', async (applicationId) => {
    const lastSlotEnd = await fetchLastSlotEnd(applicationId)
    if (lastSlotEnd == null) return 0
    const horizonEnd = lastSlotEnd + predictionDays * MS_PER_DAY
    const now = Date.now()
    const historyFromMs = dayMidnightOf(now) - HISTORY_DAYS * MS_PER_DAY

    const suggestions = []
    let written = 0
    for (let windowNumber = 1; windowNumber <= windowsPerDay; windowNumber++) {
      // ONE slot's recent daily series — bounded window + explicit LIMIT, never all slots at once.
      const rows = await fetchWindowAcrossDays(applicationId, windowNumber, historyFromMs)
      if (rows.length === 0) continue

      const series = rows.map((row) => ({ date: new Date(row.slotStart), value: row.pods }))
      const model = buildModel(series)

      const slotOffset = (windowNumber - 1) * windowMs
      // Smallest UTC midnight whose slot at this window sits at or after lastSlotEnd. Rolls to the
      // next day for windows earlier in the day than where history ended, stays on today for
      // windows at or after that point — so the full [lastSlotEnd, horizonEnd) grid is covered.
      let dayMs = Math.ceil((lastSlotEnd - slotOffset) / MS_PER_DAY) * MS_PER_DAY

      const predictions = []
      for (; dayMs + slotOffset < horizonEnd; dayMs += MS_PER_DAY) {
        const slotStart = dayMs + slotOffset
        predictions.push({
          applicationId,
          slotStart: new Date(slotStart),
          slotEnd: new Date(slotStart + windowMs),
          slotOfDay: windowNumber,
          percentile,
          predictedPods: predict(model, new Date(dayMs))
        })
      }
      if (predictions.length) {
        await upsertPredictions(predictions)
        written += predictions.length
      }

      // Per-slot suggestions (baseline + one per effect) — reads ONLY this slot's rows for the
      // predicted-vs-actual `id`s. No cross-slot grouping; no whole-grid fetch.
      if (app.store) {
        const statsIds = new Map(rows.map((r) => [dayMidnightOf(r.slotStart), r.id]))
        const predRows = await fetchSlotPredictions(applicationId, windowNumber, historyFromMs)
        const predIds = new Map(predRows.map((r) => [dayMidnightOf(r.slot_start), r.id]))
        suggestions.push(...buildWindowSuggestions(model, {
          slot: windowNumber - 1,
          slotCount: windowsPerDay,
          anchor: new Date(rows[0].slotStart).getTime(),
          now,
          futureDays: predictionDays,
          statsIds,
          predIds
        }))
      }
    }

    // Color the freshly written forecasts on the same history-derived bands as the time windows.
    if (written > 0) await app.updateWindowCategories(applicationId)

    // Cache the per-window suggestions for the dashboard — a side-effect that never fails the
    // forecast (predictions are already written).
    if (app.store) {
      try {
        await app.store.saveSuggestions(applicationId, { suggestions })
        app.log.debug({ applicationId, suggestions: suggestions.length }, 'stored window suggestions')
      } catch (err) {
        app.log.error({ err, applicationId }, 'Failed to store window suggestions')
      }
    }
    return written
  })

  // Upsert one window's batch of daily predictions, keyed on (application_id, slot_start) so a
  // re-run overwrites each slot's forecast in place rather than duplicating it.
  function upsertPredictions (rows) {
    const values = sql.join(
      rows.map((r) => sql`(${r.applicationId}, ${r.slotStart}, ${r.slotEnd}, ${r.slotOfDay}, ${r.percentile}, ${r.predictedPods})`),
      sql`, `
    )
    return app.platformatic.db.query(sql`
      INSERT INTO time_window_predictions
        (application_id, slot_start, slot_end, slot_of_day, percentile, predicted_pods)
      VALUES ${values}
      ON CONFLICT (application_id, slot_start) DO UPDATE SET
        slot_end = EXCLUDED.slot_end,
        slot_of_day = EXCLUDED.slot_of_day,
        percentile = EXCLUDED.percentile,
        predicted_pods = EXCLUDED.predicted_pods
    `)
  }

  // The frozen predictions for ONE slot (slot_of_day) over the recent window — the predicted-vs-actual
  // `id`s for that slot's suggestion rows. Raw SQL so it isn't capped by the sql-mapper 1000 limit,
  // but it stays one slot bounded to HISTORY_DAYS of past + the forecast horizon, with an explicit
  // ORDER BY + LIMIT so it can never fetch the whole table (5-min windows × a year would be huge).
  async function fetchSlotPredictions (applicationId, windowNumber, fromMs) {
    const cap = HISTORY_DAYS + predictionDays + 2
    const res = await app.platformatic.db.query(sql`
      SELECT id, slot_start FROM time_window_predictions
      WHERE application_id = ${applicationId} AND slot_of_day = ${windowNumber} AND slot_start >= ${new Date(fromMs)}
      ORDER BY slot_start ASC
      LIMIT ${cap}
    `)
    return res.rows || res || []
  }

  // ONE slot's (slot_of_day) recent daily series, oldest→newest. Bounded to HISTORY_DAYS with an
  // explicit LIMIT so it's never the whole history and never rides an implicit default.
  function fetchWindowAcrossDays (applicationId, windowNumber, fromMs) {
    return app.platformatic.entities.timeWindowStat.find({
      fields: ['id', 'slotStart', 'pods'],
      where: {
        applicationId: { eq: applicationId },
        slotOfDay: { eq: windowNumber },
        slotStart: { gte: new Date(fromMs) }
      },
      orderBy: [{ field: 'slotStart', direction: 'asc' }],
      limit: HISTORY_DAYS + 2
    })
  }

  // Slot_end of the most recent observed window — the anchor from which the forecast horizon
  // extends. Returns null when the app has no history yet.
  async function fetchLastSlotEnd (applicationId) {
    const rows = await app.platformatic.entities.timeWindowStat.find({
      fields: ['slotEnd'],
      where: { applicationId: { eq: applicationId } },
      orderBy: [{ field: 'slotEnd', direction: 'desc' }],
      limit: 1
    })
    return rows.length > 0 ? new Date(rows[0].slotEnd).getTime() : null
  }
}, {
  name: 'pattern-predictor',
  dependencies: ['env', 'window-category']
})
