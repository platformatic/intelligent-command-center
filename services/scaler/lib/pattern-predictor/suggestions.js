'use strict'

const { buildModel } = require('./model')
const { baselineForecast } = require('./forecast')
const { currentEffect } = require('./patterns')
const { median, robustScale } = require('./utils')
const { tCriticalTwoSided } = require('./tdist')

// Presentation: turn the per-slot models into a FLAT, feature-blind list of floor suggestions
// across the whole schedule, each scored 0..1 and sorted by confidence, and (optionally) group
// contiguous slots that share the same pattern and value into reviewable units.
//
// A "suggestion" is one reviewable claim: for a slot, a set of days should have floor V. Every
// slot contributes its BASELINE ("most days = V") plus one suggestion per discovered pattern (a
// consistent deviation, e.g. "Mondays = 15"). No feature is privileged — dow, dom, eom, biweekly,
// p14 and the baseline are all scored by the same function.

const R0 = 0.25 // precision kernel width (relative-band units)
const V_MIN = 5 // relative-band denominator floor, so near-zero values don't blow it up
const COH_FLOOR = 0.7 // coherence (cross-SLOT span) is a MINOR modifier: confidence is driven by
// how many DAYS a pattern repeats (the precision term, n = days), not how many slots it spans.

// day.dow is 0-6 with Sunday = 0 (see time-windows/parseWindowDate), so this array is Sunday-first.
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const round3 = (x) => Math.round(x * 1000) / 1000
const finiteRound3 = (x) => Number.isFinite(x) ? round3(x) : null // band is Infinity below 2 members

// Precision: how tightly the value V is pinned, from the confidence band of its members. Subsumes
// support — few days → large tCrit and √n → wide band → low precision.
function precisionAndBand (values, V) {
  const n = values.length
  if (n < 2) return { precision: 0.1, band: Infinity }
  const se = robustScale(values) / Math.sqrt(n)
  const band = tCriticalTwoSided(n - 1, 0.05) * se
  const relband = band / Math.max(Math.abs(V), V_MIN)
  return { precision: Math.exp(-((relband / R0) ** 2)), band }
}

// Stability: 1 − how much the recent third disagrees with the full history (drift now vs then).
function stabilityOf (values) {
  if (values.length < 3) return 0.5
  const long = median(values)
  const k = Math.max(3, Math.floor(values.length / 3))
  const recent = median(values.slice(-k))
  const spread = robustScale(values)
  const disagreement = Math.abs(recent - long)
  return 1 - disagreement / (disagreement + spread + 1e-9)
}

function confidenceOf (values, V, coherence) {
  const { precision, band } = precisionAndBand(values, V)
  const stability = stabilityOf(values)
  const raw = Math.pow(precision, 0.7) * Math.pow(stability, 0.3) * (COH_FLOOR + (1 - COH_FLOOR) * coherence)
  return { confidence: Math.max(0, Math.min(1, raw)), band }
}

function describeDays (feature, value) {
  switch (feature) {
    case 'dow': return `${DOW[value]}s`
    case 'dom': return `day ${value} of month`
    case 'eom': return 'last day of month'
    case 'biweekly_dow': return `alternate ${DOW[value >> 1]}s (phase ${value & 1})`
    case 'p14': return `14-day cycle (phase ${value})`
    default: return `${feature}|${value}`
  }
}

const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function ordinal (n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

// "HH:MM" → a friendly clock label: "5 PM", "9:30 AM", "midnight", "noon".
function formatClock (hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  if (m === 0 && (h === 0 || h === 24)) return 'midnight'
  if (m === 0 && h === 12) return 'noon'
  const period = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, '0')} ${period}`
}

// "HH:MM–HH:MM" → "all day" or "from 5 PM to 9 PM".
function formatWindow (window) {
  const [start, end] = window.split('–')
  if (start === '00:00' && end === '24:00') return 'all day'
  return `from ${formatClock(start)} to ${formatClock(end)}`
}

// A plain-language "when this happens": the recurring day-set + the time-of-day window the group
// covers. E.g. "Every Monday, from 5 PM to 9 PM". The baseline is the always-on default floor,
// overridden wherever a higher-priority effect is active — hence "By default", not a day claim.
function describeWhen (kind, value, window) {
  const when = formatWindow(window)
  if (kind === 'baseline') return `By default, ${when}`
  let days
  switch (kind) {
    case 'dow': days = `Every ${WEEKDAY[value]}`; break
    case 'dom': days = `On the ${ordinal(value)} of the month`; break
    case 'eom': days = 'On the last day of the month'; break
    case 'biweekly_dow': days = `Every other ${WEEKDAY[value >> 1]}`; break
    case 'p14': days = `On a 14-day cycle (phase ${value})`; break
    default: days = 'By default'
  }
  return `${days}, ${when}`
}

const DAY_MS = 24 * 60 * 60 * 1000
const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] // rrule weekday codes, Sunday-first
const BASELINE_PRIORITY = 0 // always-on default floor; matches the scaler_schedules DB default
const EFFECT_PRIORITY = 1 // a discovered pattern overrides the baseline wherever it's active

function lastDom (year, month) { // month 1-12; day 0 of next month rolls back to this month's last
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function hhmmToMinutes (hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// True if a calendar day (UTC ms) is one the scope fires on. biweekly_dow/p14 phase is measured as
// whole days from `anchorMidnight`, exactly as scopes.js/time-windows do; baseline fires every day.
function scopeMatchesDay (kind, value, dayMs, anchorMidnight) {
  const d = new Date(dayMs)
  const dow = d.getUTCDay()
  const dom = d.getUTCDate()
  const dayIndex = Math.round((dayMs - anchorMidnight) / DAY_MS)
  const mod = (n, m) => ((n % m) + m) % m
  switch (kind) {
    case 'baseline': return true
    case 'dow': return dow === value
    case 'dom': return dom === value
    case 'eom': return dom === lastDom(d.getUTCFullYear(), d.getUTCMonth() + 1)
    case 'biweekly_dow': return dow === (value >> 1) && mod(Math.floor(dayIndex / 7), 2) === (value & 1)
    case 'p14': return mod(dayIndex, 14) === value
    default: return false
  }
}

// Translate one grouped pattern into a scheduler-ready soft-limit schedule (drop-in for
// scaler_schedules / lib/scheduler): an RRULE for the recurrence, plus a dtstart/dtend that carry
// BOTH the time-of-day window AND — for biweekly_dow / p14 — the series-relative PHASE, which the
// RRULE alone cannot express (its two parities render to the same rule). `anchor` is the first
// history day (UTC ms); phase is measured as whole days from it, exactly as scopes.js/time-windows
// do. dtstart is the next occurrence at/after `from`. The baseline is an always-on FREQ=DAILY floor
// at priority 0; effects are priority 1, so the resolver lets them override the baseline wherever
// active (even below it). Everything is UTC, matching the predictor's UTC slot_of_day.
function toSchedule (group, anchor, from, timezone = 'UTC') {
  const value = group.scopeValue
  const [startStr, endStr] = group.window.split('–')
  const startMin = hhmmToMinutes(startStr)
  const endMin = endStr === '24:00' ? 1440 : hhmmToMinutes(endStr)
  const durationMs = (endMin - startMin) * 60 * 1000

  const anchorMidnight = Math.floor(anchor / DAY_MS) * DAY_MS
  const fromMidnight = Math.floor(from / DAY_MS) * DAY_MS

  let rrule
  let priority = EFFECT_PRIORITY
  switch (group.kind) {
    case 'baseline': rrule = 'FREQ=DAILY'; priority = BASELINE_PRIORITY; break
    case 'dow': rrule = `FREQ=WEEKLY;BYDAY=${BYDAY[value]}`; break
    case 'dom': rrule = `FREQ=MONTHLY;BYMONTHDAY=${value}`; break
    case 'eom': rrule = 'FREQ=MONTHLY;BYMONTHDAY=-1'; break
    case 'biweekly_dow': rrule = `FREQ=WEEKLY;INTERVAL=2;BYDAY=${BYDAY[value >> 1]}`; break
    case 'p14': rrule = 'FREQ=DAILY;INTERVAL=14'; break
    default: return null
  }

  // The next calendar day (UTC) at/after `from` that the scope actually fires on — this fixes the
  // phase for biweekly_dow/p14 and the weekday/day-of-month for the rest (baseline fires every day).
  let dayTs = null
  for (let i = 0; i < 800; i++) {
    const ts = fromMidnight + i * DAY_MS
    if (scopeMatchesDay(group.kind, value, ts, anchorMidnight)) { dayTs = ts; break }
  }
  if (dayTs === null) return null

  const startMs = dayTs + startMin * 60 * 1000
  return {
    dtstart: new Date(startMs).toISOString(),
    dtend: new Date(startMs + durationMs).toISOString(),
    rrule,
    timezone,
    minPods: group.value,
    priority
  }
}

// Enumerate the concrete time windows that belong to a group pattern: the OBSERVED occurrences from
// its regime start through the last history day (exact recorded pods), plus the FORECAST occurrences
// over the next `futureDays` (at the pattern's own floor, `group.value`). Each entry is one slot
// window `{ slotStart, slotEnd, pods, predicted }` (ISO instants, UTC). The baseline is NOT
// enumerated — it matches every day and slot, i.e. the whole dataset, not a distinct pattern.
// `observed` is Map<dayMidnightMs, (number|null)[]> — the per-day slot grid updatePredictions builds.
function patternWindows (group, { observed, anchor, now, futureDays, windowMs }) {
  if (group.kind === 'baseline') return []

  const anchorMid = Math.floor(anchor / DAY_MS) * DAY_MS
  const todayMid = Math.floor(now / DAY_MS) * DAY_MS
  const sinceMs = group.since ? Date.parse(group.since) : -Infinity
  const slots = []
  for (let i = group.slots[0]; i <= group.slots[1]; i++) slots.push(i)

  const windows = []
  const emit = (dayMs, slot, pods, predicted) => {
    const start = dayMs + slot * windowMs
    windows.push({
      slotStart: new Date(start).toISOString(),
      slotEnd: new Date(start + windowMs).toISOString(),
      pods,
      predicted
    })
  }

  // Observed: matching days from the regime start through the last history day, exact recorded pods.
  for (const [dayMs, daySlots] of observed) {
    if (dayMs < sinceMs) continue
    if (!scopeMatchesDay(group.kind, group.scopeValue, dayMs, anchorMid)) continue
    for (const slot of slots) {
      const pods = daySlots[slot]
      if (pods != null) emit(dayMs, slot, pods, false)
    }
  }

  // Forecast: matching days over the next `futureDays`, at the pattern's floor.
  for (let d = 1; d <= futureDays; d++) {
    const dayMs = todayMid + d * DAY_MS
    if (!scopeMatchesDay(group.kind, group.scopeValue, dayMs, anchorMid)) continue
    for (const slot of slots) emit(dayMs, slot, group.value, true)
  }

  windows.sort((a, b) => Date.parse(a.slotStart) - Date.parse(b.slotStart))
  return windows
}

function slotLabel (slot, slotCount) {
  const minutes = 1440 / slotCount
  const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`
  return `${fmt(slot * minutes)}–${fmt((slot + 1) * minutes)}`
}

// history: [{ date: Date, slots: (number|null)[] }] (same shape predictSchedule takes).
// Returns Suggestion[] sorted by confidence descending. Each carries the evidence behind the score.
function generateSuggestions (history) {
  const slotCount = history.length === 0 ? 0 : history[0].slots.length

  // Pass 1: build each slot's model; collect its baseline + open patterns; track which slots each
  // pattern appears in (for cross-slot coherence).
  const perSlot = []
  const presence = new Map() // scopeKey -> Set(slot)
  for (let slot = 0; slot < slotCount; slot++) {
    const series = history.map((entry) => ({ date: entry.date, value: entry.slots[slot] }))
    const model = buildModel(series)
    const baselineForward = baselineForecast(model.leftover, 1)
    const patterns = model.patterns.filter((pattern) => pattern.end === undefined) // current/open regimes
    perSlot.push({ slot, model, baselineForward, patterns })
    for (const pattern of patterns) {
      const key = pattern.scope.key
      if (!presence.has(key)) presence.set(key, new Set())
      presence.get(key).add(slot)
    }
  }

  // coherence(scopeKey) ∈ [0,1] from the longest contiguous run of slots the pattern spans.
  const coherence = (key) => {
    const set = presence.get(key)
    if (!set) return 0
    const slots = [...set].sort((a, b) => a - b)
    let run = 1
    let best = 1
    for (let i = 1; i < slots.length; i++) {
      run = slots[i] === slots[i - 1] + 1 ? run + 1 : 1
      best = Math.max(best, run)
    }
    return 1 - Math.exp(-(best - 1) / 2) // run 1→0, 2→0.39, 3→0.63, 5→0.86 → 1
  }

  // Pass 2: emit one suggestion per baseline + per pattern, all scored the same way.
  const suggestions = []
  for (const { slot, model, baselineForward, patterns } of perSlot) {
    const label = slotLabel(slot, slotCount)

    const levelResiduals = []
    for (let i = 0; i < model.timeWindows.length; i++) {
      if (model.timeWindows[i].observed) levelResiduals.push(model.leftover[i] - model.baseline[i])
    }
    // The baseline is the always-on default floor (priority 0); effects override it wherever active
    // via higher schedule priority, so the baseline stays a single every-day claim — no day carving.
    const base = confidenceOf(levelResiduals.length ? levelResiduals : [0], baselineForward, 1)
    suggestions.push({
      slot: label,
      slotIndex: slot,
      kind: 'baseline',
      scopeKey: 'baseline',
      scopeValue: null,
      days: 'most days',
      value: Math.max(0, Math.round(baselineForward)),
      confidence: round3(base.confidence),
      support: levelResiduals.length,
      band: finiteRound3(base.band),
      coherence: 1,
      since: null // the baseline is the rolling level, not a change-point regime
    })

    for (const pattern of patterns) {
      const effect = currentEffect(pattern)
      const value = baselineForward + effect
      const coh = coherence(pattern.scope.key)
      const members = pattern.segVals && pattern.segVals.length ? pattern.segVals : [effect]
      const scored = confidenceOf(members, value, coh)
      // pattern.start indexes model.timeWindows (via .pos); its calendar date is when this open
      // regime's first occurrence landed — i.e. when the pattern started holding at this level.
      const startWin = model.timeWindows[pattern.start]
      suggestions.push({
        slot: label,
        slotIndex: slot,
        kind: pattern.scope.feature,
        scopeKey: pattern.scope.key,
        scopeValue: pattern.scope.value,
        days: describeDays(pattern.scope.feature, pattern.scope.value),
        value: Math.max(0, Math.round(value)),
        delta: Math.round(effect),
        confidence: round3(scored.confidence),
        support: pattern.segVals ? pattern.segVals.length : 0,
        band: finiteRound3(scored.band),
        coherence: round3(coh),
        since: new Date(Date.UTC(startWin.year, startWin.month - 1, startWin.dom)).toISOString()
      })
    }
  }

  suggestions.sort((a, b) => b.confidence - a.confidence)
  return suggestions
}

// Group the flat list into reviewable units: contiguous, uninterrupted slots that share the SAME
// pattern AND the same value (within a dynamic tolerance). A run breaks when the next slot is
// non-adjacent or its value drifts more than max(absTol, relTol·median) from the run's median —
// so a flat plateau merges (even at large magnitudes) but a real step or ramp fragments (a user
// accepts one number, not a shape). Group value/confidence/support are the medians of the members.
function groupSuggestions (suggestions, { absTol = 1, relTol = 0.15 } = {}) {
  // Group on scope IDENTITY (scopeKey), not the display string — two disjoint scopes can share a
  // label (e.g. biweekly phase 0 vs 1 both render "alternate Suns"), and must not merge.
  const byScope = new Map()
  for (const suggestion of suggestions) {
    if (!byScope.has(suggestion.scopeKey)) byScope.set(suggestion.scopeKey, [])
    byScope.get(suggestion.scopeKey).push(suggestion)
  }

  const groups = []
  for (const items of byScope.values()) {
    items.sort((a, b) => a.slotIndex - b.slotIndex)
    let run = []
    const flush = () => {
      if (run.length === 0) return
      const first = run[0]
      const last = run[run.length - 1]
      const window = `${first.slot.split('–')[0]}–${last.slot.split('–')[1]}`
      // The group started when the pattern first appeared in any of its slots (earliest regime start).
      const sinces = run.map((r) => r.since).filter(Boolean).map((s) => Date.parse(s))
      const since = sinces.length ? new Date(Math.min(...sinces)).toISOString() : null
      groups.push({
        pattern: first.days,
        kind: first.kind,
        scopeValue: first.scopeValue,
        since,
        when: describeWhen(first.kind, first.scopeValue, window),
        window,
        slots: [first.slotIndex, last.slotIndex],
        value: Math.max(0, Math.round(median(run.map((r) => r.value)))),
        confidence: round3(median(run.map((r) => r.confidence))),
        support: Math.round(median(run.map((r) => r.support))), // days the pattern repeats
        slotCount: run.length
      })
      run = []
    }
    for (const item of items) {
      if (run.length > 0) {
        const adjacent = item.slotIndex === run[run.length - 1].slotIndex + 1
        const runMedian = median(run.map((r) => r.value))
        const tolerance = Math.max(absTol, relTol * runMedian)
        if (!adjacent || Math.abs(item.value - runMedian) > tolerance) flush()
      }
      run.push(item)
    }
    flush()
  }

  groups.sort((a, b) => b.confidence - a.confidence)
  return groups
}

module.exports = { generateSuggestions, groupSuggestions, describeWhen, toSchedule, scopeMatchesDay, patternWindows }
