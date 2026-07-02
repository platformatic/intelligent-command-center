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
  app.decorate('reconcileScheduleApplication', async (applicationId, now, schedules) => {
    const all = schedules ?? await app.listSchedules(applicationId)
    const soft = await computeSoftLimits({ applicationId, schedules: all, now, resolver })
    if (soft) {
      await app.store.saveSoftLimits(applicationId, soft, softLimitTtlSeconds)
    } else {
      await app.store.clearSoftLimits(applicationId)
    }
  })

  app.decorate('reconcileSchedules', async (now) => {
    const rows = await entity().find({ where: { enabled: { eq: true } } })
    const byApp = new Map()
    for (const r of rows) {
      if (!byApp.has(r.applicationId)) byApp.set(r.applicationId, [])
      byApp.get(r.applicationId).push(r)
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
  dependencies: ['env', 'store']
})
