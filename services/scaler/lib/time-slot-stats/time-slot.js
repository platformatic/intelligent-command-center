'use strict'

const { DateTime, IANAZone } = require('luxon')
const errors = require('../errors')

const MS_PER_DAY = 24 * 60 * 60 * 1000

// Integer minutes in [1,60] that divide 60 evenly.
function assertValidSlotMinutes (minutes) {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60 || 60 % minutes !== 0) {
    throw new errors.INVALID_TIME_SLOT(minutes)
  }
}

// Window minutes must be a whole number of slots, larger than a slot, and divide the day.
function assertValidWindowMinutes (windowMinutes, slotMinutes) {
  if (
    !Number.isInteger(windowMinutes) ||
    windowMinutes <= slotMinutes ||
    windowMinutes % slotMinutes !== 0 ||
    1440 % windowMinutes !== 0
  ) {
    throw new errors.INVALID_TIME_WINDOW(windowMinutes)
  }
}

function validateTimeSlotTimezone (timezone) {
  if (!IANAZone.isValidZone(timezone)) {
    throw new errors.INVALID_TIME_SLOT_TIMEZONE(timezone)
  }
}

// Floor an epoch-ms instant to its UTC-aligned time-slot boundary.
function slotStartFor (now, slotMs) {
  return Math.floor(now / slotMs) * slotMs
}

// 1-based slot index within the UTC day.
function slotOfDay (slotStart, slotMs) {
  const intoDay = ((slotStart % MS_PER_DAY) + MS_PER_DAY) % MS_PER_DAY
  return Math.floor(intoDay / slotMs) + 1
}

// 1-based slot index within the local day (DST-correct via wall-clock components).
function localSlotOfDay (slotStart, slotMs, timezone) {
  const dt = DateTime.fromMillis(slotStart, { zone: timezone })
  const slotMinutes = slotMs / 60000
  const minutesIntoDay = dt.hour * 60 + dt.minute
  return Math.floor(minutesIntoDay / slotMinutes) + 1
}

// Decide what an incoming target's slot (`slotStart`) means relative to the open
// bucket's slot (`openSlotStart`): first / append / rollover / gap / stale.
function classifyTransition (openSlotStart, slotStart, slotMs) {
  if (openSlotStart == null) return 'first'
  if (slotStart === openSlotStart) return 'append'
  if (slotStart === openSlotStart + slotMs) return 'rollover'
  if (slotStart > openSlotStart + slotMs) return 'gap'
  return 'stale'
}

module.exports = {
  assertValidSlotMinutes,
  assertValidWindowMinutes,
  validateTimeSlotTimezone,
  slotStartFor,
  slotOfDay,
  localSlotOfDay,
  classifyTransition
}
