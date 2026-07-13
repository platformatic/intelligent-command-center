'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { buildServer } = require('../helper')

const DAY = 24 * 60 * 60 * 1000

// Seed the Valkey candidate blob the accept flow reads from.
function seedCandidates (server, appId, candidates) {
  return server.store.saveSuggestions(appId, { suggestions: candidates })
}

// A candidate in the shape buildWindowSuggestions emits: identity + value at top, display under details.
const candidate = (slotOfDay, scopeKeys, value, when, { baseline = value, confidence = 1, effects = [] } = {}) =>
  ({ slotOfDay, scopeKeys, value, details: { when, baseline, confidence, effects } })

test('accept → materialize → resolve most-specific → cancel', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()
  const horizon = Number(server.env.PLT_SCALER_PATTERN_PREDICTION_DAYS)
  const now = Date.now()

  // Candidates for slot 1 (00:00–01:00): a baseline and an "every Friday" combination.
  await seedCandidates(server, appId, [
    candidate(1, [], 5, 'Every day'),
    candidate(1, ['dow|5'], 12, 'Every Friday', { baseline: 5, confidence: 0.9, effects: [{ id: 'dow|5', when: 'Every Friday', delta: 7, confidence: 0.9, included: true }] })
  ])

  // Accept the baseline → fires every day → one scheduled row per horizon day.
  const base = await server.acceptSuggestion(appId, { slotOfDay: 1, scopeKeys: [] })
  assert.equal(base.status, 'active')
  assert.equal(base.value, 5)

  let slots = await server.getScheduledSlots(appId, now, now + horizon * DAY)
  assert.equal(slots.length, horizon, 'baseline fills every horizon day')
  assert.ok(slots.every((s) => s.value === 5 && s.slotOfDay === 1))

  // Accept the Friday combination → Fridays become 12 (more specific), other days stay 5.
  await server.acceptSuggestion(appId, { slotOfDay: 1, scopeKeys: ['dow|5'] })
  slots = await server.getScheduledSlots(appId, now, now + horizon * DAY)
  const fri = slots.filter((s) => new Date(s.slotStart).getUTCDay() === 5)
  const nonFri = slots.filter((s) => new Date(s.slotStart).getUTCDay() !== 5)
  assert.ok(fri.length > 0 && fri.every((s) => s.value === 12), 'Fridays resolve to the more-specific 12')
  assert.ok(nonFri.every((s) => s.value === 5), 'other days stay at the baseline 5')

  // Two active accepted suggestions now.
  const active = await server.listSuggestions(appId, { status: 'active' })
  assert.equal(active.length, 2)

  // Cancel the Friday one → it becomes history, Fridays fall back to the baseline 5.
  const friRow = active.find((s) => s.scopeKeys.length === 1)
  await server.cancelSuggestion(friRow.id)
  const cancelled = (await server.listSuggestions(appId, { status: 'cancelled' }))
  assert.equal(cancelled.length, 1)
  slots = await server.getScheduledSlots(appId, now, now + horizon * DAY)
  assert.ok(slots.every((s) => s.value === 5), 'after cancel, every day falls back to baseline')
  assert.equal(slots.length, horizon)
})

test('HTTP: accept / list accepted / scheduled / cancel', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()
  await seedCandidates(server, appId, [
    candidate(2, [], 6, 'Every day')
  ])

  const accept = await server.inject({
    method: 'POST',
    url: `/applications/${appId}/suggestions/accept`,
    payload: { slotOfDay: 2, scopeKeys: [] }
  })
  assert.equal(accept.statusCode, 200)
  const row = accept.json()
  assert.equal(row.value, 6)
  assert.equal(row.status, 'active')

  const listed = await server.inject({ method: 'GET', url: `/applications/${appId}/suggestions/accepted?status=active` })
  assert.equal(listed.statusCode, 200)
  assert.equal(listed.json().length, 1)

  const scheduled = await server.inject({ method: 'GET', url: `/applications/${appId}/scheduled` })
  assert.equal(scheduled.statusCode, 200)
  assert.ok(scheduled.json().length > 0 && scheduled.json()[0].value === 6)

  const cancel = await server.inject({ method: 'POST', url: `/applications/${appId}/suggestions/${row.id}/cancel` })
  assert.equal(cancel.statusCode, 200)
  assert.equal(cancel.json().status, 'cancelled')

  const afterCancel = await server.inject({ method: 'GET', url: `/applications/${appId}/scheduled` })
  assert.equal(afterCancel.json().length, 0, 'no scheduled slots after the only suggestion is cancelled')
})

test('tick enforces the suggestion floor at `now`; manual schedule wins', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()
  const NOW = Date.UTC(2025, 0, 10, 0, 30) // Fri 2025-01-10, 00:30 → slot_of_day 1 (00:00–01:00)

  await seedCandidates(server, appId, [
    candidate(1, [], 6, 'Every day'),
    candidate(1, ['dow|5'], 12, 'Every Friday', { baseline: 6, confidence: 0.9, effects: [{ id: 'dow|5', when: 'Every Friday', delta: 6, confidence: 0.9, included: true }] })
  ])

  // Only the baseline accepted → resolves at `now` to 6.
  await server.acceptSuggestion(appId, { slotOfDay: 1, scopeKeys: [] })
  await server.reconcileScheduleApplication(appId, NOW)
  assert.equal((await server.store.getSoftLimits(appId)).min, 6)

  // Accept the Friday combination → at `now` (a Friday) the more-specific 12 wins.
  await server.acceptSuggestion(appId, { slotOfDay: 1, scopeKeys: ['dow|5'] })
  await server.reconcileScheduleApplication(appId, NOW)
  assert.equal((await server.store.getSoftLimits(appId)).min, 12)

  // A manual schedule active at `now` overrides the suggestion (manual wins).
  await server.createSchedule(appId, {
    dtstart: new Date(NOW - 60000).toISOString(),
    dtend: new Date(NOW + 3600000).toISOString(),
    minPods: 20
  })
  await server.reconcileScheduleApplication(appId, NOW)
  assert.equal((await server.store.getSoftLimits(appId)).min, 20, 'manual floor wins over the suggestion')

  // Off-slot instant (12:30 → slot 13) with no suggestion/manual there → no soft floor.
  await server.reconcileScheduleApplication(appId, Date.UTC(2025, 0, 10, 12, 30))
  assert.equal(await server.store.getSoftLimits(appId), null)
})

test('accept is idempotent on identity and re-accept refreshes value', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()
  await seedCandidates(server, appId, [
    candidate(3, ['dom|15'], 9, 'On the 15th', { baseline: 4, confidence: 0.8 })
  ])
  const first = await server.acceptSuggestion(appId, { slotOfDay: 3, scopeKeys: ['dom|15'] })

  // Re-seed the candidate with a new value, re-accept → same row, updated value, still one active.
  await seedCandidates(server, appId, [
    candidate(3, ['dom|15'], 14, 'On the 15th', { baseline: 4, confidence: 0.8 })
  ])
  const second = await server.acceptSuggestion(appId, { slotOfDay: 3, scopeKeys: ['dom|15'] })
  assert.equal(second.id, first.id, 'same identity → same row')
  assert.equal(second.value, 14)
  const active = await server.listSuggestions(appId, { status: 'active' })
  assert.equal(active.length, 1)
})
