'use strict'

const STAT_KEYS = ['minPods', 'maxPods', 'p50Pods', 'p75Pods', 'p90Pods', 'p95Pods', 'p99Pods']

// Rounded average of each stat column across the given base rows (entity rows, camelCase
// columns). Returns null for an empty input.
function averageStats (rows) {
  if (!rows || rows.length === 0) return null
  const result = {}
  for (const key of STAT_KEYS) {
    let sum = 0
    for (const row of rows) sum += row[key]
    result[key] = Math.round(sum / rows.length)
  }
  return result
}

module.exports = { averageStats }
