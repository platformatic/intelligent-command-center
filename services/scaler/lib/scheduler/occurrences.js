'use strict'

const { RRule } = require('rrule')
const { DateTime, IANAZone } = require('luxon')

function validateTimezone (timezone) {
  if (!IANAZone.isValidZone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`)
  }
}

function validateRrule (rrule) {
  let opts
  try {
    opts = RRule.parseString(rrule)
  } catch (err) {
    throw new Error(`Invalid RRULE: ${rrule}`)
  }
  if (opts == null || opts.freq == null) {
    throw new Error(`Invalid RRULE: ${rrule}`)
  }
}

// Wall-clock components of an instant (ms) in a zone, as a naive UTC Date (rrule convention).
function toNaiveUTC (ms, zone) {
  const dt = DateTime.fromMillis(ms, { zone })
  return new Date(Date.UTC(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute, dt.second))
}

// Inverse: interpret a naive-UTC Date's wall-clock components as local time in `zone` → real ms.
function fromNaiveUTC (naive, zone) {
  return DateTime.fromObject({
    year: naive.getUTCFullYear(),
    month: naive.getUTCMonth() + 1,
    day: naive.getUTCDate(),
    hour: naive.getUTCHours(),
    minute: naive.getUTCMinutes(),
    second: naive.getUTCSeconds()
  }, { zone }).toMillis()
}

function durationMs (schedule) {
  return +new Date(schedule.dtend) - +new Date(schedule.dtstart)
}

// True if `now` (ms) falls inside any occurrence window [occStart, occStart + duration).
function isActiveAt (schedule, now) {
  const dur = durationMs(schedule)
  const startMs = +new Date(schedule.dtstart)

  if (!schedule.rrule) {
    return now >= startMs && now < startMs + dur
  }

  const zone = schedule.timezone || 'UTC'
  const rule = new RRule({
    ...RRule.parseString(schedule.rrule),
    dtstart: toNaiveUTC(startMs, zone)
  })

  // Candidate occurrences could have started up to `dur` before now.
  const nowNaive = toNaiveUTC(now, zone)
  const fromNaive = new Date(+nowNaive - dur)
  const candidates = rule.between(fromNaive, nowNaive, true)

  for (const occNaive of candidates) {
    const occStart = fromNaiveUTC(occNaive, zone)
    if (now >= occStart && now < occStart + dur) return true
  }
  return false
}

module.exports = { isActiveAt, validateRrule, validateTimezone, durationMs }
