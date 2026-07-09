'use strict'

// Number of consecutive zero-RPS checks required before expiring a draining
// version. The RPS query (sum_over_time over the traffic window) is already
// smooth, so a zero means no requests for the whole window. This streak guards
// a different transient: a kube_pod_labels scrape gap can momentarily drop the
// metric join to empty -> 0 even while the version is still serving traffic.
// Requiring a short streak rides over that before we expire. (A failed query
// returns null, which is handled separately and never counted as a zero.)
const REQUIRED_ZERO_CHECKS = 2

// In-memory streak counter per draining version (keyed by appLabel:versionLabel).
// Runs on the leader; resets harmlessly on leadership change or restart.
const zeroStreaks = new Map()

async function shouldExpire (version, { getVersionRPS }) {
  const key = `${version.appLabel}:${version.versionLabel}`
  const rps = await getVersionRPS(version.controllerName)

  // Query failed (null) or there is still traffic: not idle, reset the streak.
  if (rps === null || rps > 0) {
    zeroStreaks.delete(key)
    return false
  }

  // rps === 0: only expire once we have seen enough consecutive zero checks.
  const streak = (zeroStreaks.get(key) || 0) + 1
  if (streak >= REQUIRED_ZERO_CHECKS) {
    zeroStreaks.delete(key)
    return true
  }
  zeroStreaks.set(key, streak)
  return false
}

module.exports = { shouldExpire, forceExpire: null, REQUIRED_ZERO_CHECKS }
