'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { startActivities, getServer, mockAuthorizeEndpoint } = require('../helper')
const { randomUUID } = require('node:crypto')
const { MockAgent, setGlobalDispatcher, getGlobalDispatcher } = require('undici')

test('get activities', async (t) => {
  const objectId1 = randomUUID()
  const objectId2 = randomUUID()
  const userId1 = randomUUID()
  const userId2 = randomUUID()

  const activities = [
    {
      userId: userId1,
      objectId: objectId1,
      action: 'create',
      data: { name: 'PLT' },
      username: 'username',
      description: 'description'
    }, {
      userId: userId1,
      objectId: objectId2,
      action: 'delete',
      data: { name: 'PLT' },
      username: 'username',
      description: 'description'
    }, {
      userId: userId2,
      objectId: objectId1,
      action: 'update',
      data: { name: 'PLT' },
      username: 'username',
      description: 'description'
    }, {
      userId: userId2,
      objectId: objectId2,
      action: 'create',
      data: { name: 'PLT' },
      username: 'username',
      description: 'description'
    }
  ]

  await startActivities(t, activities)

  const app = await getServer(t)
  mockAuthorizeEndpoint(null, (method, path, cookie) => {
    assert.equal(cookie, 'AUTH_COOKIE')
    assert.equal(method, 'GET')
    assert.equal(path, '/api/events?limit=10&offset=0')
    return {
      user: {},
      authorized: true
    }
  })
  await app.start()
  {
    const res = await app.inject({
      method: 'GET',
      url: '/api/events',
      headers: {
        cookie: 'auth-cookie-name=AUTH_COOKIE'
      },
      query: {
        limit: 10,
        offset: 0
      }
    })

    const ret = res.json()

    const totalCount = res.headers['x-total-count']
    assert.strictEqual(res.statusCode, 200)
    assert.deepStrictEqual(ret, activities)
    assert.strictEqual(totalCount, String(activities.length * 10))
  }
})

test('should send x-user header to activities', async (t) => {
  let userHeaderChecked = false
  // setup dispatchers
  const agent = new MockAgent()
  const gd = getGlobalDispatcher()
  setGlobalDispatcher(agent)
  t.after(() => {
    setGlobalDispatcher(gd)
  })

  // return test user from /authorize endpoint
  const testUser = {
    id: 123456,
    email: 'foo@bar.com',
    username: 'foobar'
  }
  mockAuthorizeEndpoint(agent, (method, path, cookie) => {
    assert.equal(method, 'GET')
    assert.equal(path, '/api/events?limit=10&offset=0')
    return {
      user: testUser,
      authorized: true
    }
  })

  // mock activities to return []
  agent
    .get('http://activities.plt.local')
    .intercept({
      method: 'GET',
      path: '/events',
      query: {
        limit: 10,
        offset: 0
      }
    }).reply((options) => {
      assert.equal(options.headers['x-user'], JSON.stringify(testUser))
      userHeaderChecked = true
      return {
        statusCode: 200,
        data: [],
        responseOptions: {
          headers: {
            'x-total-count': 0
          }
        }
      }
    })

  const app = await getServer(t)
  await app.start()

  // perform request
  const res = await app.inject({
    method: 'GET',
    url: '/api/events',
    headers: {
      cookie: 'auth-cookie-name=AUTH_COOKIE'
    },
    query: {
      limit: 10,
      offset: 0
    }
  })

  const ret = res.json()
  const totalCount = res.headers['x-total-count']
  assert.strictEqual(res.statusCode, 200)
  assert.deepEqual(ret, [])
  assert.strictEqual(totalCount, '0')
  assert.equal(userHeaderChecked, true)
})
