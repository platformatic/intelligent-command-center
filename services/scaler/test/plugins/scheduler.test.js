'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { buildServer } = require('../helper')
const { DateTime } = require('luxon')

const WEEKDAYS = {
  dtstart: '2026-01-05T09:00:00',
  dtend: '2026-01-05T17:00:00',
  rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
  timezone: 'Europe/Berlin'
}

test('exposes scheduler decorators', async (t) => {
  const server = await buildServer(t)
  t.after(() => server.close())
  const methods = [
    'createSchedule', 'getSchedule', 'listSchedules', 'updateSchedule', 'deleteSchedule',
    'setScheduleLimitResolver', 'reconcileScheduleApplication', 'reconcileSchedules',
    'startScheduler', 'stopScheduler'
  ]
  for (const m of methods) {
    assert.equal(typeof server[m], 'function', m)
  }
})

test('createSchedule persists; listSchedules returns it', async (t) => {
  const server = await buildServer(t)
  t.after(() => server.close())
  const appId = randomUUID()
  const s = await server.createSchedule(appId, { ...WEEKDAYS, name: 'biz', minPods: 5 })
  assert.ok(s.id)
  assert.equal((await server.listSchedules(appId)).length, 1)
})

test('createSchedule rejects invalid input', async (t) => {
  const server = await buildServer(t)
  t.after(() => server.close())
  const appId = randomUUID()
  await assert.rejects(() => server.createSchedule(appId, { ...WEEKDAYS, rrule: 'BOGUS', minPods: 2 }))
})

test('reconcileScheduleApplication writes/clears soft limits', async (t) => {
  const server = await buildServer(t)
  t.after(() => server.close())
  const appId = randomUUID()
  await server.createSchedule(appId, { ...WEEKDAYS, minPods: 5, maxPods: 9 })

  const activeNow = DateTime.fromISO('2026-01-06T10:00:00', { zone: 'Europe/Berlin' }).toMillis()
  await server.reconcileScheduleApplication(appId, activeNow)
  assert.deepEqual(await server.getScalingLimits(appId), { minPods: 5, maxPods: 9 })

  const inactiveNow = DateTime.fromISO('2026-01-06T20:00:00', { zone: 'Europe/Berlin' }).toMillis()
  await server.reconcileScheduleApplication(appId, inactiveNow)
  assert.equal(await server.getScalingLimits(appId), null)
})

test('setScheduleLimitResolver overrides the default', async (t) => {
  const server = await buildServer(t)
  t.after(() => server.close())
  const appId = randomUUID()
  await server.createSchedule(appId, { ...WEEKDAYS, minPods: 5, maxPods: 9 })
  server.setScheduleLimitResolver(async () => ({ minPods: 1, maxPods: 2 }))

  const activeNow = DateTime.fromISO('2026-01-06T10:00:00', { zone: 'Europe/Berlin' }).toMillis()
  await server.reconcileScheduleApplication(appId, activeNow)
  assert.deepEqual(await server.getScalingLimits(appId), { minPods: 1, maxPods: 2 })
})
