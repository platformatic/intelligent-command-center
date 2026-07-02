'use strict'

const { parseWindowDate, imputeMissingWindows } = require('./time-windows')
const { rollingLevel } = require('./baseline')
const { patternEffect } = require('./contribution')
const { discoverWindowPatterns } = require('./patterns')
const { predict } = require('./readout')

const DAY_MS = 24 * 60 * 60 * 1000

function dayNumber (calendar) {
  return Date.UTC(calendar.year, calendar.month - 1, calendar.dom) / DAY_MS
}

// Build a model from one slot's daily history: [{ date: Date, value: number|null }] (null = no
// observation that day). Imputes the gaps, discovers the calendar patterns, and retains the
// bookkeeping the readout needs — the de-structured series (leftover), the baseline, and the total
// and per-scope effects.
function buildModel (series) {
  const observed = []
  for (const entry of series) {
    if (entry.value == null || !Number.isFinite(entry.value)) continue
    observed.push({ ...parseWindowDate(entry.date), value: entry.value, observed: true })
  }
  observed.sort((a, b) => dayNumber(a) - dayNumber(b))

  const timeWindows = imputeMissingWindows(observed)
  const patterns = discoverWindowPatterns(timeWindows)

  const scopeEffect = new Map()
  const totalEffect = new Array(timeWindows.length).fill(0)
  for (const pattern of patterns) {
    const key = pattern.scope.key
    let effect = scopeEffect.get(key)
    if (!effect) {
      effect = new Array(timeWindows.length).fill(0)
      scopeEffect.set(key, effect)
    }
    const values = patternEffect(pattern, timeWindows)
    for (let i = 0; i < timeWindows.length; i++) {
      effect[i] += values[i]
      totalEffect[i] += values[i]
    }
  }

  const leftover = new Array(timeWindows.length)
  for (let i = 0; i < timeWindows.length; i++) {
    leftover[i] = timeWindows[i].value - totalEffect[i]
  }

  return { timeWindows, patterns, totalEffect, scopeEffect, leftover, baseline: rollingLevel(leftover) }
}

// §7 per-slot wrapper: history = [{ date: Date, slots: (number|null)[] }]. Each slot is an
// independent daily series (slots[s] = the value, or null if no row that day); returns the
// predicted target value per slot.
function predictSchedule (history, targetDate) {
  const slotCount = history.length === 0 ? 0 : history[0].slots.length
  const forecasts = new Array(slotCount)
  for (let slot = 0; slot < slotCount; slot++) {
    const series = history.map((entry) => ({ date: entry.date, value: entry.slots[slot] }))
    forecasts[slot] = predict(buildModel(series), targetDate)
  }
  return forecasts
}

module.exports = { buildModel, predict, predictSchedule }
