'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { buildServer } = require('../helper')
const { DateTime } = require('luxon')

test('active schedule narrows effective limits; expiry reverts to hard', async (t) => {
  const server = await buildServer(t)
  t.after(() => server.close())
  const appId = randomUUID()

  // Hard limits 1..10
  await server.platformatic.entities.applicationScaleConfig.save({ input: { applicationId: appId, minPods: 1, maxPods: 10 } })

  // Soft schedule: weekdays 09:00-17:00 Berlin, min 5 max 8
  await server.createSchedule(appId, {
    dtstart: '2026-01-05T09:00:00',
    dtend: '2026-01-05T17:00:00',
    rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
    timezone: 'Europe/Berlin',
    minPods: 5,
    maxPods: 8
  })

  // Inside the window
  const inWindow = DateTime.fromISO('2026-01-06T10:00:00', { zone: 'Europe/Berlin' }).toMillis()
  await server.reconcileScheduleApplication(appId, inWindow)
  assert.deepEqual(await server.getScalingLimits(appId), { minPods: 5, maxPods: 8 })

  // Outside the window → reverts to hard
  const outWindow = DateTime.fromISO('2026-01-06T20:00:00', { zone: 'Europe/Berlin' }).toMillis()
  await server.reconcileScheduleApplication(appId, outWindow)
  assert.deepEqual(await server.getScalingLimits(appId), { minPods: 1, maxPods: 10 })
})

test('soft min above hard max is clamped to hard max', async (t) => {
  const server = await buildServer(t)
  t.after(() => server.close())
  const appId = randomUUID()
  await server.platformatic.entities.applicationScaleConfig.save({ input: { applicationId: appId, minPods: 1, maxPods: 3 } })
  await server.createSchedule(appId, {
    dtstart: '2026-01-05T00:00:00',
    dtend: '2026-01-06T00:00:00',
    rrule: 'FREQ=DAILY',
    timezone: 'UTC',
    minPods: 9
  })
  await server.reconcileScheduleApplication(appId, Date.UTC(2026, 0, 10, 12, 0, 0))
  assert.deepEqual(await server.getScalingLimits(appId), { minPods: 3, maxPods: 3 })
})
