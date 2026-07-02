'use strict'

const errors = require('../errors')
const { validateRrule, validateTimezone } = require('./occurrences')

// Pure validation of schedule input. Throws SCHEDULE_* errors on invalid input.
function validateScheduleInput (input) {
  const { dtstart, dtend, rrule, timezone = 'UTC', minPods, maxPods } = input

  if (minPods == null && maxPods == null) {
    throw new errors.SCHEDULE_INVALID_LIMITS('at least one of minPods/maxPods is required')
  }
  if (minPods != null && minPods < 1) {
    throw new errors.SCHEDULE_INVALID_LIMITS('minPods must be >= 1')
  }
  if (minPods != null && maxPods != null && minPods > maxPods) {
    throw new errors.SCHEDULE_INVALID_LIMITS('minPods must be <= maxPods')
  }
  if (!(new Date(dtend) > new Date(dtstart))) {
    throw new errors.SCHEDULE_INVALID_LIMITS('dtend must be after dtstart')
  }
  try {
    validateTimezone(timezone)
  } catch {
    throw new errors.SCHEDULE_INVALID_TIMEZONE(timezone)
  }
  if (rrule) {
    try {
      validateRrule(rrule)
    } catch {
      throw new errors.SCHEDULE_INVALID_RRULE(rrule)
    }
  }
}

module.exports = { validateScheduleInput }
