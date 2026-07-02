'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { buildServer } = require('../helper')

test('POST creates, GET lists, GET by id, PATCH, DELETE', async (t) => {
  const server = await buildServer(t)
  t.after(() => server.close())
  const appId = randomUUID()

  const created = await server.inject({
    method: 'POST',
    url: `/applications/${appId}/schedules`,
    payload: {
      name: 'biz',
      dtstart: '2026-01-05T09:00:00Z',
      dtend: '2026-01-05T17:00:00Z',
      rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
      timezone: 'Europe/Berlin',
      minPods: 5
    }
  })
  assert.equal(created.statusCode, 200)
  const id = created.json().id
  assert.ok(id)

  const list = await server.inject({ method: 'GET', url: `/applications/${appId}/schedules` })
  assert.equal(list.json().length, 1)

  const one = await server.inject({ method: 'GET', url: `/schedules/${id}` })
  assert.equal(one.json().id, id)

  const patched = await server.inject({ method: 'PATCH', url: `/schedules/${id}`, payload: { minPods: 6 } })
  assert.equal(patched.statusCode, 200)
  assert.equal(patched.json().minPods, 6)

  const del = await server.inject({ method: 'DELETE', url: `/schedules/${id}` })
  assert.equal(del.statusCode, 200)
})

test('POST with bad rrule → 400', async (t) => {
  const server = await buildServer(t)
  t.after(() => server.close())
  const res = await server.inject({
    method: 'POST',
    url: `/applications/${randomUUID()}/schedules`,
    payload: { dtstart: '2026-01-05T09:00:00Z', dtend: '2026-01-05T17:00:00Z', rrule: 'BOGUS', minPods: 2 }
  })
  assert.equal(res.statusCode, 400)
})

test('GET missing schedule → 404', async (t) => {
  const server = await buildServer(t)
  t.after(() => server.close())
  const res = await server.inject({ method: 'GET', url: `/schedules/${randomUUID()}` })
  assert.equal(res.statusCode, 404)
})
