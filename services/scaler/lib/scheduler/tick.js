'use strict'

const errors = require('../errors')

// Validates the reconciler tick interval: integer minutes in [1, 60] that divide 60 evenly.
function assertValidTickMinutes (minutes) {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60 || 60 % minutes !== 0) {
    throw new errors.SCHEDULE_INVALID_TICK_INTERVAL(minutes)
  }
}

// Milliseconds from `now` until the next wall-clock boundary aligned to `intervalMs`.
// When `now` is exactly on a boundary, returns a full interval (never 0).
function nextBoundaryDelayMs (now, intervalMs) {
  const remainder = now % intervalMs
  return remainder === 0 ? intervalMs : intervalMs - remainder
}

module.exports = { assertValidTickMinutes, nextBoundaryDelayMs }
