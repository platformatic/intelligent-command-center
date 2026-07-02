'use strict'

const fp = require('fastify-plugin')
const { buildModel, predict } = require('../lib/pattern-predictor/model')

const MINUTES_PER_DAY = 24 * 60
const MS_PER_DAY = MINUTES_PER_DAY * 60 * 1000

module.exports = fp(async function (app) {
  const sql = app.platformatic.sql
  const windowMs = Number(app.env.PLT_SCALER_TIME_WINDOW_MINUTES) * 60 * 1000
  const windowsPerDay = MS_PER_DAY / windowMs
  const percentile = app.env.PLT_SCALER_PATTERN_PERCENTILE // recorded on each prediction row
  const predictionDays = Number(app.env.PLT_SCALER_PATTERN_PREDICTION_DAYS)

  // Forecast and persist, per time window, the next PLT_SCALER_PATTERN_PREDICTION_DAYS days
  // (tomorrow through +N) for one application. Each window number (slot_of_day) is an independent
  // daily series — the configured percentile per day from time_window_stats — fed through the
  // pattern-predictor: history → impute → discover patterns → forecast. The per-window model is
  // built once and projected across the horizon (buildModel dominates; predict is cheap), then the
  // window's batch is upserted into time_window_predictions on (application_id, slot_start) — so a
  // re-run refreshes each slot in place. Returns the number of prediction rows written.
  app.decorate('updatePredictions', async (applicationId) => {
    const now = Date.now()
    // UTC midnight of each target day; the algorithm keys on the calendar day, and a slot's
    // slot_start is that midnight + its offset into the day (matching time_window_stats).
    const dayStarts = []
    for (let dayAhead = 1; dayAhead <= predictionDays; dayAhead++) {
      dayStarts.push(Math.floor((now + dayAhead * MS_PER_DAY) / MS_PER_DAY) * MS_PER_DAY)
    }

    let written = 0
    for (let windowNumber = 1; windowNumber <= windowsPerDay; windowNumber++) {
      const rows = await fetchWindowAcrossDays(applicationId, windowNumber)
      if (rows.length === 0) continue

      const series = rows.map((row) => ({ date: new Date(row.slotStart), value: row.pods }))
      const model = buildModel(series)

      const slotOffset = (windowNumber - 1) * windowMs
      const predictions = dayStarts.map((dayStart) => {
        const slotStart = dayStart + slotOffset
        return {
          applicationId,
          slotStart: new Date(slotStart),
          slotEnd: new Date(slotStart + windowMs),
          slotOfDay: windowNumber,
          percentile,
          predictedPods: predict(model, new Date(dayStart))
        }
      })

      await upsertPredictions(predictions)
      written += predictions.length
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
}, {
  name: 'pattern-predictor',
  dependencies: ['env']
})
