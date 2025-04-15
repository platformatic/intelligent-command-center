'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { startActivities } = require('../helper')
const { randomUUID } = require('node:crypto')

test('should create and retrieve activities', async (t) => {
  const server = await startActivities(t)

  {
    const res = await server.inject({
      method: 'GET',
      url: '/activities'
    })

    assert.strictEqual(res.statusCode, 200)
    assert.deepStrictEqual(res.json(), [])
  }

  const objectId = randomUUID()
  const userId = randomUUID()
  const username = 'testuser'
  const data = { name: 'PLT' }
  let id, createdAt
  {
    const res = await server.inject({
      method: 'POST',
      url: '/activities',
      body: {
        userId,
        username,
        objectId,
        event: 'create',
        data
      }
    })

    assert.strictEqual(res.statusCode, 200)
    const event = res.json()
    assert.strictEqual(event.id !== undefined, true)
    assert.strictEqual(event.userId, userId)
    assert.strictEqual(event.username, username)
    assert.strictEqual(event.objectId, objectId)
    assert.strictEqual(event.event, 'create')
    assert.strictEqual(event.createdAt !== undefined, true)
    id = event.id
    createdAt = event.createdAt
  }

  {
    const res = await server.inject({
      method: 'GET',
      url: '/activities'
    })

    assert.strictEqual(res.statusCode, 200)
    const events = res.json()
    assert.strictEqual(events.length, 1)
    const event = events[0]
    assert.strictEqual(event.id, id)
    assert.strictEqual(event.userId, userId)
    assert.strictEqual(event.username, username)
    assert.strictEqual(event.objectId, objectId)
    assert.strictEqual(event.event, 'create')
    assert.strictEqual(event.createdAt, createdAt)
  }
})
