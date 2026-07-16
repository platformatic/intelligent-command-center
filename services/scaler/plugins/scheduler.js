'use strict'

const fp = require('fastify-plugin')
const { setTimeout: sleep } = require('node:timers/promises')
const { assertValidTickMinutes, nextBoundaryDelayMs } = require('../lib/scheduler/tick')
const { validateScheduleInput } = require('../lib/scheduler/validate')
const { computeSoftLimits } = require('../lib/scheduler/reconcile')
const defaultResolver = require('../lib/scheduler/default-resolver')
const errors = require('../lib/errors')

module.exports = fp(async function (app) {
  const enabled = app.env.PLT_SCALER_SCHEDULER_ENABLED
  const tickMinutes = Number(app.env.PLT_SCALER_SCHEDULER_TICK_MINUTES)
  assertValidTickMinutes(tickMinutes)

  const intervalMs = tickMinutes * 60 * 1000
  const softLimitTtlSeconds = tickMinutes * 60 * 2 // ~2× tick
  const entity = () => app.platformatic.entities.scalerSchedule

  let resolver = defaultResolver

  // ---- CRUD ----
  app.decorate('createSchedule', async (applicationId, input) => {
    validateScheduleInput(input)
    return entity().save({
      input: {
        applicationId,
        name: input.name ?? null,
        dtstart: new Date(input.dtstart),
        dtend: new Date(input.dtend),
        rrule: input.rrule ?? null,
        timezone: input.timezone ?? 'UTC',
        minPods: input.minPods ?? null,
        maxPods: input.maxPods ?? null,
        priority: input.priority ?? 0,
        enabled: input.enabled ?? true
      }
    })
  })

  app.decorate('getSchedule', async (id) => {
    const rows = await entity().find({ where: { id: { eq: id } }, limit: 1 })
    return rows.length ? rows[0] : null
  })

  app.decorate('listSchedules', async (applicationId) => {
    return entity().find({ where: { applicationId: { eq: applicationId } } })
  })

  app.decorate('updateSchedule', async (id, patch) => {
    const existing = await app.getSchedule(id)
    if (!existing) throw new errors.SCHEDULE_NOT_FOUND(id)
    const merged = { ...existing, ...patch }
    validateScheduleInput(merged)
    return entity().save({
      input: {
        id,
        name: merged.name ?? null,
        dtstart: new Date(merged.dtstart),
        dtend: new Date(merged.dtend),
        rrule: merged.rrule ?? null,
        timezone: merged.timezone ?? 'UTC',
        minPods: merged.minPods ?? null,
        maxPods: merged.maxPods ?? null,
        priority: merged.priority ?? 0,
        enabled: merged.enabled ?? true,
        updatedAt: new Date()
      }
    })
  })

  app.decorate('deleteSchedule', async (id) => {
    await entity().delete({ where: { id: { eq: id } } })
  })

  app.decorate('setScheduleLimitResolver', (fn) => {
    resolver = fn
  })

  // ---- Reconcile (store wiring around the pure computeSoftLimits) ----
  // Merges two floor sources: manual schedules and accepted suggestions. MANUAL WINS — a suggestion
  // only supplies minPods where no manual schedule sets one. Suggestions resolve LIVE (the suggestions
  // plugin owns the set-inclusion resolver); the materialized horizon is UI-only.
  app.decorate('reconcileScheduleApplication', async (applicationId, now, schedules) => {
    const all = schedules ?? await app.listSchedules(applicationId)
    const soft = await computeSoftLimits({ applicationId, schedules: all, now, resolver })

    let min = soft?.min ?? null
    const max = soft?.max ?? null
    if (min == null && app.resolveSuggestionNow) {
      const sug = await app.resolveSuggestionNow(applicationId, now)
      if (sug) min = sug.value
    }

    if (min == null && max == null) {
      await app.store.clearSoftLimits(applicationId)
    } else {
      await app.store.saveSoftLimits(applicationId, { min, max, scheduleIds: soft?.scheduleIds ?? [] }, softLimitTtlSeconds)
    }

    // Writing the floor is not enough — the algorithms only apply limits as a CLAMP on a decision they
    // are already making, and v2 only decides when pods stream signals. An idle application would sit
    // below a scheduled floor forever. So actuate it, exactly as saveScaleConfig does for hard limits.
    // Idempotent: it only touches the controller when the replica count is outside the window.
    await app.enforceScalingLimits(applicationId)
  })

  app.decorate('reconcileSchedules', async (now) => {
    const rows = await entity().find({ where: { enabled: { eq: true } } })
    const byApp = new Map()
    for (const r of rows) {
      if (!byApp.has(r.applicationId)) byApp.set(r.applicationId, [])
      byApp.get(r.applicationId).push(r)
    }
    // Suggestion-only apps have no manual schedule row — include them so their floor is enforced.
    if (app.listSuggestionApps) {
      for (const appId of await app.listSuggestionApps()) if (!byApp.has(appId)) byApp.set(appId, [])
    }
    // Each application is independent (separate Valkey keys) → reconcile in parallel.
    await Promise.all([...byApp].map(async ([applicationId, schedules]) => {
      try {
        await app.reconcileScheduleApplication(applicationId, now, schedules)
      } catch (err) {
        app.log.error({ err, applicationId }, 'scheduler: reconcile failed for application')
      }
    }))
  })

  // Once-per-UTC-day maintenance: flip expired suggestions, then roll the materialized horizon forward
  // (it's anchored at build time, so it needs a daily rebuild as new days enter / old ones age out).
  const MS_PER_DAY = 24 * 60 * 60 * 1000
  let lastMaintenanceDay = null
  app.decorate('maintainSuggestions', async (now) => {
    const today = Math.floor(now / MS_PER_DAY)
    if (today === lastMaintenanceDay) return
    lastMaintenanceDay = today

    // 1. The nightly run: re-model every slot and replace the candidate suggestions. Not done on
    //    window close — a closing window only changes its own slot's series (see time-slot-stats.js).
    if (app.updateAllPredictions) {
      try {
        await app.updateAllPredictions()
      } catch (err) {
        app.log.error({ err }, 'scheduler: nightly regeneration failed')
      }
    }
    // 2. Retire accepted suggestions that have passed their `until`.
    if (app.expireDueSuggestions) await app.expireDueSuggestions(now)
    // 3. Roll the materialized horizon forward (it is anchored at build time).
    if (app.listSuggestionApps) {
      for (const appId of await app.listSuggestionApps()) {
        try {
          await app.rebuildScheduledSlots(appId, now)
        } catch (err) {
          app.log.error({ err, applicationId: appId }, 'scheduler: horizon rebuild failed')
        }
      }
    }
  })

  // ---- Tick (leader-gated; started by the leader plugin) ----
  let controller = null
  let closed = false

  async function loop () {
    const { signal } = controller
    while (!signal.aborted) {
      try {
        await sleep(nextBoundaryDelayMs(Date.now(), intervalMs), null, { signal })
      } catch {
        return // aborted while waiting for the next boundary
      }
      try {
        await app.maintainSuggestions(Date.now())
      } catch (err) {
        app.log.error({ err }, 'scheduler: suggestion maintenance failed')
      }
      try {
        await app.reconcileSchedules(Date.now())
      } catch (err) {
        app.log.error({ err }, 'scheduler: reconcile tick failed')
      }
    }
  }

  app.decorate('startScheduler', () => {
    if (!enabled || closed) return
    if (controller && !controller.signal.aborted) return
    controller = new AbortController()
    app.log.info({ tickMinutes }, 'Starting scheduler tick')
    loop()
  })

  app.decorate('stopScheduler', () => {
    if (controller) {
      controller.abort()
      controller = null
    }
  })

  app.addHook('onClose', async () => {
    closed = true
    app.stopScheduler()
  })
}, {
  name: 'scheduler',
  dependencies: ['env', 'store', 'scale-config']
})
