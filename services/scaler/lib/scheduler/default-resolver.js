'use strict'

// Most-restrictive intersection of the active schedules' soft limits.
// Returns SOFT limits; the scaler clamps them into hard via getScalingLimits.
async function defaultResolver ({ schedules }) {
  let minPods = null
  let maxPods = null

  for (const s of schedules) {
    if (s.minPods != null) minPods = minPods == null ? s.minPods : Math.max(minPods, s.minPods)
    if (s.maxPods != null) maxPods = maxPods == null ? s.maxPods : Math.min(maxPods, s.maxPods)
  }

  if (minPods != null && maxPods != null && minPods > maxPods) {
    minPods = maxPods
  }
  return { minPods, maxPods }
}

module.exports = defaultResolver
