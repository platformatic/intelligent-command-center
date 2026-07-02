'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { DateTime } = require('luxon')
const {
  assertValidSlotMinutes,
  assertValidWindowMinutes,
  validateTimeSlotTimezone,
  slotStartFor,
  slotOfDay,
  localSlotOfDay,
  classifyTransition
} = require('../../../lib/time-slot-stats/time-slot')

test('assertValidSlotMinutes accepts divisors of 60, rejects others', () => {
  for (const n of [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60]) {
    assert.doesNotThrow(() => assertValidSlotMinutes(n))
  }
  for (const n of [0, 7, 8, 9, 11, 61, 1.5, -1]) {
    assert.throws(() => assertValidSlotMinutes(n))
  }
})

test('validateTimeSlotTimezone accepts IANA zones, rejects junk', () => {
  assert.doesNotThrow(() => validateTimeSlotTimezone('UTC'))
  assert.doesNotThrow(() => validateTimeSlotTimezone('Europe/Berlin'))
  assert.throws(() => validateTimeSlotTimezone('Mars/Phobos'))
})

test('slotStartFor floors to the slot boundary', () => {
  const slotMs = 5 * 60 * 1000
  const t = Date.UTC(2026, 0, 1, 17, 3, 30)
  assert.equal(slotStartFor(t, slotMs), Date.UTC(2026, 0, 1, 17, 0, 0))
})

test('slotOfDay is 1-based UTC index', () => {
  const slotMs = 5 * 60 * 1000
  assert.equal(slotOfDay(Date.UTC(2026, 0, 1, 0, 0, 0), slotMs), 1)
  assert.equal(slotOfDay(Date.UTC(2026, 0, 1, 0, 5, 0), slotMs), 2)
  assert.equal(slotOfDay(Date.UTC(2026, 0, 1, 23, 55, 0), slotMs), 288)
})

test('localSlotOfDay reflects local wall-clock', () => {
  const slotMs = 5 * 60 * 1000
  // 00:00 UTC = 01:00 in Europe/Berlin (winter, UTC+1) → slot 13 (12 full 5-min slots before)
  const utcMidnight = DateTime.fromISO('2026-01-01T00:00:00', { zone: 'UTC' }).toMillis()
  assert.equal(slotOfDay(utcMidnight, slotMs), 1)
  assert.equal(localSlotOfDay(utcMidnight, slotMs, 'Europe/Berlin'), 13)
})

test('classifyTransition returns first/append/rollover/gap/stale', () => {
  const slotMs = 5 * 60 * 1000
  assert.equal(classifyTransition(null, 1000, slotMs), 'first')
  assert.equal(classifyTransition(1000, 1000, slotMs), 'append')
  assert.equal(classifyTransition(1000, 1000 + slotMs, slotMs), 'rollover')
  assert.equal(classifyTransition(1000, 1000 + 2 * slotMs, slotMs), 'gap')
  assert.equal(classifyTransition(1000 + slotMs, 1000, slotMs), 'stale')
})

test('assertValidWindowMinutes: multiple of slot, > slot, divides 1440', () => {
  for (const n of [10, 15, 20, 30, 60]) {
    assert.doesNotThrow(() => assertValidWindowMinutes(n, 5))
  }
  // 5 == slot; 3 < slot; 7 not a multiple of 5; 25/50 are multiples of 5 but don't divide 1440; 7.5 non-integer
  for (const n of [5, 3, 7, 25, 50, 7.5]) {
    assert.throws(() => assertValidWindowMinutes(n, 5))
  }
})
