'use strict'

const { median, robustScale } = require('./utils')
const { occurrenceIndexAt } = require('./contribution')
const { baselineForecast } = require('./forecast')
const { parseWindowDate } = require('./time-windows')
const { allScopes } = require('./scopes')

// The override pre-pass tests every calendar scope that matches the target — not only the ones
// that earned a global pattern — so the escape hatch can rescue a clean recent regime the global
// fit missed entirely. Built once at load, same catalogue as the discovery sweep.
const scopeCatalogue = allScopes()

// Readout (§6, Group D): a model's patterns → a prediction for a future day. Each open pattern
// whose scope matches the target contributes once — a recency-blended level or a reliability-
// damped line — on top of the de-lagged baseline forecast, with an escape hatch that lets a recent
// suffix override a stale global effect.

const REC_MIN_OCC = 6 // recency blend only kicks in with this many occurrences
const LINE_CAP_MAX_SUPPORT = 5 // thin lines are clamped to their in-sample range out of sample
const SUFFIX_LENS = [4, 6, 8, 12, 16] // suffix lengths the escape hatch tries, shortest first
const KAPPA = 0.5 // escape hatch: suffix must cut the typical global error by ≥ this fraction
const RHO = 1.0 // escape hatch: no point may be worse than this × the global error
const DAY_MS = 24 * 60 * 60 * 1000

// Lower (floor-index) quantile: the value at index ⌊p·n⌋ of the sorted list — not interpolated.
// The escape hatch's worst-case downside check needs this exact convention.
function lowerQuantile (values, p) {
  const sorted = values.slice().sort((a, b) => a - b)
  return sorted[Math.floor(p * sorted.length)]
}

// D8 — lean a segment's level toward its recent suffix, proportionally to how far the recent
// median has drifted from the long-run median relative to the noise. Off below REC_MIN_OCC.
function recencyBlend (segVals) {
  const longMedian = median(segVals)
  if (segVals.length < REC_MIN_OCC) return longMedian
  const suffixLength = Math.max(3, Math.floor(segVals.length / 3))
  const recentMedian = median(segVals.slice(-suffixLength))
  const drift = Math.abs(recentMedian - longMedian)
  const weight = drift / (drift + robustScale(segVals) + 1e-9)
  return (1 - weight) * longMedian + weight * recentMedian
}

// D9/D10 — a line pattern's contribution at calendar occurrence `occurrenceIndex`: full in-sample
// value, plus a reliability-damped extrapolation beyond the last fitted occurrence; thin lines are
// clamped to their in-sample value range so they can't extrapolate absurdly.
function lineForecast (pattern, occurrenceIndex) {
  const horizon = Math.max(0, occurrenceIndex - pattern.lastOcc)
  const slopeSquared = pattern.slope * pattern.slope
  const reliability = horizon === 0
    ? 1
    : slopeSquared / (slopeSquared + pattern.seB * pattern.seB * horizon * horizon)
  let contribution = pattern.effect + pattern.slope * (pattern.lastOcc - pattern.startOcc) +
    reliability * pattern.slope * horizon

  const support = pattern.lastOcc - pattern.startOcc + 1
  if (support <= LINE_CAP_MAX_SUPPORT && horizon > 0) {
    const fitStart = pattern.effect
    const fitEnd = pattern.effect + pattern.slope * (support - 1)
    contribution = Math.max(Math.min(fitStart, fitEnd), Math.min(Math.max(fitStart, fitEnd), contribution))
  }
  return contribution
}

// D11 — escape hatch. Over a scope's observed occurrences, does a recent suffix level predict the
// recent occurrences markedly better than the global effect? Tries each suffix length (shortest
// first, needs 2L occurrences); accepts when the suffix cuts the typical global error by ≥ KAPPA
// with no point worse than RHO× it. Returns the recent-suffix level, or null.
function suffixOverride (partial, globalEffect) {
  const occurrenceCount = partial.length
  for (const suffixLength of SUFFIX_LENS) {
    if (occurrenceCount < 2 * suffixLength) continue
    const improvements = []
    const globalErrors = []
    for (let i = occurrenceCount - suffixLength; i < occurrenceCount; i++) {
      const suffixLevel = median(partial.slice(i - suffixLength, i))
      const globalError = Math.abs(partial[i] - globalEffect[i])
      const suffixError = Math.abs(partial[i] - suffixLevel)
      globalErrors.push(globalError)
      improvements.push(globalError - suffixError)
    }
    const typicalGlobalError = median(globalErrors)
    const medianImprovement = median(improvements)
    const worstImprovement = improvements.length < 6 ? Math.min(...improvements) : lowerQuantile(improvements, 0.25)
    if (typicalGlobalError > 0 &&
        medianImprovement > KAPPA * typicalGlobalError &&
        worstImprovement > -RHO * typicalGlobalError) {
      return median(partial.slice(-suffixLength))
    }
  }
  return null
}

// Absolute UTC day number of a parsed calendar day.
function dayNumber (calendar) {
  return Date.UTC(calendar.year, calendar.month - 1, calendar.dom) / DAY_MS
}

// The prediction for `targetDate`: the de-lagged baseline forecast plus each matching open
// pattern's contribution (overrides applied once, strongest-support first, replacing the global
// effect).
function predict (model, targetDate) {
  const { timeWindows, patterns, leftover, baseline, totalEffect, scopeEffect } = model
  const timeWindowCount = timeWindows.length
  const target = parseWindowDate(targetDate)
  const targetIndex = dayNumber(target) - dayNumber(timeWindows[0])
  const stepsAhead = dayNumber(target) - dayNumber(timeWindows[timeWindowCount - 1])
  target.dayIndex = targetIndex // series-relative cycle position, for biweekly_dow / p14 scopes

  let prediction = baselineForecast(leftover, stepsAhead)

  const matchingPatterns = patterns.filter((pattern) => pattern.end === undefined && pattern.scope.matches(target))

  // Override pre-pass (D12): test every catalogue scope that matches the target (including scopes
  // with no global pattern — `scopeEffect` is then 0, and the suffix test runs on the raw residual),
  // strongest-calendar-support first, removing each accepted override from a local residual so the
  // next scope's suffix test sees it gone.
  const localResidual = new Array(timeWindowCount)
  for (let i = 0; i < timeWindowCount; i++) {
    localResidual[i] = timeWindows[i].value - baseline[i] - totalEffect[i]
  }
  const countMatches = (scope) => {
    let count = 0
    for (const timeWindow of timeWindows) if (scope.matches(timeWindow)) count++
    return count
  }
  const overrides = new Map()
  const activeScopes = scopeCatalogue.filter((scope) => scope.matches(target)).sort((a, b) => countMatches(b) - countMatches(a))
  for (const scope of activeScopes) {
    const ownEffect = scopeEffect.get(scope.key)
    const partial = []
    const globalEffect = []
    const positions = []
    for (let i = 0; i < timeWindowCount; i++) {
      if (!scope.matches(timeWindows[i]) || !timeWindows[i].observed) continue
      const effect = ownEffect ? ownEffect[i] : 0
      positions.push(i)
      globalEffect.push(effect)
      partial.push(localResidual[i] + effect)
    }
    const overrideLevel = suffixOverride(partial, globalEffect)
    if (overrideLevel === null) continue
    overrides.set(scope.key, overrideLevel)
    for (let j = 0; j < positions.length; j++) {
      localResidual[positions[j]] -= overrideLevel - globalEffect[j]
    }
  }

  for (const pattern of matchingPatterns) {
    if (overrides.has(pattern.scope.key)) continue
    prediction += pattern.kind === 'line'
      ? lineForecast(pattern, occurrenceIndexAt(pattern.scope, timeWindows, targetIndex))
      : recencyBlend(pattern.segVals)
  }
  for (const overrideLevel of overrides.values()) {
    prediction += overrideLevel
  }

  return Math.max(0, Math.round(prediction))
}

module.exports = { predict, recencyBlend, lineForecast, suffixOverride }
