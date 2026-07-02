'use strict'

const { median } = require('./utils')

const DAY_MS = 24 * 60 * 60 * 1000

// How many nearest comparable days to median when imputing a missing day's placeholder.
const SAME_DOW_SAMPLE = 8
const FALLBACK_SAMPLE = 14

// UTC calendar fields for a date: day-of-year (1-366), month (1-12), year,
// day-of-week (0-6, Sunday = 0) and day-of-month (1-31).
function parseWindowDate (date) {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1)
  return {
    day: Math.floor((date.getTime() - startOfYear) / DAY_MS) + 1,
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear(),
    dow: date.getUTCDay(),
    dom: date.getUTCDate()
  }
}

// UTC-midnight timestamp of a value's calendar date.
function timestampOf (value) {
  return Date.UTC(value.year, value.month - 1, value.dom)
}

// Given one window's observed values sorted by date, return a gap-free daily series:
// observed values pass through unchanged, and every calendar day between two consecutive
// observed days is inserted with observed: false and an imputed placeholder value (see
// imputeMissingValue) so the baseline average has no gaps. Each window also gets a
// `dayIndex` = whole days since the first window — the series-relative cycle position that
// week-parity (biweekly_dow) and the 14-day cycle (p14) anchor to (gap-free, so it equals
// the array position; matches the reference's sequential row-index convention).
function imputeMissingWindows (values) {
  const series = []
  for (let i = 0; i < values.length; i++) {
    if (i > 0) {
      const from = timestampOf(values[i - 1]) + DAY_MS
      const to = timestampOf(values[i])
      for (let ts = from; ts < to; ts += DAY_MS) {
        const windowDate = new Date(ts)
        const parsedDate = parseWindowDate(windowDate)
        const imputedValue = imputeMissingValue(parsedDate, values)
        series.push({ ...parsedDate, value: imputedValue, observed: false })
      }
    }
    series.push(values[i])
  }

  const baseTs = series.length ? timestampOf(series[0]) : 0
  for (const window of series) {
    window.dayIndex = Math.round((timestampOf(window) - baseTs) / DAY_MS)
  }
  return series
}

// Values of the `count` windows closest by calendar date to `targetTs`. `windows` is sorted
// by date ascending (as the observed series always is): `after` is the first window at/after
// the target and `before` is the one just before it; we walk outward, taking the nearer
// side each step, so no re-sorting is needed.
function closestValues (windows, targetTs, count) {
  const distance = (window) => Math.abs(timestampOf(window) - targetTs)

  let after = windows.findIndex((window) => timestampOf(window) >= targetTs)
  if (after === -1) after = windows.length
  let before = after - 1

  const values = []
  while (values.length < count && (before >= 0 || after < windows.length)) {
    const beforeIsNearer = after >= windows.length ||
      (before >= 0 && distance(windows[before]) <= distance(windows[after]))
    if (beforeIsNearer) {
      values.push(windows[before].value)
      before--
    } else {
      values.push(windows[after].value)
      after++
    }
  }
  return values
}

// A neutral placeholder for a missing day, used only so the baseline average has no gaps —
// never a claim about what actually happened. Reads only observed days (never an imputed
// one) and always returns a finite number:
//   1. median of the nearest-by-date same-weekday observed days (up to SAME_DOW_SAMPLE), else
//   2. median of the nearest-by-date observed days of any weekday (up to FALLBACK_SAMPLE), else
//   3. 0.
function imputeMissingValue (missingDay, observed) {
  const targetTs = timestampOf(missingDay)

  const sameDow = searchWindows(observed, { dow: missingDay.dow })
  if (sameDow.length > 0) {
    return median(closestValues(sameDow, targetTs, SAME_DOW_SAMPLE))
  }

  if (observed.length > 0) {
    return median(closestValues(observed, targetTs, FALLBACK_SAMPLE))
  }

  return 0
}

// Return the windows that match all provided search parameters (AND). `start`/`end` are
// inclusive bounds on the window's calendar date (Date, timestamp, or ISO string); `dom`
// and `dow` are exact matches. Omitted parameters are not applied.
function searchWindows (windows, { start, end, dom, dow } = {}) {
  const startTs = start != null ? +new Date(start) : null
  const endTs = end != null ? +new Date(end) : null

  return windows.filter((window) => {
    if (startTs !== null && timestampOf(window) < startTs) return false
    if (endTs !== null && timestampOf(window) > endTs) return false
    if (dom != null && window.dom !== dom) return false
    if (dow != null && window.dow !== dow) return false
    return true
  })
}

module.exports = { parseWindowDate, imputeMissingWindows, searchWindows, imputeMissingValue }
