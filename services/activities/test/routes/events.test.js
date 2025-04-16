'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { startActivities } = require('../helper')
const { randomUUID } = require('node:crypto')

test('events simple search', async (t) => {
  const server = await startActivities(t)

  const userId = randomUUID()
  const username = 'testuser'
  const objectId = randomUUID()

  const data = { name: 'PLT' }
  await server.inject({
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

  {
    const res = await server.inject({
      method: 'GET',
      url: '/events',
      query: {
        limit: 10,
        offset: 0,
        'orderby.username': 'asc'
      }
    })

    assert.strictEqual(res.statusCode, 200)
    const events = res.json()
    assert.strictEqual(events.length, 1)
    const event = events[0]
    assert.strictEqual(event.id !== undefined, true)
    assert.strictEqual(event.userId, userId)
    assert.strictEqual(event.username, username)
    assert.strictEqual(event.objectId, objectId)
    assert.strictEqual(event.event, 'create')
    assert.strictEqual(event.success, true)
    assert.strictEqual(event.createdAt !== undefined, true)

    const totalCount = res.headers['x-total-count']
    assert.strictEqual(totalCount, '1')
  }

  {
    // search but nothing found
    const res = await server.inject({
      method: 'GET',
      url: '/events',
      query: {
        limit: 10,
        offset: 0,
        search: 'WRONG SEARCH'
      }
    })

    assert.strictEqual(res.statusCode, 200)
    const events = res.json()
    assert.strictEqual(events.length, 0)

    const totalCount = res.headers['x-total-count']
    assert.strictEqual(totalCount, '0')
  }

  {
    // search and find the user
    const res = await server.inject({
      method: 'GET',
      url: '/events',
      query: {
        limit: 10,
        offset: 0,
        search: 'testuser'
      }
    })

    assert.strictEqual(res.statusCode, 200)
    const events = res.json()
    assert.strictEqual(events.length, 1)

    const totalCount = res.headers['x-total-count']
    assert.strictEqual(totalCount, '1')
  }

  {
    // search and find the event
    const res = await server.inject({
      method: 'GET',
      url: '/events',
      query: {
        limit: 10,
        offset: 0,
        search: 'create'
      }
    })

    assert.strictEqual(res.statusCode, 200)
    const events = res.json()
    assert.strictEqual(events.length, 1)

    const totalCount = res.headers['x-total-count']
    assert.strictEqual(totalCount, '1')
  }
})

test('events search with multiple records', async (t) => {
  const server = await startActivities(t)

  const objectId = randomUUID()
  const userId1 = randomUUID()
  const username1 = 'testuser1'

  const userId2 = randomUUID()
  const username2 = 'testuser2'

  const data = { name: 'PLT' }
  for (let i = 0; i < 10; i++) {
    await server.inject({
      method: 'POST',
      url: '/activities',
      body: {
        userId: userId1,
        username: username1,
        objectId,
        event: 'create',
        data
      }
    })
  }

  for (let i = 0; i < 20; i++) {
    await server.inject({
      method: 'POST',
      url: '/activities',
      body: {
        userId: userId2,
        username: username2,
        objectId,
        event: 'APPLICATION_RESOURCES_UPDATE',
        data
      }
    })
  }

  {
    // We get the first 20 events, offset 0
    const res = await server.inject({
      method: 'GET',
      url: '/events',
      query: {
        limit: 20,
        offset: 0,
        'orderby.username': 'asc'
      }
    })

    assert.strictEqual(res.statusCode, 200)
    const events = res.json()
    assert.strictEqual(events.length, 20)

    const totalCount = res.headers['x-total-count']
    assert.strictEqual(totalCount, '30')
  }
  {
    // We get the other 10 events, offset 20
    const res = await server.inject({
      method: 'GET',
      url: '/events',
      query: {
        limit: 20,
        offset: 20,
        'orderby.username': 'asc'
      }
    })

    assert.strictEqual(res.statusCode, 200)
    const events = res.json()
    assert.strictEqual(events.length, 10)

    const totalCount = res.headers['x-total-count']
    assert.strictEqual(totalCount, '30')
  }

  {
    // search and find the user
    const res = await server.inject({
      method: 'GET',
      url: '/events',
      query: {
        limit: 10,
        offset: 0,
        search: 'testuser1'
      }
    })

    assert.strictEqual(res.statusCode, 200)
    const events = res.json()
    assert.strictEqual(events.length, 10)

    const totalCount = res.headers['x-total-count']
    assert.strictEqual(totalCount, '10')
  }

  {
    // search and match event
    const res = await server.inject({
      method: 'GET',
      url: '/events',
      query: {
        limit: 100,
        offset: 0,
        search: 'update'
      }
    })

    assert.strictEqual(res.statusCode, 200)
    const events = res.json()
    assert.strictEqual(events.length, 20)

    const totalCount = res.headers['x-total-count']
    assert.strictEqual(totalCount, '20')
  }

  {
    // search and match user, limit to 5, checking the total count
    const res = await server.inject({
      method: 'GET',
      url: '/events',
      query: {
        limit: 5,
        offset: 0,
        search: 'testuser1'
      }
    })

    assert.strictEqual(res.statusCode, 200)
    const events = res.json()
    assert.strictEqual(events.length, 5)

    const totalCount = res.headers['x-total-count']
    assert.strictEqual(totalCount, '10')
  }

  {
    // order by created_at
    const resDesc = await server.inject({
      method: 'GET',
      url: '/events',
      query: {
        limit: 200,
        offset: 0,
        search: 'testuser1',
        'orderby.createdAt': 'desc'
      }
    })

    const resAsc = await server.inject({
      method: 'GET',
      url: '/events',
      query: {
        limit: 200,
        offset: 0,
        search: 'testuser1',
        'orderby.createdAt': 'asc'
      }
    })

    const eventsDesc = resDesc.json()
    const eventsAsc = resAsc.json()
    eventsAsc.reverse()

    for (let i = 0; i < eventsAsc.length; i++) {
      assert.deepEqual(eventsDesc[i], eventsAsc[i])
    }
  }

  {
    // filter by specific user
    const res = await server.inject({
      method: 'GET',
      url: '/events',
      query: {
        limit: 10,
        offset: 0,
        userId: userId1
      }
    })

    assert.strictEqual(res.statusCode, 200)
    const events = res.json()
    assert.strictEqual(events.length, 10)
    for (const event of events) {
      assert.strictEqual(event.userId, userId1)
    }

    const totalCount = res.headers['x-total-count']
    assert.strictEqual(totalCount, '10')
  }
})

test('should filter by application id', async (t) => {
  const server = await startActivities(t)

  const userId = randomUUID()
  const username = 'testuser'

  const firstApplicationId = randomUUID()
  const secondApplicationId = randomUUID()

  const data = { name: 'PLT' }
  for (let i = 0; i < 3; i++) {
    await server.inject({
      method: 'POST',
      url: '/activities',
      body: {
        userId,
        username,
        objectId: null,
        applicationId: firstApplicationId,
        event: 'create',
        data
      }
    })
  }

  for (let i = 0; i < 3; i++) {
    await server.inject({
      method: 'POST',
      url: '/activities',
      body: {
        userId,
        username,
        objectId: null,
        applicationId: secondApplicationId,
        event: 'create',
        data
      }
    })
  }

  {
    const res = await server.inject({
      method: 'GET',
      url: '/events'
    })

    assert.strictEqual(res.statusCode, 200)
    assert.equal(res.json().length, 6)
  }
  const res = await server.inject({
    method: 'GET',
    url: `/events?applicationId=${firstApplicationId}`
  })

  const events = res.json()
  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(events.length, 3)
})

test('should return error if no application id or object id is provided', async (t) => {
  const server = await startActivities(t)

  const user = {
    id: randomUUID(),
    username: 'testuser'
  }

  const res = await server.inject({
    method: 'POST',
    url: '/events',
    body: {
      userId: user.id,
      username: user.username,
      objectId: null,
      event: 'fork'
    }
  })
  const payload = res.json()
  assert.equal(res.statusCode, 400)
  assert.deepEqual(payload, {
    statusCode: 400,
    code: 'PLT_ACTIVITIES_MISSING_TARGET',
    error: 'Bad Request',
    message: 'Either applicationId or targetId field must be specified.'
  })
})

test('should return error if object id is provided but not object type', async (t) => {
  const server = await startActivities(t)
  const user = {
    id: randomUUID(),
    username: 'testuser'
  }

  const res = await server.inject({
    method: 'POST',
    url: '/events',
    body: {
      userId: user.id,
      username: user.username,
      objectId: randomUUID(),
      event: 'fork'
    }
  })
  const payload = res.json()
  assert.equal(res.statusCode, 400)
  assert.deepEqual(payload, {
    code: 'PLT_ACTIVITIES_MISSING_TARGET',
    error: 'Bad Request',
    message: 'Either applicationId or targetId field must be specified.',
    statusCode: 400
  })
})

test('should not store unknown event', async (t) => {
  const server = await startActivities(t)
  const user = {
    id: randomUUID(),
    username: 'testuser'
  }

  const objectId = randomUUID()
  const res = await server.inject({
    method: 'POST',
    url: '/events',
    body: {
      userId: user.id,
      username: user.username,
      targetId: objectId,
      applicationId: objectId,
      type: 'FOOBAR_DOSOMETHING'
    }
  })
  const payload = res.json()
  assert.equal(res.statusCode, 400)
  assert.deepEqual(payload, {
    statusCode: 400,
    code: 'PLT_ACTIVITIES_UNKNOWN_EVENT_TYPE',
    error: 'Bad Request',
    message: "Unknown event type 'FOOBAR_DOSOMETHING'."
  })
})

test('store correct event name', async (t) => {
  const server = await startActivities(t)
  const applicationId = randomUUID()

  const res = await server.inject({
    method: 'POST',
    url: '/events',

    body: {
      type: 'APPLICATION_CREATE',
      applicationId,
      data: {
        applicationName: 'test-application-1'
      }
    }
  })
  const postOutput = res.json()
  assert.strictEqual(res.statusCode, 200)
  assert.ok(postOutput.id)
  assert.equal(postOutput.event, 'APPLICATION_CREATE')
  assert.equal(postOutput.success, true)
  assert.equal(
    postOutput.description,
    'created a new application "test-application-1"'
  )
})

test('should store APPLICATION_RESOURCES_UPDATE event', async (t) => {
  const server = await startActivities(t)
  const user = {
    id: randomUUID(),
    username: 'testuser'
  }

  {
    // success
    const objectId = randomUUID()
    const res = await server.inject({
      method: 'POST',
      url: '/events',
      body: {
        userId: user.id,
        username: user.username,
        targetId: objectId,
        applicationId: objectId,
        type: 'APPLICATION_RESOURCES_UPDATE',
        data: {
          applicationName: 'test-application-1',
          resources: { threads: 2, heap: 3 }
        }
      }
    })

    const payload = res.json()
    assert.equal(res.statusCode, 200)
    assert.ok(payload.id)
    assert.equal(payload.userId, user.id)
    assert.equal(payload.username, user.username)
    assert.equal(payload.event, 'APPLICATION_RESOURCES_UPDATE')
    assert.equal(payload.applicationId, objectId)
    assert.equal(payload.objectId, objectId)
    assert.equal(payload.success, true)
    assert.deepEqual(payload.data, { threads: 2, heap: 3 })
    assert.equal(payload.objectType, 'application')
    assert.equal(payload.description, 'updated "test-application-1" application resources')
  }

  {
    // failure
    const objectId = randomUUID()
    const res = await server.inject({
      method: 'POST',
      url: '/events',
      body: {
        userId: user.id,
        username: user.username,
        targetId: objectId,
        applicationId: objectId,
        success: false,
        type: 'APPLICATION_RESOURCES_UPDATE',
        data: {
          applicationName: 'test-application-1',
          resources: { threads: 2, heap: 3 }
        }
      }
    })
    const payload = res.json()
    assert.equal(res.statusCode, 200)
    assert.ok(payload.id)
    assert.equal(payload.userId, user.id)
    assert.equal(payload.username, user.username)
    assert.equal(payload.event, 'APPLICATION_RESOURCES_UPDATE')
    assert.equal(payload.applicationId, objectId)
    assert.equal(payload.objectId, objectId)
    assert.equal(payload.success, false)
    assert.deepEqual(payload.data, { threads: 2, heap: 3 })
    assert.equal(payload.objectType, 'application')
    assert.equal(payload.description, 'updated "test-application-1" application resources')
  }
})
