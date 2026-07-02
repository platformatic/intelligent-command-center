'use strict'

const PERCENTILES = [50, 75, 90, 95, 99]

// Time-weighted percentiles over a step function. `targets` = [{ ts, value }] covering
// [slotStart, slotEnd): value vi holds [ti, ti+1); the last value holds [tn, slotEnd).
// Non-interpolated: every result is a real value present in the data. Returns null when
// there is no positive-duration coverage.
function timeWeightedPercentiles (targets, slotStart, slotEnd) {
  if (!targets || targets.length === 0) return null
  const sorted = [...targets].sort((a, b) => a.ts - b.ts)

  const durationByValue = new Map()
  let total = 0
  for (let i = 0; i < sorted.length; i++) {
    const start = Math.max(sorted[i].ts, slotStart)
    const rawEnd = i + 1 < sorted.length ? sorted[i + 1].ts : slotEnd
    const end = Math.min(rawEnd, slotEnd)
    const dur = end - start
    if (dur <= 0) continue
    const v = sorted[i].value
    durationByValue.set(v, (durationByValue.get(v) ?? 0) + dur)
    total += dur
  }
  if (total === 0) return null

  const values = [...durationByValue.keys()].sort((a, b) => a - b)
  const result = { min: values[0], max: values[values.length - 1] }

  // Single ascending pass over the value CDF assigns every percentile at once.
  // PERCENTILES is sorted ascending, so the thresholds are monotonic and a moving
  // pointer (pi) picks the smallest value whose cumulative duration reaches each one.
  const thresholds = PERCENTILES.map((p) => (p / 100) * total)
  let cum = 0
  let pi = 0
  for (let i = 0; i < values.length && pi < thresholds.length; i++) {
    cum += durationByValue.get(values[i])
    while (pi < thresholds.length && cum >= thresholds[pi]) {
      result[`p${PERCENTILES[pi]}`] = values[i]
      pi++
    }
  }
  return result
}

module.exports = { timeWeightedPercentiles }
