'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { computeSoftLimits } = require('../../../lib/scheduler/reconcile')
const defaultResolver = require('../../../lib/scheduler/default-resolver')
const { DateTime } = require('luxon')

const at = (iso, zone) => DateTime.fromISO(iso, { zone }).toMillis()

const weekday = (over = {}) => ({
  id: 'w',
  enabled: true,
  dtstart: '2026-01-05T09:00:00',
  dtend: '2026-01-05T17:00:00',
  rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
  timezone: 'Europe/Berlin',
  minPods: 5,
  maxPods: 9,
  ...over
})

test('returns soft when a schedule is active', async () => {
  const now = at('2026-01-06T10:00:00', 'Europe/Berlin')
  const soft = await computeSoftLimits({ applicationId: 'a', schedules: [weekday()], now, resolver: defaultResolver })
  assert.deepEqual(soft, { min: 5, max: 9, scheduleIds: ['w'] })
})

test('returns null when no schedule active', async () => {
  const now = at('2026-01-06T20:00:00', 'Europe/Berlin')
  const soft = await computeSoftLimits({ applicationId: 'a', schedules: [weekday()], now, resolver: defaultResolver })
  assert.equal(soft, null)
})

test('ignores disabled schedules', async () => {
  const now = at('2026-01-06T10:00:00', 'Europe/Berlin')
  const soft = await computeSoftLimits({ applicationId: 'a', schedules: [weekday({ enabled: false })], now, resolver: defaultResolver })
  assert.equal(soft, null)
})

test('uses the provided resolver', async () => {
  const now = at('2026-01-06T10:00:00', 'Europe/Berlin')
  const resolver = async () => ({ minPods: 1, maxPods: 2 })
  const soft = await computeSoftLimits({ applicationId: 'a', schedules: [weekday()], now, resolver })
  assert.deepEqual(soft, { min: 1, max: 2, scheduleIds: ['w'] })
})
