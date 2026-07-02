'use strict'

const { robustLoss, noiseScale } = require('./utils')
const { rollingLevel } = require('./baseline')
const { allScopes } = require('./scopes')
const { findScopePatterns } = require('./fit')
const { baselineForecast } = require('./forecast')
const { patternEffect } = require('./contribution')

// Scope picking & backfitting — the outer loop (§2/§3/§5). Given a dense, calendar-ordered series
// of time windows (one window number's daily history, gap-filled with a baseline from step 1),
// discover which scopes earn a repeating calendar pattern. Imports its fixed collaborators — the
// catalogue, the rolling level, the fitter and the baseline forecast. Pure/deterministic.

const MIN_OCCURRENCES = 2 // a scope needs ≥2 observed occurrences to be fit at all
const HARD_MAX_PASSES = 8 // backfit cap (anti-runaway)
const FORECAST_TOL = 0.5 // stop when the forecast moves < this (pods)
const OBJ_TOL_REL = 0.02 // …and the objective moves < 2% (relative)
const CLIP = 3 // robust-loss clip (in σ units)

// The fixed scope catalogue, built once at load — same for every application and window. It is
// emitted in pick order: anchors (dow, dom, eom) before the generated aliases (biweekly_dow, p14),
// so anchors claim overlapping calendar effects first during the sweep. Within a family the order
// is irrelevant, since same-family scopes are mutually exclusive.
const scopes = allScopes()

// The family (feature) part of a scope key.
function familyOf (key) {
  return key.slice(0, key.indexOf('|'))
}

// The scalar the stop rule tracks for an open pattern (§5, simple proxy — not the §6 readout): a
// level's raw effect, or a line's value at its last fitted occurrence.
function currentEffect (pattern) {
  return pattern.kind === 'line'
    ? pattern.effect + pattern.slope * (pattern.lastOcc - pattern.startOcc)
    : pattern.effect
}

// Convergence signals for one pass: the robust objective over observed windows, the forecast a
// matching future window would receive, and an observed prediction history kept only for audit.
function computeSignals (scopePatterns, timeWindows, baseline, leftover, totalEffect) {
  const observedResiduals = []
  const predictionHistory = []
  for (let i = 0; i < timeWindows.length; i++) {
    if (!timeWindows[i].observed) continue
    const modeled = baseline[i] + totalEffect[i]
    observedResiduals.push(timeWindows[i].value - modeled)
    predictionHistory.push(modeled)
  }
  const sigma = noiseScale(observedResiduals)
  const objective = robustLoss(observedResiduals, sigma, CLIP)

  const baselineForward = baselineForecast(leftover, 1)
  const openEffects = {}
  for (const [key, patterns] of scopePatterns) {
    for (const pattern of patterns) {
      if (pattern.end === undefined) openEffects[key] = currentEffect(pattern)
    }
  }

  return { objective, baselineForward, openEffects, predictionHistory }
}

// Stop when the forecast for a matching future window has settled AND the objective is no longer
// meaningfully improving. The forecast change bounds the worst single future window: |Δ baseline
// forecast| plus, per family, the largest open-effect change (a window matches at most one scope
// per family, so the per-family changes add).
function converged (signals, previousSignals) {
  const byFamily = {}
  const openKeys = new Set([
    ...Object.keys(signals.openEffects),
    ...Object.keys(previousSignals.openEffects)
  ])
  for (const key of openKeys) {
    const family = familyOf(key)
    const delta = Math.abs((signals.openEffects[key] || 0) - (previousSignals.openEffects[key] || 0))
    byFamily[family] = Math.max(byFamily[family] || 0, delta)
  }
  let forecastDelta = Math.abs(signals.baselineForward - previousSignals.baselineForward)
  for (const family of Object.keys(byFamily)) {
    forecastDelta += byFamily[family]
  }

  const objectiveDelta = Math.abs(signals.objective - previousSignals.objective)

  return forecastDelta < FORECAST_TOL &&
    objectiveDelta < OBJ_TOL_REL * Math.max(1, signals.objective)
}

// Combined effect of a set of patterns at every time window.
function patternsEffect (patterns, timeWindows) {
  const effect = new Array(timeWindows.length).fill(0)
  for (const pattern of patterns) {
    const values = patternEffect(pattern, timeWindows)
    for (let i = 0; i < timeWindows.length; i++) {
      effect[i] += values[i]
    }
  }
  return effect
}

// The outer loop. Each pass de-structures the series (subtract every pattern's effect) and
// recomputes the baseline on what is left, then sweeps every scope of the catalogue (already in
// pick order) — fitting each on the partial residual that excludes every OTHER scope, committing
// its patterns so the next scope immediately sees them. Stops when the forecast settles or after
// HARD_MAX_PASSES.
function discoverWindowPatterns (timeWindows) {
  const timeWindowCount = timeWindows.length

  const scopesPatterns = new Map() // scopeKey -> pattern[]
  const scopesEffects = new Map() // scopeKey -> number[timeWindowCount]
  let previousSignals = null

  for (let pass = 0; pass < HARD_MAX_PASSES; pass++) {
    // Sum all found effects from all scopes
    const totalWindowEffect = new Array(timeWindowCount).fill(0)
    for (const effect of scopesEffects.values()) {
      for (let i = 0; i < timeWindowCount; i++) {
        totalWindowEffect[i] += effect[i]
      }
    }

    // Compute the lefrover by subtracting the total effect from each window's value
    const windowUnknownEffects = new Array(timeWindowCount)
    for (let i = 0; i < timeWindowCount; i++) {
      windowUnknownEffects[i] = timeWindows[i].value - totalWindowEffect[i]
    }

    // Recompute the baseline after subtracting the all-scope effects
    const windowBaselines = rollingLevel(windowUnknownEffects)

    for (const scope of scopes) {
      const scopeEffects = scopesEffects.get(scope.key)

      // Collect this scope's observed occurrences, each carrying the partial residual that excludes
      // the baseline and every OTHER scope's current effect. `matchedCount` counts ALL calendar
      // matches (including missing ones, masked out of the fit) — any gap forces level-only fitting.
      const scopeTimeWindows = []
      let matchedCount = 0

      for (let i = 0; i < timeWindowCount; i++) {
        if (!scope.matches(timeWindows[i])) continue
        matchedCount++
        if (!timeWindows[i].observed) continue // mask missing windows

        const scopeEffect = scopeEffects ? scopeEffects[i] : 0
        const otherEffect = totalWindowEffect[i] - scopeEffect
        const residual = timeWindows[i].value - windowBaselines[i] - otherEffect

        scopeTimeWindows.push({ pos: i, residual })
      }

      // Support gate: fewer than MIN_OCCURRENCES OBSERVED → no fit attempted. A missing matched
      // occurrence (observed < matched) forces level-only fitting.
      let scopePatterns = []
      if (scopeTimeWindows.length >= MIN_OCCURRENCES) {
        const allowLine = scopeTimeWindows.length === matchedCount
        scopePatterns = findScopePatterns(scope, scopeTimeWindows, { allowLine, timeWindowCount })
      }

      const fittedEffect = patternsEffect(scopePatterns, timeWindows)
      for (let i = 0; i < timeWindowCount; i++) {
        const scopeEffect = scopeEffects ? scopeEffects[i] : 0
        totalWindowEffect[i] += fittedEffect[i] - scopeEffect
      }

      if (scopePatterns.length > 0) {
        scopesPatterns.set(scope.key, scopePatterns)
        scopesEffects.set(scope.key, fittedEffect)
      } else {
        scopesPatterns.delete(scope.key)
        scopesEffects.delete(scope.key)
      }
    }

    // Convergence + stop. Pass 0 has no previous signals, so the loop always runs ≥2 passes.
    const signals = computeSignals(scopesPatterns, timeWindows, windowBaselines, windowUnknownEffects, totalWindowEffect)
    if (pass > 0 && converged(signals, previousSignals)) break
    previousSignals = signals
  }

  const patterns = []
  for (const scopePatternList of scopesPatterns.values()) {
    patterns.push(...scopePatternList)
  }
  return patterns
}

module.exports = {
  discoverWindowPatterns,
  currentEffect,
  computeSignals,
  converged
}
