'use strict'

const { median } = require('./utils')

// Pattern effect (§6, Group A): how a pattern's effect lands on the time-window series, and how a
// future window maps to its calendar occurrence index. A pattern covers a span [start, end] (end
// undefined = open, runs to the series end); within the span it contributes to every window the
// scope matches, counting those matches from 0 (so a line ramps occurrence by occurrence).

const DEFAULT_SPACING = 7 // fallback gap between occurrences when none can be measured

// Per-window effect array for one pattern. Level: constant effect on every matching window in the
// span. Line: pattern.effect + slope·occurrenceIndex, occurrenceIndex = 0,1,2,… over successive
// matching windows from the span start.
function patternEffect (pattern, timeWindows) {
  const timeWindowCount = timeWindows.length
  const effect = new Array(timeWindowCount).fill(0)
  const end = pattern.end ?? (timeWindowCount - 1)
  let occurrenceIndex = 0
  for (let i = pattern.start; i <= end; i++) {
    if (!pattern.scope.matches(timeWindows[i])) continue
    effect[i] = pattern.kind === 'line' ? pattern.effect + pattern.slope * occurrenceIndex : pattern.effect
    occurrenceIndex++
  }
  return effect
}

// The calendar occurrence index of `targetIndex` for a scope: the count (0-based) of the scope's
// matches up to that window. Counts ALL matches (not observed-only — benign, since only line
// patterns consume the index and lines exist only when there are no missing occurrences). Inside
// the observed range it clamps to the last occurrence; beyond it, extrapolates by the median gap.
function occurrenceIndexAt (scope, timeWindows, targetIndex) {
  const matchIndices = []
  for (let i = 0; i < timeWindows.length; i++) {
    if (scope.matches(timeWindows[i])) matchIndices.push(i)
  }
  if (matchIndices.length === 0) return 0

  const lastOccurrence = matchIndices.length - 1
  const lastMatchIndex = matchIndices[lastOccurrence]
  if (targetIndex <= lastMatchIndex) return lastOccurrence

  const gaps = []
  for (let i = 1; i < matchIndices.length; i++) {
    gaps.push(matchIndices[i] - matchIndices[i - 1])
  }
  const spacing = gaps.length ? median(gaps) : DEFAULT_SPACING
  return lastOccurrence + Math.max(1, Math.round((targetIndex - lastMatchIndex) / spacing))
}

module.exports = { patternEffect, occurrenceIndexAt }
