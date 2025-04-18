'use strict'

const { test } = require('node:test')
const { getServer, mockAuthorizeEndpoint } = require('./helper')
const assert = require('node:assert')
const { request } = require('undici')
const { MockAgent, setGlobalDispatcher } = require('undici')

const agent = new MockAgent()
setGlobalDispatcher(agent)

test('demo login should be disabled', async (t) => {
  const app = await getServer(t, {
    DEMO_LOGIN: 'false'
  })
  const url = await app.start()

  const demoLoginRes = await request(`${url}/api/login/demo`)
  const json = await demoLoginRes.body.json()
  assert.equal(demoLoginRes.statusCode, 400)
  assert.deepEqual(json, {
    statusCode: 400,
    code: 'PLT_MAIN_DEMO_LOGIN_ERROR',
    error: 'Bad Request',
    message: 'Please login with Google or GitHub.'
  })
})

test('should enable demo login', async (t) => {
  let loginActivitySaved = false
  const app = await getServer(t, {
    DEMO_LOGIN: 'true',
    VITE_SUPPORTED_LOGINS: 'demo'
  })
  const url = await app.start()

  // Mock internal user-manager service
  agent
    .get('http://user-manager.plt.local')
    .intercept({
      method: 'POST',
      path: '/login'
    }).reply((options) => {
      assert.deepEqual(JSON.parse(options.body), {
        email: 'demo@platformatic.dev',
        externalId: 'plt|12345',
        username: 'test-user',
        role: 'admin'
      })
      return {
        statusCode: 200,
        responseOptions: {
          headers: {
            'set-cookie': 'auth-cookie-name=fake-cookie;'
          }
        },
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'demo@platformatic.dev',
          externalId: 'gh|123456',
          username: 'test-user',
          role: 'admin'
        }
      }
    })

  agent
    .get('http://user-manager.plt.local')
    .intercept({
      method: 'GET',
      path: '/me'
    }).reply((options) => {
      assert.ok(options.headers.cookie.match('auth-cookie-name='))
      return {
        statusCode: 200,
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'demo@platformatic.dev',
          externalId: 'plt|12345',
          username: 'test-user',
          image: 'https://avatar.iran.liara.run/public',
          role: 'admin'
        }
      }
    })

  agent
    .get('http://activities.plt.local')
    .intercept({
      method: 'POST',
      path: '/events'
    }).reply((options) => {
      const body = JSON.parse(options.body)
      assert.equal(body.type, 'USER_LOGIN')
      assert.equal(body.userId, '123e4567-e89b-12d3-a456-426614174000')
      assert.equal(body.targetId, '123e4567-e89b-12d3-a456-426614174000')
      assert.equal(body.username, 'test-user')
      loginActivitySaved = true
      return {
        statusCode: 200,
        data: {}
      }
    })

  const demoLoginRes = await request(`${url}/api/login/demo`)
  assert.equal(demoLoginRes.statusCode, 302)

  const ICCAuthCookie = demoLoginRes.headers['set-cookie']
  assert.match(ICCAuthCookie, /^auth-cookie-name/)
  assert.equal(ICCAuthCookie, 'auth-cookie-name=fake-cookie; Path=/; HttpOnly; SameSite=Lax')
  mockAuthorizeEndpoint(agent, (method, url, cookie) => {
    assert.equal(method, 'GET')
    assert.equal(url, '/api/me')
    assert.ok(cookie)
    return {
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'demo@platformatic.dev',
        externalId: 'plt|12345',
        username: 'test-user',
        role: 'admin'
      },
      authorized: true
    }
  })
  // call the /me endpoint
  const userRes = await request(`${url}/api/me`, {
    headers: {
      cookie: ICCAuthCookie
    }
  })
  const user = await userRes.body.json()
  assert.equal(userRes.statusCode, 200)
  assert.deepEqual(user, {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'demo@platformatic.dev',
    externalId: 'plt|12345',
    username: 'test-user',
    image: 'https://avatar.iran.liara.run/public',
    role: 'admin'
  })
  assert.ok(loginActivitySaved)
})
