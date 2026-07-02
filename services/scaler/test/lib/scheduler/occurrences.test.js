'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { isActiveAt, validateRrule, validateTimezone } = require('../../../lib/scheduler/occurrences')
const { DateTime } = require('luxon')

// Helper: ms for a wall-clock time in a zone
const at = (iso, zone) => DateTime.fromISO(iso, { zone }).toMillis()

test('one-time window (no rrule) active only inside [dtstart, dtend)', () => {
  const s = { dtstart: '2026-11-27T00:00:00-05:00', dtend: '2026-11-28T00:00:00-05:00', rrule: null, timezone: 'America/New_York' }
  assert.equal(isActiveAt(s, at('2026-11-27T12:00:00', 'America/New_York')), true)
  assert.equal(isActiveAt(s, at('2026-11-26T23:59:59', 'America/New_York')), false)
  assert.equal(isActiveAt(s, at('2026-11-28T00:00:01', 'America/New_York')), false)
})

test('weekly weekday window active Tue 10:00, inactive Sat / off-hours', () => {
  const s = {
    dtstart: '2026-01-05T09:00:00',
    dtend: '2026-01-05T17:00:00',
    rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
    timezone: 'Europe/Berlin'
  }
  assert.equal(isActiveAt(s, at('2026-01-06T10:00:00', 'Europe/Berlin')), true) // Tue 10:00
  assert.equal(isActiveAt(s, at('2026-01-06T18:00:00', 'Europe/Berlin')), false) // Tue 18:00
  assert.equal(isActiveAt(s, at('2026-01-10T10:00:00', 'Europe/Berlin')), false) // Sat
})

test('weekday window keeps local 09:00 across DST change', () => {
  const s = {
    dtstart: '2026-01-05T09:00:00',
    dtend: '2026-01-05T17:00:00',
    rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
    timezone: 'Europe/Berlin'
  }
  // After Europe/Berlin DST starts (late March 2026): a weekday at local 10:00 still active
  assert.equal(isActiveAt(s, at('2026-04-01T10:00:00', 'Europe/Berlin')), true)
  assert.equal(isActiveAt(s, at('2026-04-01T08:00:00', 'Europe/Berlin')), false)
})

test('monthly last-day BYMONTHDAY=-1', () => {
  const s = {
    dtstart: '2026-01-31T22:00:00',
    dtend: '2026-02-01T01:00:00',
    rrule: 'FREQ=MONTHLY;BYMONTHDAY=-1',
    timezone: 'UTC'
  }
  assert.equal(isActiveAt(s, at('2026-02-28T23:00:00', 'UTC')), true) // Feb last day
  assert.equal(isActiveAt(s, at('2026-02-15T23:00:00', 'UTC')), false)
})

test('validateRrule throws on garbage, passes on valid', () => {
  assert.throws(() => validateRrule('NOT-A-RULE'))
  assert.doesNotThrow(() => validateRrule('FREQ=WEEKLY;BYDAY=MO'))
})

test('validateTimezone throws on bad zone', () => {
  assert.throws(() => validateTimezone('Mars/Phobos'))
  assert.doesNotThrow(() => validateTimezone('Europe/Berlin'))
})
