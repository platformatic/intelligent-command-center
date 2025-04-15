'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { startActivities } = require('../helper')
const { randomUUID } = require('node:crypto')

test('should get activities\' user list ordered by username', async (t) => {
  const users = [
    randomUUID(),
    randomUUID(),
    randomUUID(),
    randomUUID()
  ]
  const activities = [
    {
      userId: users[0],
      username: 'user 0',
      event: 'foobar',
      objectId: randomUUID()
    },
    {
      userId: users[1],
      username: 'user 1',
      event: 'foobar',
      objectId: randomUUID()
    },
    {
      userId: users[2],
      username: 'user 2',
      event: 'foobar',
      objectId: randomUUID()
    }
  ]
  const server = await startActivities(t, {}, activities)

  const res = await server.inject({
    method: 'GET',
    url: '/users'
  })

  assert.strictEqual(res.statusCode, 200)
  assert.deepStrictEqual(res.json(), [
    { id: users[0], username: 'user 0' },
    { id: users[1], username: 'user 1' },
    { id: users[2], username: 'user 2' }
  ])
})

test('return empty user list if no activities', async (t) => {
  const server = await startActivities(t, {})

  const res = await server.inject({
    method: 'GET',
    url: '/users'
  })

  assert.strictEqual(res.statusCode, 200)
  assert.deepStrictEqual(res.json(), [])
})
