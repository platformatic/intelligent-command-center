'use strict'

const fp = require('fastify-plugin')
const { slotId } = require('../lib/ids')
const errors = require('../lib/errors')

const MS_PER_DAY = 24 * 60 * 60 * 1000

// Owns the `suggestions` table — CANDIDATES and ACCEPTED alike, told apart by `status` — and the
// resolved horizon (`scheduled_slots`).
//
// A suggestion is a per-app recurring floor for one slot_of_day, named by its `identity`
// (uuidv5 of app + slot + scope keys). ACCEPT COPIES the candidate into a new 'active' row and leaves
// the candidate in place; CANCEL flips that active row to 'cancelled'. The candidate therefore
// survives the whole cycle — cancelling re-offers it at once, instead of leaving the user with
// nothing until the next nightly run.
//
// Enforcement resolves LIVE at the scheduler tick (`resolveSuggestionNow`); `scheduled_slots` is a
// derived cache for the UI, and the scaler never reads it.
module.exports = fp(async function (app) {
  const algorithmVersion = app.env.PLT_SCALER_ALGORITHM_VERSION
  if (algorithmVersion === 'v1') {
    app.log.info({ algorithmVersion }, '[Suggestions] Skipped - algorithm version is v1')
    return
  }

  // suggestion-resolver and occurrences both reach into the pattern-predictor's scope matching, so
  // they are only requirable in the commercial build.
  let prepare, resolveDay, occurrencesFor
  try {
    ;({ prepare, resolveDay } = require('../lib/pattern-predictor/suggestion-resolver'))
    ;({ occurrencesFor } = require('../lib/pattern-predictor/occurrences'))
  } catch {
    throw new Error(
      'The pattern scaling algorithm is not available in the OSS version of ICC. ' +
      'Please set PLT_SCALER_ALGORITHM_VERSION to "v1" or upgrade to the commercial version.'
    )
  }

  const sql = app.platformatic.sql
  const db = app.platformatic.db
  const windowMs = Number(app.env.PLT_SCALER_TIME_WINDOW_MINUTES) * 60 * 1000
  const horizonDays = Number(app.env.PLT_SCALER_PATTERN_PREDICTION_DAYS)
  const occurrencesLimit = Number(app.env.PLT_SCALER_SUGGESTION_OCCURRENCES_LIMIT)
  const sugEntity = () => app.platformatic.entities.suggestion

  const dayMidnight = (t) => Math.floor(t / MS_PER_DAY) * MS_PER_DAY

  // Everything EXCEPT `distribution` — that is the bulky per-day explainer and only goes out on
  // /details. Shipping it in the list would mean ~3 MB per dashboard load.
  const SUMMARY = ['id', 'identity', 'applicationId', 'slotOfDay', 'scopeKeys', 'status', 'value',
    'details', 'until', 'acceptedAt', 'endedAt']

  // The open suggestions for an app — candidates and accepted together, distinguished by `status`.
  //
  // One row per (time window × effect combination): 24 windows a day by default, a handful of
  // combinations each — comfortably inside the sql-mapper's hard limit of 1000, which is what we ask
  // for. Only 5-minute *windows* (not the 5-minute ingest slots) could approach it.
  //
  // An ACCEPTED row SHADOWS its own freshly-regenerated candidate: the nightly run stores a new
  // 'suggested' row for the same identity (that is the drift data), but we do not surface it yet.
  // This rule lives here rather than in SQL — it is domain logic, not a query concern.
  app.decorate('listSuggestions', async (applicationId) => {
    const rows = await sugEntity().find({
      fields: SUMMARY,
      where: { applicationId: { eq: applicationId }, status: { in: ['suggested', 'active'] } },
      orderBy: [{ field: 'slotOfDay', direction: 'asc' }],
      limit: 1000
    })
    const accepted = new Set(rows.filter((r) => r.status === 'active').map((r) => r.identity))
    return rows.filter((r) => r.status === 'active' || !accepted.has(r.identity))
  })

  // Accept COPIES the candidate into a new 'active' row and LEAVES THE CANDIDATE IN PLACE.
  //
  // It does not flip the candidate's status, because that would consume it: cancelling later would
  // leave a 'cancelled' row and nothing to offer, and the pattern could not be re-suggested until the
  // next nightly run. Keeping the candidate means cancel simply un-shadows it (listSuggestions hides a
  // candidate only while an active row shares its identity), so it is offered again immediately.
  //
  // It also gets the converse right for free: if the last regeneration STOPPED producing this pattern,
  // the DELETE+INSERT removed the candidate, so cancelling correctly leaves nothing behind.
  //
  // The accepted row is therefore an explicit SNAPSHOT — value/details/distribution are frozen by the
  // copy, not by a status that regeneration happens to skip.
  app.decorate('acceptSuggestion', async (id, { until = null } = {}) => {
    const rows = await sugEntity().find({ where: { id: { eq: id } }, limit: 1 })
    const candidate = rows[0]
    if (!candidate || candidate.status !== 'suggested') throw new errors.SUGGESTION_NOT_FOUND(id)

    // The candidate survives accept, so it stays acceptable — reject a second accept explicitly rather
    // than letting it hit the `suggestions_one_active` index as a raw 500.
    const live = await sugEntity().find({
      where: { identity: { eq: candidate.identity }, status: { eq: 'active' } }, limit: 1
    })
    if (live.length > 0) throw new errors.SUGGESTION_ALREADY_ACCEPTED(candidate.identity)

    const saved = await sugEntity().save({
      input: {
        identity: candidate.identity,
        applicationId: candidate.applicationId,
        slotOfDay: candidate.slotOfDay,
        scopeKeys: candidate.scopeKeys,
        value: candidate.value,
        // The entity reads JSONB back as objects; save() does not re-serialize them.
        details: JSON.stringify(candidate.details),
        distribution: JSON.stringify(candidate.distribution ?? []),
        status: 'active',
        acceptedAt: new Date(),
        until: until ? new Date(until) : null,
        updatedAt: new Date()
      }
    })
    await app.rebuildScheduledSlots(candidate.applicationId)
    return saved
  })

  // Cancel = a status flip on the ACCEPTED row; it stays as history. The days it covered fall back to
  // the next-most-specific accepted suggestion (or to no floor) — the rebuild works that out simply by
  // re-resolving over whatever is left. Its candidate, still sitting there, becomes visible again.
  app.decorate('cancelSuggestion', async (id) => {
    const rows = await sugEntity().find({ where: { id: { eq: id } }, limit: 1 })
    const existing = rows[0]
    if (!existing || existing.status !== 'active') throw new errors.SUGGESTION_NOT_FOUND(id)
    await sugEntity().save({ input: { id, status: 'cancelled', endedAt: new Date(), updatedAt: new Date() } })
    await app.rebuildScheduledSlots(existing.applicationId)
    return { id, status: 'cancelled' }
  })

  // The drill-in: the slot ids to highlight on the calendar + the stored per-day redistribution.
  //
  // The occurrences are GENERATED from the scope keys — no slot-table access at all — which is what
  // keeps them current for an ACCEPTED suggestion. A stored id list would have frozen at accept time:
  // its future ids would all be in the past by now, and every occurrence since accepting would be missing.
  app.decorate('getSuggestionDetails', async (id) => {
    const rows = await sugEntity().find({ where: { id: { eq: id } }, limit: 1 })
    const s = rows[0]
    if (!s) throw new errors.SUGGESTION_NOT_FOUND(id)
    return {
      occurrences: occurrencesFor(
        { slotOfDay: s.slotOfDay, scopeKeys: s.scopeKeys },
        { applicationId: s.applicationId, windowMs, now: Date.now(), pastLimit: occurrencesLimit, horizonDays }),
      distribution: s.distribution ?? []
    }
  })

  // The live floor for THIS instant — the scheduler tick merges it with manual schedules (manual wins).
  // Only this slot's active, unexpired suggestions matter. Returns { value, suggestionId } or null.
  app.decorate('resolveSuggestionNow', async (applicationId, now) => {
    const todayMid = dayMidnight(now)
    const slotOfDay = Math.floor((now - todayMid) / windowMs) + 1
    const rows = await sugEntity().find({
      where: { applicationId: { eq: applicationId }, slotOfDay: { eq: slotOfDay }, status: { eq: 'active' } }
    })
    const usable = prepare(rows.map((r) => ({ id: r.id, scopeKeys: r.scopeKeys, value: r.value, until: r.until })))
      .filter((p) => p.until == null || p.until > now)
    if (usable.length === 0) return null
    return resolveDay(usable, todayMid)
  })

  // App ids with at least one active suggestion — so the tick covers suggestion-only apps too.
  app.decorate('listSuggestionApps', async () => {
    const res = await db.query(sql`
      SELECT DISTINCT application_id FROM suggestions WHERE status = 'active'`)
    return (res.rows || res || []).map((r) => r.application_id)
  })

  // Flip active → expired once past `until`. Leader-gated; returns the affected app ids.
  app.decorate('expireDueSuggestions', async (now = Date.now()) => {
    const res = await db.query(sql`
      UPDATE suggestions SET status = 'expired', ended_at = ${new Date(now)}, updated_at = now()
      WHERE status = 'active' AND until IS NOT NULL AND until <= ${new Date(now)}
      RETURNING application_id`)
    return [...new Set((res.rows || res || []).map((r) => r.application_id))]
  })

  // Rebuild the resolved horizon for one app: resolve each slot over the next `horizonDays` and write
  // the winner per firing slot. Sparse — only slots something actually fires on get a row.
  //
  // It starts TODAY, not tomorrow. Enforcement resolves live at the tick (resolveSuggestionNow), which
  // has no notion of a start day — accept a suggestion at 09:00 and today's remaining slots are already
  // covered. Starting the horizon tomorrow would have the UI claim a floor takes effect tomorrow while
  // the scaler was already applying it today.
  //
  // Today's already-elapsed slots get a row like any other. Nothing reads them: the scaler resolves
  // live, and the calendar only paints a slot as scheduled when it is still in the future.
  app.decorate('rebuildScheduledSlots', async (applicationId, now = Date.now()) => {
    const rows = await sugEntity().find({
      fields: ['id', 'slotOfDay', 'scopeKeys', 'value', 'until'],
      where: { applicationId: { eq: applicationId }, status: { eq: 'active' } },
      limit: 1000
    })

    const bySlot = new Map()
    for (const r of rows) {
      if (!bySlot.has(r.slotOfDay)) bySlot.set(r.slotOfDay, [])
      bySlot.get(r.slotOfDay).push({ id: r.id, scopeKeys: r.scopeKeys, value: r.value, until: r.until })
    }

    const todayMid = dayMidnight(now)
    const out = []
    for (const [slotOfDay, list] of bySlot) {
      const prepared = prepare(list)
      const slotOffset = (slotOfDay - 1) * windowMs
      for (let d = 0; d < horizonDays; d++) {
        const dayMs = todayMid + d * MS_PER_DAY
        const slotStart = dayMs + slotOffset
        const usable = prepared.filter((p) => p.until == null || p.until > slotStart)
        const res = resolveDay(usable, dayMs)
        if (!res) continue
        out.push({ slotOfDay, slotStart, slotEnd: slotStart + windowMs, value: res.value, suggestionId: res.suggestionId })
      }
    }

    await db.query(sql`DELETE FROM scheduled_slots WHERE application_id = ${applicationId}`)
    for (let i = 0; i < out.length; i += 500) {
      const chunk = out.slice(i, i + 500)
      const values = sql.join(
        // id is derived from (application_id, slot_start) — see lib/ids.js. The DB has no id default,
        // so a rebuild reproduces the SAME id for a slot instead of churning it.
        chunk.map((r) => sql`(${slotId('sched', applicationId, r.slotStart)}, ${applicationId}, ${new Date(r.slotStart)}, ${new Date(r.slotEnd)}, ${r.slotOfDay}, ${r.value}, ${r.suggestionId})`),
        sql`, `)
      await db.query(sql`
        INSERT INTO scheduled_slots (id, application_id, slot_start, slot_end, slot_of_day, value, suggestion_id)
        VALUES ${values}`)
    }
    return out.length
  })

  // The resolved horizon for the UI. Raw SQL so it isn't capped by the sql-mapper 1000 limit; bounded
  // by the [from, to] window the caller passes (the sparse horizon, never the whole table).
  app.decorate('getScheduledSlots', async (applicationId, fromMs, toMs) => {
    const res = await db.query(sql`
      SELECT slot_start, slot_end, slot_of_day, value, suggestion_id
      FROM scheduled_slots
      WHERE application_id = ${applicationId}
        AND slot_start >= ${new Date(fromMs)} AND slot_start <= ${new Date(toMs)}
      ORDER BY slot_start ASC`)
    return (res.rows || res || []).map((r) => ({
      slotStart: r.slot_start,
      slotEnd: r.slot_end,
      slotOfDay: r.slot_of_day,
      value: r.value,
      suggestionId: r.suggestion_id
    }))
  })
}, {
  name: 'suggestions',
  dependencies: ['env', 'store']
})
