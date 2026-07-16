'use strict'

const fp = require('fastify-plugin')
const { slotId, suggestionCandidateId } = require('../lib/ids')

const MINUTES_PER_DAY = 24 * 60
const MS_PER_DAY = MINUTES_PER_DAY * 60 * 1000
const HISTORY_DAYS = 365

module.exports = fp(async function (app) {
  const algorithmVersion = app.env.PLT_SCALER_ALGORITHM_VERSION
  if (algorithmVersion === 'v1') {
    app.log.info({ algorithmVersion }, '[Pattern Predictor] Skipped - algorithm version is v1')
    return
  }

  let buildModel, predict, buildWindowSuggestions
  try {
    ;({ buildModel, predict } = require('../lib/pattern-predictor/model'))
    ;({ buildWindowSuggestions } = require('../lib/pattern-predictor/suggestions'))
  } catch {
    throw new Error(
      'The pattern scaling algorithm is not available in the OSS version of ICC. ' +
      'Please set PLT_SCALER_ALGORITHM_VERSION to "v1" or upgrade to the commercial version.'
    )
  }

  const sql = app.platformatic.sql
  const db = app.platformatic.db

  const timeWindowMs = Number(app.env.PLT_SCALER_TIME_WINDOW_MINUTES) * 60 * 1000
  const timeWindowsPerDay = MS_PER_DAY / timeWindowMs

  const percentile = app.env.PLT_SCALER_PATTERN_PERCENTILE // recorded on each prediction row
  const predictionDays = Number(app.env.PLT_SCALER_PATTERN_PREDICTION_DAYS)
  const occurrencesLimit = Number(app.env.PLT_SCALER_SUGGESTION_OCCURRENCES_LIMIT)

  const dayMidnightOf = (t) => Math.floor(new Date(t).getTime() / MS_PER_DAY) * MS_PER_DAY

  app.decorate('updatePredictions', async (applicationId) => {
    const lastSlotEnd = await fetchLastSlotEnd(applicationId)
    if (lastSlotEnd == null) return 0

    const horizonEnd = lastSlotEnd + predictionDays * MS_PER_DAY
    const now = Date.now()
    const historyFromMs = dayMidnightOf(now) - HISTORY_DAYS * MS_PER_DAY

    const suggestions = []
    let written = 0
    for (let windowNumber = 1; windowNumber <= timeWindowsPerDay; windowNumber++) {
      // ONE slot's recent daily series — bounded window + explicit LIMIT, never all slots at once.
      const rows = await fetchWindowAcrossDays(applicationId, windowNumber, historyFromMs)
      if (rows.length === 0) continue

      const series = rows.map((row) => ({ date: new Date(row.slotStart), value: row.pods }))
      const model = buildModel(series)

      const slotOffset = (windowNumber - 1) * timeWindowMs
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
          slotEnd: new Date(slotStart + timeWindowMs),
          slotOfDay: windowNumber,
          percentile,
          predictedPods: predict(model, new Date(dayMs))
        })
      }
      if (predictions.length) {
        await upsertPredictions(predictions)
        written += predictions.length
      }

      // This slot's candidate suggestions. No slot-row ids are read: the calendar occurrences are
      // generated from the scope keys on demand (lib/pattern-predictor/occurrences.js).
      suggestions.push(...buildWindowSuggestions(model, {
        slot: windowNumber - 1,
        slotCount: timeWindowsPerDay,
        now,
        futureDays: predictionDays,
        applicationId,
        occurrencesLimit
      }))
    }

    // Color the freshly written forecasts on the same history-derived bands as the time windows.
    if (written > 0) await app.updateWindowCategories(applicationId)

    await replaceCandidates(applicationId, suggestions)
    return written
  })

  // Candidates are ROWS, not a cache blob. Full replace in one transaction: the DELETE also prunes
  // combinations the algorithm no longer produces, so there is no separate prune step.
  //
  // It is scoped to status='suggested', so it never touches an accepted / cancelled / expired row —
  // an accepted suggestion is a SNAPSHOT taken at accept time (see acceptSuggestion) and regeneration
  // must leave it alone.
  //
  // The candidate for an already-accepted identity keeps being refreshed here (same `identity`,
  // different row). listSuggestions hides it while the accepted row lives, so it is invisible until
  // that row is cancelled — at which point it is offered again, already up to date. It is also the
  // drift data we will build on. And if the algorithm stops producing a pattern, the DELETE removes
  // its candidate: cancelling the accepted row then correctly leaves nothing to re-offer.
  // db.tx() — NOT `db.query(BEGIN)` … `db.query(COMMIT)`. `db` is a connection POOL: those statements
  // would each take a different connection, so the DELETE would auto-commit on its own and every reader
  // would see ZERO candidates until the inserts landed. tx() pins one connection, so readers see the
  // old set until the whole swap commits.
  //
  // The row id is DERIVED from the identity (lib/ids.js), so a pattern that is still detected keeps the
  // SAME id across the delete/insert. Otherwise every night would hand a still-valid suggestion a new
  // random id, and any client holding the old one would 404 on /details or /accept.
  async function replaceCandidates (applicationId, suggestions) {
    await db.tx(async (tx) => {
      await tx.query(sql`
        DELETE FROM suggestions WHERE application_id = ${applicationId} AND status = 'suggested'`)

      for (let i = 0; i < suggestions.length; i += 200) {
        const chunk = suggestions.slice(i, i + 200)
        const values = sql.join(chunk.map((s) => sql`(
          ${suggestionCandidateId(s.identity)}, ${s.identity}, ${applicationId}, ${s.slotOfDay},
          ${s.scopeKeys}, 'suggested', ${s.value},
          ${JSON.stringify(s.details)}, ${JSON.stringify(s.distribution)})`), sql`, `)
        await tx.query(sql`
          INSERT INTO suggestions
            (id, identity, application_id, slot_of_day, scope_keys, status, value, details, distribution)
          VALUES ${values}`)
      }
    })
  }

  // Upsert one window's batch of daily predictions, keyed on (application_id, slot_start) so a
  // re-run overwrites each slot's forecast in place rather than duplicating it.
  function upsertPredictions (rows) {
    const values = sql.join(
      // id is derived from (application_id, slot_start) — see lib/ids.js. The DB has no id default.
      rows.map((r) => sql`(${slotId('pred', r.applicationId, r.slotStart)}, ${r.applicationId}, ${r.slotStart}, ${r.slotEnd}, ${r.slotOfDay}, ${r.percentile}, ${r.predictedPods})`),
      sql`, `
    )
    return app.platformatic.db.query(sql`
      INSERT INTO time_window_predictions
        (id, application_id, slot_start, slot_end, slot_of_day, percentile, predicted_pods)
      VALUES ${values}
      ON CONFLICT (application_id, slot_start) DO UPDATE SET
        slot_end = EXCLUDED.slot_end,
        slot_of_day = EXCLUDED.slot_of_day,
        percentile = EXCLUDED.percentile,
        predicted_pods = EXCLUDED.predicted_pods
    `)
  }

  // Every application with observed history — the nightly regeneration set.
  async function listApplicationsWithHistory () {
    const res = await db.query(sql`SELECT DISTINCT application_id FROM time_window_stats`)
    return (res.rows || res || []).map((r) => r.application_id)
  }

  // Nightly (UTC midnight, leader-gated) regeneration for every application.
  //
  // Each slot_of_day is an INDEPENDENT daily series, so a closing window only changes ITS slot —
  // re-modelling all of them on every window close was pure waste (288× a day at 5-min windows), and
  // it gave an inconsistent as-of: one slot's series included today, the rest didn't. Once a day,
  // every series holds exactly the same COMPLETE days.
  //
  // The frozen-prediction invariant survives: today's slots are forecast at midnight, BEFORE they
  // happen, so each historical window still keeps the last forecast made before it became current.
  // And the horizon starts at lastSlotEnd, so a late run never re-predicts (never un-freezes) a
  // window that has already become history.
  app.decorate('updateAllPredictions', async () => {
    const apps = await listApplicationsWithHistory()
    let total = 0
    for (const applicationId of apps) {
      try {
        total += await app.updatePredictions(applicationId)
      } catch (err) {
        app.log.error({ err, applicationId }, 'nightly prediction regeneration failed')
      }
    }
    app.log.info({ applications: apps.length, written: total }, 'nightly prediction regeneration complete')
    return total
  })

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
