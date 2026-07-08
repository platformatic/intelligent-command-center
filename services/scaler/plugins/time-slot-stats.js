'use strict'

const fp = require('fastify-plugin')
const { timeWeightedPercentiles } = require('../lib/time-slot-stats/stats')
const { averageStats } = require('../lib/time-slot-stats/aggregate')
const {
  assertValidSlotMinutes,
  assertValidWindowMinutes,
  validateTimeSlotTimezone,
  slotStartFor,
  slotOfDay,
  localSlotOfDay,
  classifyTransition
} = require('../lib/time-slot-stats/time-slot')

module.exports = fp(async function (app) {
  const slotMinutes = Number(app.env.PLT_SCALER_TIME_SLOT_MINUTES)
  assertValidSlotMinutes(slotMinutes)

  const timezone = app.env.PLT_SCALER_TIME_SLOT_TIMEZONE
  validateTimeSlotTimezone(timezone)

  const slotMs = slotMinutes * 60 * 1000
  const ttlSeconds = slotMinutes * 60 * 3 // ~3 slots

  const windowMinutes = Number(app.env.PLT_SCALER_TIME_WINDOW_MINUTES)
  assertValidWindowMinutes(windowMinutes, slotMinutes)
  const windowMs = windowMinutes * 60 * 1000

  // time_window_stats keeps only the single pod count used for scaling calculations — the
  // configured percentile (min → minPods, p90 → p90Pods, …). time_slot_stats still keeps all.
  const podColumn = app.env.PLT_SCALER_PATTERN_PERCENTILE + 'Pods'

  async function persistTimeSlotStats (applicationId, bucket) {
    const slotStart = bucket.slotStart
    const slotEnd = slotStart + slotMs
    const stats = timeWeightedPercentiles(bucket.targets, slotStart, slotEnd)
    if (!stats) return

    try {
      await app.platformatic.entities.timeSlotStat.save({
        input: {
          applicationId,
          slotStart: new Date(slotStart),
          slotEnd: new Date(slotEnd),
          slotOfDay: slotOfDay(slotStart, slotMs),
          localSlotOfDay: localSlotOfDay(slotStart, slotMs, timezone),
          minPods: stats.min,
          maxPods: stats.max,
          p50Pods: stats.p50,
          p75Pods: stats.p75,
          p90Pods: stats.p90,
          p95Pods: stats.p95,
          p99Pods: stats.p99
        }
      })
    } catch (err) {
      // A duplicate (application_id, slot_start) from a crash/failover that reprocessed
      // an already-persisted slot lands here too — logged and swallowed so the caller
      // still rolls the bucket forward.
      app.log.error({ err, applicationId, slotStart }, '[time-slot-stats] failed to persist time slot stats')
    }
  }

  async function persistTimeWindowStats (applicationId, windowStart) {
    const windowEnd = windowStart + windowMs
    const baseRows = await app.platformatic.entities.timeSlotStat.find({
      where: {
        applicationId: { eq: applicationId },
        slotStart: { gte: new Date(windowStart), lt: new Date(windowEnd) }
      }
    })
    const stats = averageStats(baseRows)
    if (!stats) return

    try {
      await app.platformatic.entities.timeWindowStat.save({
        input: {
          applicationId,
          slotStart: new Date(windowStart),
          slotEnd: new Date(windowEnd),
          slotOfDay: slotOfDay(windowStart, windowMs),
          localSlotOfDay: localSlotOfDay(windowStart, windowMs, timezone),
          pods: stats[podColumn]
        }
      })
    } catch (err) {
      app.log.error({ err, applicationId, windowStart }, '[time-slot-stats] failed to persist time window stats')
    }

    try {
      await app.updateWindowCategories(applicationId)
    } catch (err) {
      app.log.error({ err, applicationId }, '[time-slot-stats] failed to categorize windows')
    }

    // The window we just persisted is now the newest observed row, so regenerating here refreshes
    // the future forecast grid AND freezes this window's own prediction in place: the next run will
    // start its horizon after this window, never touching its slot_start again. Running on every
    // window close is what gives each historical window a 1:1 prediction (the last one made before
    // it became current). Guarded + swallowed: the predictor is optional and must never break
    // ingestion. `POST /predictions` remains as the manual trigger.
    try {
      if (app.updatePredictions) await app.updatePredictions(applicationId)
    } catch (err) {
      app.log.error({ err, applicationId }, '[time-slot-stats] failed to regenerate predictions')
    }
  }

  async function ingestTarget (applicationId, value, now) {
    const slotStart = slotStartFor(now, slotMs)
    const bucket = await app.store.readBucket(applicationId)
    const transition = classifyTransition(bucket ? bucket.slotStart : null, slotStart, slotMs)

    if (transition === 'stale') return

    if (transition === 'append') {
      await app.store.appendBucketTarget({ applicationId, ts: now, value, ttlSeconds })
      return
    }

    if (transition === 'first' || transition === 'gap') {
      await app.store.openBucket({ applicationId, slotStart, isFirst: true, seed: null, ttlSeconds })
      await app.store.appendBucketTarget({ applicationId, ts: now, value, ttlSeconds })
      return
    }

    // transition === 'rollover' (contiguous): close the open bucket, open the next
    if (!bucket.isFirst) {
      await persistTimeSlotStats(applicationId, bucket)
      const baseSlotEnd = bucket.slotStart + slotMs
      if (baseSlotEnd % windowMs === 0) {
        await persistTimeWindowStats(applicationId, baseSlotEnd - windowMs)
      }
    }
    const lastValue = bucket.targets.length
      ? bucket.targets[bucket.targets.length - 1].value
      : value

    await app.store.openBucket({ applicationId, slotStart, isFirst: false, seed: { ts: slotStart, value: lastValue }, ttlSeconds })
    await app.store.appendBucketTarget({ applicationId, ts: now, value, ttlSeconds })
  }

  // Serialize per application so concurrent controllers can't race the read-close-reset.
  const chains = new Map()

  app.decorate('recordTarget', (applicationId, value, now) => {
    const prev = chains.get(applicationId) ?? Promise.resolve()
    const next = prev
      .then(() => ingestTarget(applicationId, value, now))
      .catch((err) => app.log.error({ err, applicationId }, '[time-slot-stats] recordTarget failed'))

    chains.set(applicationId, next)
    next.finally(() => { if (chains.get(applicationId) === next) chains.delete(applicationId) })
    return next
  })
}, {
  name: 'time-slot-stats',
  dependencies: ['env', 'store']
})
