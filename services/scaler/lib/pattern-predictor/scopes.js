'use strict'

// The scope catalogue: a fixed vocabulary of calendar buckets, generated once before any data
// is touched. A scope is a (feature, value) pair plus a matches(day) predicate over a slot's
// UTC calendar fields (day.dow 0-6 Sunday=0, day.dom 1-31, day.month 1-12, day.year) and its
// series-relative day.dayIndex (whole days since the first window). The data never changes
// which scopes exist — only which ones end up owning a term during fitting.

// Last day-of-month for a calendar month (handles leap February). Date.UTC with day 0 of the
// next month rolls back to the last day of this one.
function lastDomOfMonth (year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function range (from, to) {
  const out = []
  for (let value = from; value <= to; value++) out.push(value)
  return out
}

function allScopes () {
  const scopes = []

  // dow: one bucket per day-of-week (0-6).
  for (const value of range(0, 6)) {
    scopes.push({ feature: 'dow', value, matches: (day) => day.dow === value })
  }

  // eom: the single "last day of its month" bucket. A semantic calendar anchor that no fixed dom
  // can express, so it claims its signal BEFORE the generic dom family (else dom|31 fragments it).
  scopes.push({
    feature: 'eom',
    value: 0,
    matches: (day) => day.dom === lastDomOfMonth(day.year, day.month)
  })

  // dom: one bucket per day-of-month (1-31).
  for (const value of range(1, 31)) {
    scopes.push({ feature: 'dom', value, matches: (day) => day.dom === value })
  }

  // biweekly_dow: a weekday split across two alternating weeks (0-13). value encodes
  // (dow, parity) as dow * 2 + parity; consecutive occurrences of the same weekday are 7 days
  // apart, so floor(dayIndex / 7) flips parity every week. dayIndex is series-relative, so the
  // phase anchors at the first window — only the alternation matters, not which week is "even".
  for (const value of range(0, 13)) {
    const dow = value >> 1
    const parity = value & 1
    scopes.push({
      feature: 'biweekly_dow',
      value,
      matches: (day) => day.dow === dow && Math.floor(day.dayIndex / 7) % 2 === parity
    })
  }

  // p14: position in a fixed 14-day cycle (0-13), counted from the first window.
  for (const value of range(0, 13)) {
    scopes.push({
      feature: 'p14',
      value,
      matches: (day) => day.dayIndex % 14 === value
    })
  }

  // Precompute each scope's identity key once — feature and value are fixed forever, so the hot
  // loops read scope.key instead of rebuilding the string on every iteration.
  for (const scope of scopes) {
    scope.key = scope.feature + '|' + scope.value
  }

  return scopes
}

module.exports = { allScopes }
