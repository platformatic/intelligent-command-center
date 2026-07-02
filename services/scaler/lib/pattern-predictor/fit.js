'use strict'

const { median, robustScale, robustLoss, noiseScale } = require('./utils')
const { tCriticalTwoSided } = require('./tdist')
const { allScopes } = require('./scopes')

// The fit (§4): one scope's time-ordered occurrence residuals → patterns. A pattern attributes a
// recurring calendar effect (a level or a trending line) to one scope value over a date range;
// a scope can own several (regime segments), the last of which is open (the current regime).

const MIN_SEG = 2 // a segment needs ≥ 2 occurrences
const MIN_SLOPE_PTS = 3 // a line needs ≥ 3 (df = n − 2 ≥ 1)
const MAX_BOUNDARIES = 6 // candidate internal cut points
const MAX_SEGMENTS = 4 // segments per scope
const CLIP = 3 // robust-loss clip (σ units)
const ALPHA = 0.05 // gate significance, Bonferroni-divided by family size
const BOUNDARY_HALF_WINDOW = 3 // ±occurrences averaged when scoring a candidate cut

// Number of values in each feature's family, used as the Bonferroni divisor. Derived from the
// catalogue so it can't drift: dow 7, dom 31, eom 1, biweekly_dow 14, p14 14.
const FAMILY_SIZE = {}
for (const scope of allScopes()) {
  FAMILY_SIZE[scope.feature] = (FAMILY_SIZE[scope.feature] || 0) + 1
}

// Ordinary least squares of `values` against their 0-based index (x = 0..n-1). Returns the
// intercept (the fitted value at x = 0, i.e. the segment start), the slope, and the standard
// error of the slope (seB, df = n − 2; Infinity below 3 points). seB is 0 on an exact fit (the
// slope gate reads that as t = ∞). A degenerate x-axis (Σ collapses) → slope 0, seB Infinity.
function ols (values) {
  const n = values.length

  let sx = 0
  let sy = 0
  let sxx = 0
  let sxy = 0
  for (let i = 0; i < n; i++) {
    sx += i
    sy += values[i]
    sxx += i * i
    sxy += i * values[i]
  }

  const denom = n * sxx - sx * sx
  if (Math.abs(denom) < 1e-9) return { intercept: sy / n, slope: 0, seB: Infinity }

  const slope = (n * sxy - sx * sy) / denom
  const intercept = (sy - slope * sx) / n

  let sse = 0
  for (let i = 0; i < n; i++) {
    const error = values[i] - (intercept + slope * i)
    sse += error * error
  }
  const meanX = sx / n
  let centeredSxx = 0
  for (let i = 0; i < n; i++) centeredSxx += (i - meanX) ** 2
  const seB = n > 2 ? Math.sqrt((sse / (n - 2)) / Math.max(centeredSxx, 1e-9)) : Infinity

  return { intercept, slope, seB }
}

// Candidate internal cut points (§4c): score each position by the local mean shift (≤ ±3
// occurrences either side), then greedily take the highest-scoring positions that are ≥ MIN_SEG
// apart, up to MAX_BOUNDARIES. A cut j starts the right segment; returns them sorted ascending.
function candidateBoundaries (residuals) {
  const m = residuals.length
  if (m < 2 * MIN_SEG) return []

  const prefix = new Array(m + 1)
  prefix[0] = 0
  for (let k = 0; k < m; k++) {
    prefix[k + 1] = prefix[k] + residuals[k]
  }
  const mean = (lo, hi) => (prefix[hi] - prefix[lo]) / (hi - lo)

  const candidates = []
  for (let j = MIN_SEG; j <= m - MIN_SEG; j++) {
    const leftMean = mean(Math.max(0, j - BOUNDARY_HALF_WINDOW), j)
    const rightMean = mean(j, Math.min(m, j + BOUNDARY_HALF_WINDOW))
    candidates.push({ j, score: Math.abs(leftMean - rightMean) })
  }
  candidates.sort((a, b) => b.score - a.score)

  const picked = []
  for (const candidate of candidates) {
    if (picked.length === MAX_BOUNDARIES) break
    if (picked.every((p) => Math.abs(p - candidate.j) >= MIN_SEG)) picked.push(candidate.j)
  }
  picked.sort((a, b) => a - b)
  return picked
}

// Slope gate (§4e): a one-sided-magnitude t-test, family-corrected. A perfect fit (seB == 0,
// e.g. a deterministic ramp) is t = ∞ ⇒ maximally significant ⇒ passes; a zero/non-finite slope
// or negative/non-finite seB never does. The heavy low-df t tail penalises thin spurious trends.
function slopePassesGate (length, slope, seB, familySize) {
  const df = length - 2
  if (df <= 0) return false
  if (!Number.isFinite(slope) || slope === 0) return false
  if (!Number.isFinite(seB) || seB < 0) return false
  if (seB === 0) return true
  return Math.abs(slope) / seB > tCriticalTwoSided(df, ALPHA / Math.max(1, familySize))
}

// Level-step gate (§4d): a one-sample, robust, family-corrected t-test on the jump from the
// previous segment's level to this one. df = n − 1; the spread is the MAD-based robust SE of
// the mean around the new level. A deterministic step (zero spread) passes; no step never does.
function segmentJumpPasses (segVals, newLevel, prevLevel, familySize) {
  const n = segVals.length
  const df = n - 1
  if (df <= 0) return false

  const delta = newLevel - prevLevel
  const deviations = new Array(n)
  for (let i = 0; i < n; i++) {
    deviations[i] = segVals[i] - newLevel
  }
  const se = robustScale(deviations) / Math.sqrt(n)

  if (!(se >= 0)) return false // NaN guard
  if (se === 0) return Math.abs(delta) > 0
  return Math.abs(delta) / se > tCriticalTwoSided(df, ALPHA / Math.max(1, familySize))
}

// Robust loss of `values` against a per-index model fn, without allocating a residual array.
function lossAgainst (values, sigma, model) {
  const clip2 = CLIP * CLIP
  let loss = 0
  for (let i = 0; i < values.length; i++) {
    const e = (values[i] - model(i)) / sigma
    loss += Math.min(e * e, clip2)
  }
  return loss
}

// Fit one segment (§4e): a level (median) always, upgraded to a line when allowed, long enough,
// MDL-preferred, and the slope clears its gate. Returns { kind, effect, loss, cost, slope?, seB? }.
function fitSegment (segVals, sigma, allowLine, familySize, paramCost) {
  const level = median(segVals)
  const lossLevel = lossAgainst(segVals, sigma, () => level)
  const best = { kind: 'level', effect: level, slope: 0, seB: 0, loss: lossLevel, cost: paramCost }

  if (allowLine && segVals.length >= MIN_SLOPE_PTS) {
    const { intercept, slope, seB } = ols(segVals)
    const lossLine = lossAgainst(segVals, sigma, (i) => intercept + slope * i)
    const mdlPrefersLine = lossLine + 2 * paramCost < lossLevel + paramCost
    if (mdlPrefersLine && slopePassesGate(segVals.length, slope, seB, familySize)) {
      return { kind: 'line', effect: intercept, slope, seB, loss: lossLine, cost: 2 * paramCost }
    }
  }
  return best
}

// Segmentation DP (§4d): partition the occurrences (at the candidate boundaries) into ≤
// MAX_SEGMENTS segments minimising Σ(segment loss + cost) + boundaryCost per internal cut. One
// best path is kept per boundary point `t` (cost F[t], its last segment's fit info[t], its
// segment count nseg[t]) — NOT one per (boundary, segment-count); a level segment can extend a
// boundary only if its jump from that single retained path's level clears the gate (line
// boundaries are not jump-gated). Returns { segments, cost } or null.
function segment (residuals, bounds, sigma, allowLine, familySize, paramCost, boundaryCost) {
  const stops = bounds.length

  const cost = new Array(stops).fill(Infinity) // best cost to reach boundary t
  const back = new Array(stops).fill(-1) // the boundary the best path came from
  const info = new Array(stops).fill(null) // fit of the segment ending at boundary t
  const segmentCount = new Array(stops).fill(0) // segments on the best path to t
  cost[0] = 0

  for (let t = 1; t < stops; t++) {
    for (let s = 0; s < t; s++) {
      if (cost[s] === Infinity) continue
      if (segmentCount[s] + 1 > MAX_SEGMENTS) continue
      const a = bounds[s]
      const b = bounds[t]
      if (b - a < MIN_SEG) continue

      const values = residuals.slice(a, b)
      const fit = fitSegment(values, sigma, allowLine, familySize, paramCost)
      // A new LEVEL segment must clear the jump gate against the previous segment's level — the
      // fit's effect (a line's intercept, a level's median), so a level after a line is gated
      // correctly. s === 0 is the first segment (no predecessor to jump from).
      if (s > 0 && fit.kind === 'level' && info[s] &&
          !segmentJumpPasses(values, fit.effect, info[s].effect, familySize)) {
        continue
      }
      const candidate = cost[s] + fit.loss + fit.cost + (s > 0 ? boundaryCost : 0)
      if (candidate < cost[t]) {
        cost[t] = candidate
        back[t] = s
        info[t] = fit
        segmentCount[t] = segmentCount[s] + 1
      }
    }
  }

  if (cost[stops - 1] === Infinity) return null

  const segments = []
  let t = stops - 1
  while (t > 0) {
    const s = back[t]
    segments.unshift({ startIndex: bounds[s], endIndex: bounds[t], fit: info[t] })
    t = s
  }
  return { segments, cost: cost[stops - 1] }
}

// The fit (§4): one scope's occurrences → patterns. Measures the noise, finds the best
// segmentation of the partial residual, and keeps it only if it beats leaving the whole signal in
// the residual (MDL, family-corrected). Returns [] when the scope earns no pattern.
function findScopePatterns (scope, scopeTimeWindows, { allowLine, timeWindowCount }) {
  const scopeWindowCount = scopeTimeWindows.length

  const residuals = new Array(scopeWindowCount)
  for (let i = 0; i < scopeTimeWindows.length; i++) {
    residuals[i] = scopeTimeWindows[i].residual
  }

  const sigma = noiseScale(residuals)
  const loss0 = robustLoss(residuals, sigma, CLIP) // cost of leaving it all in the residual
  const paramCost = Math.log(Math.max(2, timeWindowCount))
  const boundaryCost = Math.log(Math.max(2, scopeWindowCount))
  const familySize = FAMILY_SIZE[scope.feature]

  const bounds = [0, ...candidateBoundaries(residuals), scopeWindowCount]
  const result = segment(residuals, bounds, sigma, allowLine, familySize, paramCost, boundaryCost)
  if (result === null) return []

  const familyCost = Math.log(Math.max(2, familySize))
  if (!(result.cost + familyCost < loss0)) return [] // must beat "no effect" (§4f)

  const lastIndex = result.segments.length - 1
  const patterns = []
  for (let s = 0; s <= lastIndex; s++) {
    const { startIndex, endIndex, fit } = result.segments[s]
    patterns.push({
      scope,
      kind: fit.kind,
      effect: fit.effect,
      slope: fit.slope,
      seB: fit.seB,
      start: scopeTimeWindows[startIndex].pos, // window index of the segment's first occurrence
      end: s === lastIndex ? undefined : scopeTimeWindows[endIndex - 1].pos, // open pattern → undefined
      startOcc: startIndex, // occurrence index, for the line forecast in readout
      lastOcc: endIndex - 1,
      segVals: residuals.slice(startIndex, endIndex)
    })
  }
  return patterns
}

module.exports = { ols, candidateBoundaries, slopePassesGate, segmentJumpPasses, fitSegment, findScopePatterns }
