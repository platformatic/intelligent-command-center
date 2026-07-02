'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { validateScheduleInput } = require('../../../lib/scheduler/validate')

const base = { dtstart: '2026-01-05T09:00:00Z', dtend: '2026-01-05T17:00:00Z', minPods: 2 }

test('valid input passes (with and without rrule)', () => {
  assert.doesNotThrow(() => validateScheduleInput({ ...base, rrule: 'FREQ=WEEKLY;BYDAY=MO', timezone: 'Europe/Berlin' }))
  assert.doesNotThrow(() => validateScheduleInput({ ...base, rrule: null }))
})

test('rejects missing limits', () => {
  assert.throws(() => validateScheduleInput({ dtstart: base.dtstart, dtend: base.dtend }))
})

test('rejects minPods < 1', () => {
  assert.throws(() => validateScheduleInput({ ...base, minPods: 0 }))
})

test('rejects min > max', () => {
  assert.throws(() => validateScheduleInput({ ...base, minPods: 9, maxPods: 2 }))
})

test('rejects dtend <= dtstart', () => {
  assert.throws(() => validateScheduleInput({ dtstart: base.dtend, dtend: base.dtstart, minPods: 2 }))
})

test('rejects bad rrule', () => {
  assert.throws(() => validateScheduleInput({ ...base, rrule: 'BOGUS' }))
})

test('rejects bad timezone', () => {
  assert.throws(() => validateScheduleInput({ ...base, timezone: 'Mars/Phobos' }))
})
