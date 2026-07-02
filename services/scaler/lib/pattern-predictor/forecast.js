'use strict'

const { median, robustScale } = require('./utils')

// Baseline forecast (§6, Group C): the de-lagged forward level of the de-structured series. The
// rolling/median level is centered, so on a trend it under-shoots the present; this blends a
// damped-Holt extrapolation with a centered-median line projected forward, weighted by how
// reliable the recent trend looks.

const RECENT = 28 // window of recent points the forecast is built from
const ALPHA = 0.3 // Holt level smoothing
const BETA = 0.1 // Holt trend smoothing
const GAUGE_FLOOR = 1.0 // floor on the noise gauge used in the trend-reliability weight

// Damped Holt (fixed-rate, multiplicative damping): each step, if the trend over-shoots the new
// value in its own direction, shrink it. Forecasts `stepsAhead` past the last point.
function holt (recent, stepsAhead) {
  let level = recent[0]
  let trend = 0
  for (let i = 1; i < recent.length; i++) {
    const value = recent[i]
    const prevLevel = level
    const prevTrend = trend
    level = ALPHA * value + (1 - ALPHA) * (prevLevel + prevTrend)
    trend = BETA * (level - prevLevel) + (1 - BETA) * prevTrend
    const gap = level - value
    if (prevTrend * gap > 0) {
      trend *= Math.abs(prevTrend) / (Math.abs(prevTrend) + Math.abs(gap) + 1e-9)
    }
  }
  return level + stepsAhead * trend
}

// Theil–Sen robust line: slope = median of pairwise slopes, intercept = median(value − slope·i).
function robustLine (values) {
  const pointCount = values.length
  const slopes = []
  for (let i = 0; i < pointCount; i++) {
    for (let j = i + 1; j < pointCount; j++) {
      slopes.push((values[j] - values[i]) / (j - i))
    }
  }
  const slope = median(slopes)
  const intercepts = new Array(pointCount)
  for (let i = 0; i < pointCount; i++) {
    intercepts[i] = values[i] - slope * i
  }
  return { slope, intercept: median(intercepts) }
}

function baselineForecast (leftover, stepsAhead) {
  const recent = leftover.slice(-RECENT)
  if (recent.length === 0) return 0

  const { slope, intercept } = robustLine(recent)

  const lineResiduals = new Array(recent.length)
  for (let i = 0; i < recent.length; i++) {
    lineResiduals[i] = recent[i] - (intercept + slope * i)
  }
  const spread = Math.max(robustScale(lineResiduals), GAUGE_FLOOR)
  const rise = Math.abs(slope) * recent.length
  const trendReliability = rise / (rise + spread) // ∈ [0, 1)

  const holtForecast = holt(recent, stepsAhead)
  const flatNow = median(recent) + slope * (recent.length / 2 + stepsAhead)

  return trendReliability * holtForecast + (1 - trendReliability) * flatNow
}

module.exports = { baselineForecast, holt, robustLine }
