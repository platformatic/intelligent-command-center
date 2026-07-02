'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { parseWindowDate, imputeMissingWindows, searchWindows, imputeMissingValue } = require('../../../lib/pattern-predictor/time-windows')

const utc = (y, m, d) => new Date(Date.UTC(y, m - 1, d))

test('parseWindowDate returns UTC day-of-year, month, year, dow, dom', () => {
  // 2026-01-01 is a Thursday (dow 4)
  assert.deepEqual(parseWindowDate(utc(2026, 1, 1)), { day: 1, month: 1, year: 2026, dow: 4, dom: 1 })
  // 2026 is not a leap year: Jan 31 + Feb 28 = 59, so Mar 1 = day-of-year 60 (a Sunday)
  assert.deepEqual(parseWindowDate(utc(2026, 3, 1)), { day: 60, month: 3, year: 2026, dow: 0, dom: 1 })
})

test('imputeMissingWindows: empty stays empty', () => {
  assert.deepEqual(imputeMissingWindows([]), [])
})

test('imputeMissingWindows: consecutive observed days are unchanged', () => {
  const a = { ...parseWindowDate(utc(2026, 1, 1)), value: 5, observed: true }
  const b = { ...parseWindowDate(utc(2026, 1, 2)), value: 6, observed: true }
  assert.deepEqual(imputeMissingWindows([a, b]), [a, b])
})

test('imputeMissingWindows: fills the gap between observed days', () => {
  const a = { ...parseWindowDate(utc(2026, 1, 1)), value: 5, observed: true }
  const c = { ...parseWindowDate(utc(2026, 1, 3)), value: 7, observed: true }
  const result = imputeMissingWindows([a, c])
  assert.equal(result.length, 3)
  assert.equal(result[0], a)
  // Jan 2 is a Friday with no observed Friday → falls back to median(5, 7) = 6
  assert.deepEqual(result[1], { day: 2, month: 1, year: 2026, dow: 5, dom: 2, value: 6, observed: false, dayIndex: 1 })
  assert.equal(result[2], c)
})

test('imputeMissingWindows: fills a gap across a month boundary', () => {
  const a = { ...parseWindowDate(utc(2026, 1, 30)), value: 1, observed: true }
  const b = { ...parseWindowDate(utc(2026, 2, 2)), value: 2, observed: true }
  const result = imputeMissingWindows([a, b])
  // missing days Jan 31 (Sat) and Feb 1 (Sun) have no same-weekday observation →
  // each falls back to median(1, 2) = 1.5
  assert.deepEqual(result.map((v) => `${v.month}-${v.dom}`), ['1-30', '1-31', '2-1', '2-2'])
  assert.deepEqual(result.filter((v) => !v.observed).map((v) => v.value), [1.5, 1.5])
})

// Jan 1-5 2026 → dow Thu(4), Fri(5), Sat(6), Sun(0), Mon(1); value === day-of-month
const w = (y, m, d, value) => ({ ...parseWindowDate(utc(y, m, d)), value, observed: true })
const sample = [w(2026, 1, 1, 1), w(2026, 1, 2, 2), w(2026, 1, 3, 3), w(2026, 1, 4, 4), w(2026, 1, 5, 5)]

test('searchWindows: no params returns all', () => {
  assert.equal(searchWindows(sample).length, 5)
  assert.equal(searchWindows(sample, {}).length, 5)
})

test('searchWindows: filters by dom', () => {
  assert.deepEqual(searchWindows(sample, { dom: 3 }).map((x) => x.value), [3])
})

test('searchWindows: filters by dow', () => {
  assert.deepEqual(searchWindows(sample, { dow: 0 }).map((x) => x.value), [4])
})

test('searchWindows: filters by inclusive start/end date range', () => {
  const res = searchWindows(sample, { start: utc(2026, 1, 2), end: utc(2026, 1, 4) })
  assert.deepEqual(res.map((x) => x.value), [2, 3, 4])
})

test('searchWindows: multiple params are AND-ed', () => {
  const res = searchWindows(sample, { start: utc(2026, 1, 2), end: utc(2026, 1, 5), dow: 1 })
  assert.deepEqual(res.map((x) => x.value), [5])
})

test('imputeMissingValue: median of the nearest same-weekday observed days', () => {
  const observed = [
    w(2026, 1, 5, 10), // Mon
    w(2026, 1, 6, 999), // Tue (different weekday, ignored)
    w(2026, 1, 12, 30), // Mon
    w(2026, 1, 26, 20) // Mon
  ]
  const missing = parseWindowDate(utc(2026, 1, 19)) // a Monday
  // same-weekday values 10, 30, 20 → median 20 (the Tuesday is ignored)
  assert.equal(imputeMissingValue(missing, observed), 20)
})

test('imputeMissingValue: falls back to nearest any-weekday days when the weekday is empty', () => {
  const observed = [w(2026, 1, 6, 4), w(2026, 1, 7, 8), w(2026, 1, 8, 6)] // Tue, Wed, Thu
  const missing = parseWindowDate(utc(2026, 1, 19)) // a Monday — no observed Mondays
  // fall back to all observed: median(4, 8, 6) = 6
  assert.equal(imputeMissingValue(missing, observed), 6)
})

test('imputeMissingValue: returns 0 when nothing has been observed', () => {
  assert.equal(imputeMissingValue(parseWindowDate(utc(2026, 1, 19)), []), 0)
})

test('imputeMissingValue: limits to the nearest same-weekday days, excluding far outliers', () => {
  const baseMon = Date.UTC(2026, 0, 5) // Jan 5 2026 is a Monday
  const WEEK = 7 * 24 * 60 * 60 * 1000
  const mondays = []
  for (let k = 0; k < 17; k++) {
    const value = k < 8 ? 5 : 100 // 8 nearest weeks = 5, 9 farther weeks = 100
    mondays.push({ ...parseWindowDate(new Date(baseMon + k * WEEK)), value, observed: true })
  }
  const missing = parseWindowDate(new Date(baseMon - WEEK)) // Monday just before all observed
  // nearest 8 same-weekday days are all 5 → median 5; the 9 far 100s are beyond the limit
  assert.equal(imputeMissingValue(missing, mondays), 5)
})
