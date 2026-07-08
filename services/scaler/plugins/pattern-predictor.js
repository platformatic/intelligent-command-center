'use strict'

const fp = require('fastify-plugin')
const { randomUUID } = require('node:crypto')
const { buildModel, predict } = require('../lib/pattern-predictor/model')
const { generateSuggestions, groupSuggestions, toSchedule, patternWindows } = require('../lib/pattern-predictor/suggestions')

const MINUTES_PER_DAY = 24 * 60
const MS_PER_DAY = MINUTES_PER_DAY * 60 * 1000

module.exports = fp(async function (app) {
  const sql = app.platformatic.sql
  const windowMs = Number(app.env.PLT_SCALER_TIME_WINDOW_MINUTES) * 60 * 1000
  const windowsPerDay = MS_PER_DAY / windowMs
  const percentile = app.env.PLT_SCALER_PATTERN_PERCENTILE // recorded on each prediction row
  const predictionDays = Number(app.env.PLT_SCALER_PATTERN_PREDICTION_DAYS)

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

    // Reshape the same rows into a per-DAY grid as we go (day midnight → slot values), so the
    // suggestion layer below reuses the fetch instead of re-scanning time_window_stats.
    const byDay = new Map()

    let written = 0
    for (let windowNumber = 1; windowNumber <= windowsPerDay; windowNumber++) {
      const rows = await fetchWindowAcrossDays(applicationId, windowNumber)
      if (rows.length === 0) continue

      for (const row of rows) {
        const dayMs = Math.floor(new Date(row.slotStart).getTime() / MS_PER_DAY) * MS_PER_DAY
        let slots = byDay.get(dayMs)
        if (!slots) { slots = new Array(windowsPerDay).fill(null); byDay.set(dayMs, slots) }
        slots[windowNumber - 1] = row.pods
      }

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
      if (predictions.length === 0) continue

      await upsertPredictions(predictions)
      written += predictions.length
    }

    // Color the freshly written forecasts on the same history-derived bands as the time windows,
    // so a predicted N pods gets the same category a historical N-pod window would.
    if (written > 0) await app.updateWindowCategories(applicationId)

    await storeSuggestions(applicationId, byDay)
    return written
  })

  // Derive the reviewable floor suggestions from the same history and cache them in Valkey for the
  // dashboard. A side-effect of updatePredictions — never fails it (predictions are already
  // written); store guard keeps the predictor testable without the store subsystem.
  async function storeSuggestions (applicationId, byDay) {
    if (!app.store) return
    try {
      const history = [...byDay.keys()].sort((a, b) => a - b)
        .map((dayMs) => ({ date: new Date(dayMs), slots: byDay.get(dayMs) }))
      const suggestions = generateSuggestions(history)
      // anchor = the first history day, matching the predictor's series-relative phase origin.
      const anchor = history.length ? history[0].date.getTime() : Date.now()
      const now = Date.now()
      // The stored/served unit is the GROUP, slimmed to what the dashboard needs: a human "when", its
      // confidence, the floor to set, the predictor's time-of-day `slots` (the full list of 0-based
      // slot indices the window covers — groups are contiguous, so [start..end] inclusive), and the
      // machine-parseable schedule (rrule + dtstart/dtend, the exact scaler_schedules fields).
      // Each group gets a uuid; alongside the slim metadata we enumerate its observed + 60-day
      // forecast windows and cache them under that id. Both the metadata blob and the windows blob
      // are overwritten wholesale each run (SET), so the fresh ids replace the prior run's — no leak.
      const windowsById = {}
      const groups = groupSuggestions(suggestions).map((g) => {
        const id = randomUUID()
        const schedule = toSchedule(g, anchor, now)
        const slots = []
        for (let i = g.slots[0]; i <= g.slots[1]; i++) slots.push(i)
        windowsById[id] = patternWindows(g, { observed: byDay, anchor, now, futureDays: predictionDays, windowMs })
        return {
          id,
          when: g.when,
          confidence: g.confidence,
          pods: g.value,
          slots,
          since: g.since, // when the pattern's current regime started (null for the baseline)
          rrule: schedule ? schedule.rrule : null,
          dtstart: schedule ? schedule.dtstart : null,
          dtend: schedule ? schedule.dtend : null
        }
      })
      await app.store.saveSuggestions(applicationId, { groups })
      await app.store.saveSuggestionWindows(applicationId, windowsById)
      app.log.debug({ applicationId, groups: groups.length }, 'stored floor suggestions')
    } catch (err) {
      app.log.error({ err, applicationId }, 'Failed to compute or store floor suggestions')
    }
  }

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

  // All time-window rows for one window number (UTC slot_of_day), across every day.
  function fetchWindowAcrossDays (applicationId, windowNumber) {
    return app.platformatic.entities.timeWindowStat.find({
      fields: ['slotStart', 'pods'],
      where: {
        applicationId: { eq: applicationId },
        slotOfDay: { eq: windowNumber }
      },
      orderBy: [{ field: 'slotStart', direction: 'asc' }]
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
