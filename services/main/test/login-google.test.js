'use strict'

const { test } = require('node:test')
const { getServer, authorizeEndpoint } = require('./helper')
const assert = require('node:assert')
const { request } = require('undici')
const { MockAgent, setGlobalDispatcher } = require('undici')
const nock = require('nock')

const agent = new MockAgent()
setGlobalDispatcher(agent)

test('should simulate login via Google', async (t) => {
  let stateHasBeenChecked = false
  let stateCookie = null
  const app = await getServer(t)
  const url = await app.start()
  const googleUserData = {
    id: '123456',
    login: 'test-user',
    name: 'Test User',
    picture: 'https://picsum.photos/200',
    email: 'test@user.com'
  }
  // Mock Google OAuth endpoints
  agent
    .get('https://accounts.google.com')
    .intercept({
      method: 'GET',
      path: /o\/oauth2\/v2/
    })
    .reply((options) => {
      const { path } = options

      const state = path.match(/state=(.*)/)[1]
      assert.equal(state, stateCookie)
      stateHasBeenChecked = true
      return {
        statusCode: 302,
        data: {},
        responseOptions: {
          headers: {
            location: `${url}/api/login/google/callback?code=1234567890&state=${state}`
          }
        }
      }
    })

  // Mock Github OAuth endpoint for simple-oauth2 (which does not use undici)
  nock('https://www.googleapis.com')
    .post('/oauth2/v4/token')
    .reply(200, async (url, body) => {
      assert.match(body.toString(), /code=1234567890/)
      return {
        access_token: 'fake-google-access-token'
      }
    })

  // Mock Github Api
  agent
    .get('https://www.googleapis.com')
    .intercept({
      method: 'GET',
      path: '/oauth2/v1/userinfo'
    }).reply((options) => {
      const githubToken = options.headers.authorization.replace('Bearer ', '')
      assert.equal(githubToken, 'fake-google-access-token')
      return {
        statusCode: 200,
        data: googleUserData
      }
    })

  // Mock internal user-manager service
  agent
    .get('http://user-manager.plt.local')
    .intercept({
      method: 'POST',
      path: '/login'
    }).reply((options) => {
      assert.deepEqual(JSON.parse(options.body), {
        email: 'test@user.com',
        externalId: 'google|123456',
        username: 'Test User',
        role: 'user'
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
          email: 'test@user.com',
          externalId: 'google|123456',
          username: 'Test User'
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
          email: 'test@user.com',
          externalId: 'google|123456',
          username: 'Test User',
          image: 'https://picsum.photos/200'
        }
      }
    })

  agent
    .get('http://user-manager.plt.local')
    .intercept({
      method: 'POST',
      path: '/userApiKeys'
    }).reply((options) => {
      const body = JSON.parse(options.body)
      assert.deepEqual(body, {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        key: ''
      })

      return {
        statusCode: 200,
        data: { key: 'foo-api-key' }
      }
    })

  const oauthLoginRes = await request(`${url}/api/login/google`)
  assert.equal(oauthLoginRes.statusCode, 302)

  const googleAuthLocation = oauthLoginRes.headers.location
  const receivedCookie = oauthLoginRes.headers['set-cookie']
  stateCookie = receivedCookie.match(/oauth2-redirect-state=(.*); Path=\/;/)[1]
  const ghAuthorizeReply = await request(googleAuthLocation)

  const callbackUriLocation = ghAuthorizeReply.headers.location
  const callbackUriReply = await request(callbackUriLocation, {
    headers: {
      cookie: receivedCookie
    }
  })
  assert.equal(callbackUriReply.statusCode, 302)
  assert.equal(callbackUriReply.headers.location, 'http://localhost:1234')

  assert.equal(stateHasBeenChecked, true)

  const ICCAuthCookie = callbackUriReply.headers['set-cookie']
  assert.match(ICCAuthCookie, /^auth-cookie-name/)

  // call the /api/me endpoint
  authorizeEndpoint(agent, 'GET', '/api/me')
  const userRes = await request(`${url}/api/me`, {
    headers: {
      cookie: ICCAuthCookie
    }
  })
  assert.equal(userRes.statusCode, 200)
  const user = await userRes.body.json()
  assert.deepEqual(user, {
    email: 'test@user.com',
    externalId: 'google|123456',
    username: 'Test User',
    image: 'https://picsum.photos/200',
    id: '123e4567-e89b-12d3-a456-426614174000'
  })
})
