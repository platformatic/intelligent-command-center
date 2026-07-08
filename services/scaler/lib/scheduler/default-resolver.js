'use strict'

// Resolve the active schedules' soft limits, honouring `priority` (higher wins). Only the
// HIGHEST-priority active tier contributes; lower tiers are fully shadowed. This lets a
// below-baseline effect (e.g. a quiet Friday at priority 1) override an always-on baseline (priority
// 0) — which a plain MAX of all floors could never do. Within a tier, limits combine by the usual
// most-restrictive intersection (max of mins, min of maxs). Default priority 0 → one tier → behaves
// exactly like the pre-priority resolver. Returns SOFT limits; the scaler clamps them into hard.
async function defaultResolver ({ schedules }) {
  if (schedules.length === 0) return { minPods: null, maxPods: null }

  const top = Math.max(...schedules.map((s) => s.priority ?? 0))
  const winners = schedules.filter((s) => (s.priority ?? 0) === top)

  let minPods = null
  let maxPods = null
  for (const s of winners) {
    if (s.minPods != null) minPods = minPods == null ? s.minPods : Math.max(minPods, s.minPods)
    if (s.maxPods != null) maxPods = maxPods == null ? s.maxPods : Math.min(maxPods, s.maxPods)
  }

  if (minPods != null && maxPods != null && minPods > maxPods) {
    minPods = maxPods
  }
  return { minPods, maxPods }
}

module.exports = defaultResolver
