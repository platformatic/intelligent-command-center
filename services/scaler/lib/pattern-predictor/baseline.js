'use strict'

const { trimmedMean } = require('./utils')

const WINDOW = 14
const TRIM = 0.15

function clamp (value, lo, hi) {
  return Math.max(lo, Math.min(value, hi))
}

// The slow "level" of a dense series: a centered sliding trimmed mean. Each window's trimmed
// mean is assigned to its midpoint, leading values take the first window's level and trailing
// values the last (clamped to the edges), and a series no longer than one window gets a single
// trimmed mean for every position. `window` is a multiple of 7 so each weekday is represented
// equally and the weekly pattern cancels, leaving only the level; the trim keeps an in-window
// spike from bending it. Returns a new array the same length as `values`; does not mutate it.
// One sort buffer is reused across all windows, so the sweep allocates nothing per step.
function rollingLevel (values, { window = WINDOW, trim = TRIM } = {}) {
  const n = values.length
  const level = new Array(n)

  if (n <= window) {
    return level.fill(trimmedMean(values, trim))
  }

  const half = window >> 1
  const lastStart = n - window
  const cut = Math.floor(window * trim)
  const kept = window - 2 * cut

  const windowLevels = new Array(lastStart + 1)
  const buffer = new Array(window)
  for (let start = 0; start <= lastStart; start++) {
    for (let k = 0; k < window; k++) {
      buffer[k] = values[start + k]
    }

    buffer.sort((a, b) => a - b)

    let sum = 0
    for (let k = cut; k < window - cut; k++) {
      sum += buffer[k]
    }
    windowLevels[start] = sum / kept
  }

  for (let i = 0; i < n; i++) {
    level[i] = windowLevels[clamp(i - half, 0, lastStart)]
  }
  return level
}

// Attach a dense `baseline` (the rolling level) and a `residual` to every day of the gap-free
// series. The residual is value − baseline on observed days; on a missing (filled) day the
// residual would be an artifact of the imputation guess, not evidence, so it is null.
// Mutates `series`.
function computeBaselineAndResiduals (series, options) {
  const values = new Array(series.length)
  for (let i = 0; i < series.length; i++) {
    values[i] = series[i].value
  }
  const baseline = rollingLevel(values, options)
  for (let i = 0; i < series.length; i++) {
    const day = series[i]
    day.baseline = baseline[i]
    day.residual = day.observed ? day.value - day.baseline : null
  }
  return series
}

module.exports = { rollingLevel, computeBaselineAndResiduals }
