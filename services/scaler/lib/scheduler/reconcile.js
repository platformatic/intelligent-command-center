'use strict'

const { isActiveAt } = require('./occurrences')

// Pure: given an application's schedules and the current time, compute the soft limits
// to store. Filters to the schedules whose active window contains `now`, delegates to the
// resolver, and returns { min, max, scheduleIds } — or null when no active schedule yields
// a limit (the caller then clears any stored soft limits).
async function computeSoftLimits ({ applicationId, schedules, now, resolver }) {
  const active = schedules.filter((s) => s.enabled && isActiveAt(s, now))
  const result = await resolver({ applicationId, schedules: active, now })

  const min = result?.minPods ?? null
  const max = result?.maxPods ?? null
  if (min == null && max == null) return null

  return { min, max, scheduleIds: active.map((s) => s.id) }
}

module.exports = { computeSoftLimits }
