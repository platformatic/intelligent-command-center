'use strict'

const { test } = require('node:test')
const { getServer, startActivities, generateRandomActivities, mockAuthorizeEndpoint, authorizeEndpoint } = require('./helper')
const assert = require('node:assert')
const { MockAgent, setGlobalDispatcher } = require('undici')

const agent = new MockAgent()
setGlobalDispatcher(agent)

test('return 401 if auth credentials are missing', async (t) => {
  await startActivities(t, generateRandomActivities(1))

  const server = await getServer(t)
  await server.start()

  const res = await server.inject({
    method: 'GET',
    path: '/api/events',
    query: {
      limit: '10',
      offset: '0'
    }
  })
  const json = await res.json()
  assert.equal(res.statusCode, 401)
  assert.deepEqual(json, {
    code: 'PLT_MAIN_MISSING_AUTH_CREDENTIALS',
    error: 'Unauthorized',
    message: 'Missing authorization credentials',
    statusCode: 401
  })
})

test('report user-manager error if its response is not 200', async (t) => {
  const server = await getServer(t)
  await server.start()
  agent
    .get('http://user-manager.plt.local')
    .intercept({
      method: 'POST',
      path: '/authorize'
    }).reply((options) => {
      assert.equal(options.headers.cookie, 'auth-cookie-name=this-is-a-mocked-cookie')
      assert.equal(options.headers['x-random-header'], undefined)
      assert.equal(options.headers['content-type'], 'application/json')
      return {
        statusCode: 400,
        data: {
          statusCode: 400,
          code: 'FST_ERR_FOOBAR_ERROR',
          error: 'Foobar error',
          message: 'This is a foobar error'
        }
      }
    })
  const res = await server.inject({
    method: 'GET',
    path: '/api/events',
    query: {
      limit: '10',
      offset: '0'
    },
    headers: {
      cookie: 'auth-cookie-name=this-is-a-mocked-cookie',
      'x-random-header': 'random-value'
    }
  })
  const payload = res.json()
  assert.equal(res.statusCode, 401)
  assert.deepEqual(payload, {
    statusCode: 401,
    code: 'PLT_MAIN_UNKNOWN_RESPONSE_FROM_AUTHORIZE_ENDPOINT',
    error: 'Unauthorized',
    message: 'Unknown response from /authorize endpoint: {"statusCode":400,"code":"FST_ERR_FOOBAR_ERROR","error":"Foobar error","message":"This is a foobar error"}'
  })
})

test('handle user-manager missing credentials error', async (t) => {
  const server = await getServer(t)
  await server.start()
  agent
    .get('http://user-manager.plt.local')
    .intercept({
      method: 'POST',
      path: '/authorize'
    }).reply(() => {
      return {
        statusCode: 400,
        data: {
          statusCode: 400,
          code: 'PLT_USER_MANAGER_MISSING_CREDENTIALS',
          error: 'Missing credentials due to missing cookie',
          message: 'Missing credentials due to missing cookie'
        }
      }
    })
  const res = await server.inject({
    method: 'GET',
    path: '/api/events',
    query: {
      limit: '10',
      offset: '0'
    },
    headers: {
      cookie: 'auth-cookie-name=this-is-a-mocked-cookie',
      'x-random-header': 'random-value'
    }
  })
  const payload = res.json()
  assert.equal(res.statusCode, 401)
  assert.deepEqual(payload, {
    statusCode: 401,
    code: 'PLT_MAIN_MISSING_AUTH_CREDENTIALS',
    error: 'Unauthorized',
    message: 'Missing authorization credentials'
  })
})

test('return 403 if user is not authorized', async (t) => {
  await startActivities(t, generateRandomActivities(1))

  const server = await getServer(t)
  mockAuthorizeEndpoint(agent, (method, path, cookie) => {
    assert.equal(cookie, 'AUTH_COOKIE')
    return {
      user: {},
      authorized: false
    }
  })
  await server.start()

  const res = await server.inject({
    method: 'GET',
    path: '/api/events',
    headers: {
      cookie: 'auth-cookie-name=AUTH_COOKIE'
    },
    query: {
      limit: '10',
      offset: '0'
    }
  })
  const json = await res.json()
  assert.equal(res.statusCode, 403)
  assert.deepEqual(json, {
    code: 'PLT_MAIN_UNAUTHORIZED',
    error: 'Forbidden',
    message: 'You are not authorized to perform GET /api/events?limit=10&offset=0',
    statusCode: 403
  })
})

test('forward /me to user-manager', async (t) => {
  await startActivities(t, generateRandomActivities(10))

  agent
    .get('http://user-manager.plt.local')
    .intercept({
      method: 'GET',
      path: '/me'
    }).reply((options) => {
      assert.ok(options.headers.cookie.match('auth-cookie-name=this-is-a-mocked-cookie'))
      return {
        statusCode: 200,
        data: {
          foo: 'bar',
          bar: 'baz'
        }
      }
    })
  const server = await getServer(t)
  await server.start()
  authorizeEndpoint(agent, 'GET', '/api/me')
  const res = await server.inject({
    method: 'GET',
    path: '/api/me',
    headers: {
      cookie: 'auth-cookie-name=this-is-a-mocked-cookie'
    }
  })
  const json = await res.json()
  assert.equal(res.statusCode, 200)
  assert.deepEqual(json, {
    foo: 'bar',
    bar: 'baz'
  })
})
test('return activities if logged in', async (t) => {
  await startActivities(t, generateRandomActivities(10))
  authorizeEndpoint(null, 'GET', '/api/events?limit=10&offset=0')

  const server = await getServer(t)
  await server.start()
  const res = await server.inject({
    method: 'GET',
    path: '/api/events',
    query: {
      limit: '10',
      offset: '0'
    },
    headers: {
      cookie: 'auth-cookie-name=AUTH_COOKIE'
    }
  })
  const json = await res.json()
  assert.equal(res.statusCode, 200)
  assert.deepEqual(json.length, 10)
})

test('should start login with google flow without authorization', async (t) => {
  const server = await getServer(t)
  await server.start()
  const res = await server.inject({
    method: 'GET',
    path: '/api/login/google'
  })
  assert.equal(res.statusCode, 302) // should be redirected
  assert.ok(res.headers.location?.startsWith('https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id='))
})

test('should callback the login with google flow without authorization', async (t) => {
  const server = await getServer(t)
  await server.start()
  const res = await server.inject({
    method: 'GET',
    path: '/api/login/google/callback'
  })
  const json = await res.json()
  assert.equal(res.statusCode, 500) // server error, but not auth error
  assert.deepEqual(json, {
    statusCode: 500,
    error: 'Internal Server Error',
    message: 'Invalid state'
  })
})

test('should start login with github flow without authorization', async (t) => {
  const server = await getServer(t)
  await server.start()
  const res = await server.inject({
    method: 'GET',
    path: '/api/login/github'
  })
  assert.equal(res.statusCode, 302) // should be redirected
  assert.ok(res.headers.location?.startsWith('https://github.com/login/oauth/authorize?response_type=code&client_id='))
})

test('should callback the login with github flow without authorization', async (t) => {
  const server = await getServer(t)
  await server.start()
  const res = await server.inject({
    method: 'GET',
    path: '/api/login/github/callback'
  })
  const json = await res.json()
  assert.equal(res.statusCode, 500) // server error, but not auth error
  assert.deepEqual(json, {
    statusCode: 500,
    error: 'Internal Server Error',
    message: 'Invalid state'
  })
})

test('add x-user header to internal service after authorization', async (t) => {
  agent
    .get('http://user-manager.plt.local')
    .intercept({
      method: 'POST',
      path: '/authorize'
    }).reply((options) => {
      assert.equal(options.headers.cookie, 'auth-cookie-name=this-is-a-mocked-cookie')
      return {
        statusCode: 200,
        data: {
          authorized: true,
          user: {
            id: '123456',
            email: 'foo@bar.com',
            externalId: 'gh|123456'
          }
        }
      }
    })

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
      assert.equal(options.headers['x-user'], JSON.stringify({
        id: '123456',
        email: 'foo@bar.com',
        externalId: 'gh|123456'
      }))
      return {
        statusCode: 200,
        data: [{
          id: '123456',
          action: 'tested',
          username: 'foobar'
        }]
      }
    })
  const server = await getServer(t)
  await server.start()
  const res = await server.inject({
    method: 'GET',
    path: '/api/events',
    query: {
      limit: 10,
      offset: 0
    },
    headers: {
      cookie: 'auth-cookie-name=this-is-a-mocked-cookie'
    }
  })
  const output = res.json()
  assert.equal(res.statusCode, 200)
  assert.deepEqual(output[0], {
    id: '123456',
    action: 'tested',
    username: 'foobar'
  })
})
