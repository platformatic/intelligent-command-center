'use strict'

const fp = require('fastify-plugin')
const errors = require('../lib/errors')

const MS_PER_DAY = 24 * 60 * 60 * 1000

// Owns accepted suggestions (the `suggestions` table) and the resolved horizon (`scheduled_slots`).
// A suggestion = a per-app recurring floor for one slot_of_day, identified by its effect scope-keys.
// Accept/cancel mutate the table and rebuild the resolved horizon; the scheduler tick reads the
// live "now" floor via `resolveSuggestionNow`. Enforcement resolves live — the table is UI-only.
module.exports = fp(async function (app) {
  const algorithmVersion = app.env.PLT_SCALER_ALGORITHM_VERSION
  if (algorithmVersion === 'v1') {
    app.log.info({ algorithmVersion }, '[Suggestions] Skipped - algorithm version is v1')
    return
  }

  // suggestion-resolver reaches into the pattern-predictor's scope matching, so it is only
  // requirable in the commercial build.
  let prepare, resolveDay
  try {
    ;({ prepare, resolveDay } = require('../lib/scheduler/suggestion-resolver'))
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
  const sugEntity = () => app.platformatic.entities.suggestion

  const sortKeys = (keys) => [...keys].sort()
  const sameKeys = (a, b) => a.length === b.length && a.join('\u0000') === b.join('\u0000')
  const dayMidnight = (t) => Math.floor(t / MS_PER_DAY) * MS_PER_DAY

  async function findActiveByIdentity (applicationId, slotOfDay, sortedKeys) {
    const rows = await sugEntity().find({
      where: { applicationId: { eq: applicationId }, slotOfDay: { eq: slotOfDay }, status: { eq: 'active' } }
    })
    return rows.find((r) => sameKeys(r.scopeKeys, sortedKeys)) ?? null
  }

  // Accept the CURRENT candidate for (slotOfDay, scopeKeys) from the cached suggestions. Freezes its
  // value + a display snapshot, upserts the one active row for that identity, and rebuilds the horizon.
  app.decorate('acceptSuggestion', async (applicationId, { slotOfDay, scopeKeys, until = null }) => {
    const sorted = sortKeys(scopeKeys)
    const cached = await app.store.getSuggestions(applicationId)
    const cand = cached?.suggestions?.find(
      (s) => s.slotOfDay === slotOfDay && sameKeys(sortKeys(s.scopeKeys), sorted))
    if (!cand) throw new errors.SUGGESTION_CANDIDATE_NOT_FOUND(slotOfDay)

    const existing = await findActiveByIdentity(applicationId, slotOfDay, sorted)
    const input = {
      applicationId,
      slotOfDay,
      scopeKeys: sorted,
      value: cand.value,
      until: until ? new Date(until) : null,
      details: cand.details, // same shape on candidate and accepted → stored verbatim
      status: 'active',
      updatedAt: new Date()
    }
    if (existing) input.id = existing.id
    const saved = await sugEntity().save({ input })
    await app.rebuildScheduledSlots(applicationId)
    return saved
  })

  // Cancel an accepted suggestion (keep the row as history) and rebuild the horizon.
  app.decorate('cancelSuggestion', async (id) => {
    const rows = await sugEntity().find({ where: { id: { eq: id } }, limit: 1 })
    const existing = rows[0]
    if (!existing || existing.status !== 'active') throw new errors.SUGGESTION_NOT_FOUND(id)
    await sugEntity().save({ input: { id, status: 'cancelled', endedAt: new Date(), updatedAt: new Date() } })
    await app.rebuildScheduledSlots(existing.applicationId)
    return { id, status: 'cancelled' }
  })

  app.decorate('listSuggestions', async (applicationId, { status } = {}) => {
    const where = { applicationId: { eq: applicationId } }
    if (status) where.status = { eq: status }
    return sugEntity().find({ where, orderBy: [{ field: 'slotOfDay', direction: 'asc' }] })
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

  // Flip active → expired once past `until`. Leader-gated; returns the affected app ids to rebuild.
  app.decorate('expireDueSuggestions', async (now = Date.now()) => {
    const res = await db.query(sql`
      UPDATE suggestions SET status = 'expired', ended_at = ${new Date(now)}, updated_at = now()
      WHERE status = 'active' AND until IS NOT NULL AND until <= ${new Date(now)}
      RETURNING application_id`)
    return [...new Set((res.rows || res || []).map((r) => r.application_id))]
  })

  // Rebuild the resolved horizon for one app: resolve each slot over the next `horizonDays`, write the
  // winner per firing slot. Sparse — only slots something fires on get a row. Delete-then-insert.
  app.decorate('rebuildScheduledSlots', async (applicationId, now = Date.now()) => {
    const rows = await app.listSuggestions(applicationId, { status: 'active' })
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
      for (let d = 1; d <= horizonDays; d++) {
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
        chunk.map((r) => sql`(${applicationId}, ${new Date(r.slotStart)}, ${new Date(r.slotEnd)}, ${r.slotOfDay}, ${r.value}, ${r.suggestionId})`),
        sql`, `)
      await db.query(sql`
        INSERT INTO scheduled_slots (application_id, slot_start, slot_end, slot_of_day, value, suggestion_id)
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
