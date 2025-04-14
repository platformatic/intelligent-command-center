'use strict'

const { test } = require('node:test')
const { getServer, authorizeEndpoint } = require('./helper')
const assert = require('node:assert')
const { request } = require('undici')
const { MockAgent, setGlobalDispatcher } = require('undici')
const nock = require('nock')

const agent = new MockAgent()
setGlobalDispatcher(agent)

test('should simulate login via GitHub', async (t) => {
  let stateHasBeenChecked = false
  let stateCookie = null
  const gitHubUserData = {
    id: '123456',
    login: 'test-user',
    name: 'Test User',
    avatar_url: 'https://picsum.photos/200',
    email: 'test@user.com'
  }
  const app = await getServer(t)
  const url = await app.start()

  // Mock Github OAuth endpoints
  agent
    .get('https://github.com')
    .intercept({
      method: 'GET',
      path: /login\/oauth\/authorize/
    })
    .reply((options) => {
      const { path } = options
      const state = path.match(/state=(.*)/)[1]

      assert.ok(decodeURIComponent(path).includes('scope=user:email')) // checks the scope is passed
      assert.equal(state, stateCookie)
      stateHasBeenChecked = true
      return {
        statusCode: 302,
        data: {},
        responseOptions: {
          headers: {
            location: `${url}/api/login/github/callback?code=1234567890&state=${state}`
          }
        }
      }
    })

  // Mock Github OAuth endpoint for simple-oauth2 (which does not use undici)
  nock('https://github.com')
    .post('/login/oauth/access_token')
    .reply(200, async (url, body) => {
      assert.match(body.toString(), /code=1234567890/)
      return {
        access_token: 'fake-github-access-token'
      }
    })

  // Mock Github Api
  agent
    .get('https://api.github.com')
    .intercept({
      method: 'GET',
      path: '/user'
    }).reply((options) => {
      const githubToken = options.headers.authorization.replace('Bearer ', '')
      assert.equal(githubToken, 'fake-github-access-token')
      return {
        statusCode: 200,
        data: gitHubUserData
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
        externalId: 'gh|123456',
        username: 'test-user',
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
          externalId: 'gh|123456',
          username: 'test-user'
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

  agent
    .get('http://user-manager.plt.local')
    .intercept({
      method: 'GET',
      path: '/me'
    }).reply((options) => {
      assert.ok(options.headers.cookie.match('auth-cookie-name'))
      return {
        statusCode: 200,
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@user.com',
          externalId: 'gh|123456',
          username: 'test-user',
          role: 'user',
          image: 'https://picsum.photos/200'
        }
      }
    })

  const oauthLoginRes = await request(`${url}/api/login/github`)
  assert.equal(oauthLoginRes.statusCode, 302)

  const ghAuthorizeLocation = oauthLoginRes.headers.location
  const receivedCookie = oauthLoginRes.headers['set-cookie']
  stateCookie = receivedCookie.match(/oauth2-redirect-state=(.*); Path=\/;/)[1]
  const ghAuthorizeReply = await request(ghAuthorizeLocation)

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
  const user = await userRes.body.json()
  assert.equal(userRes.statusCode, 200)
  assert.deepEqual(user, {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@user.com',
    externalId: 'gh|123456',
    username: 'test-user',
    role: 'user',
    image: 'https://picsum.photos/200'
  })
})

test('should call GitHub\'s user/email endpoint if no email is provided', async (t) => {
  let stateHasBeenChecked = false
  let stateCookie = null
  const gitHubUserData = {
    id: '123456',
    login: 'test-user',
    name: 'Test User',
    avatar_url: 'https://picsum.photos/200'
  }
  const app = await getServer(t)
  const url = await app.start()

  // Mock Github OAuth endpoints
  agent
    .get('https://github.com')
    .intercept({
      method: 'GET',
      path: /login\/oauth\/authorize/
    })
    .reply((options) => {
      const { path } = options
      const state = path.match(/state=(.*)/)[1]

      assert.ok(decodeURIComponent(path).includes('scope=user:email')) // checks the scope is passed
      assert.equal(state, stateCookie)
      stateHasBeenChecked = true
      return {
        statusCode: 302,
        data: {},
        responseOptions: {
          headers: {
            location: `${url}/api/login/github/callback?code=1234567890&state=${state}`
          }
        }
      }
    })

  // Mock Github OAuth endpoint for simple-oauth2 (which does not use undici)
  nock('https://github.com')
    .post('/login/oauth/access_token')
    .reply(200, async (url, body) => {
      assert.match(body.toString(), /code=1234567890/)
      return {
        access_token: 'fake-github-access-token'
      }
    })

  // Mock Github Api
  agent
    .get('https://api.github.com')
    .intercept({
      method: 'GET',
      path: '/user'
    }).reply((options) => {
      const githubToken = options.headers.authorization.replace('Bearer ', '')
      assert.equal(githubToken, 'fake-github-access-token')
      return {
        statusCode: 200,
        data: gitHubUserData
      }
    })

  // Mock Github Api
  agent
    .get('https://api.github.com')
    .intercept({
      method: 'GET',
      path: '/user/emails'
    }).reply((options) => {
      const githubToken = options.headers.authorization.replace('Bearer ', '')
      assert.equal(githubToken, 'fake-github-access-token')
      return {
        statusCode: 200,
        data: [
          {
            email: 'secondary@gmail.com',
            primary: false,
            verified: true,
            visibility: 'public'
          },
          {
            email: 'primary@gmail.com',
            primary: true,
            verified: true,
            visibility: null
          }
        ]
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
        email: 'primary@gmail.com',
        externalId: 'gh|123456',
        username: 'test-user',
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
          email: 'primary@gmail.com',
          externalId: 'gh|123456',
          username: 'test-user'
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

  agent
    .get('http://user-manager.plt.local')
    .intercept({
      method: 'GET',
      path: '/me'
    }).reply((options) => {
      assert.ok(options.headers.cookie.match('auth-cookie-name'))
      return {
        statusCode: 200,
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@user.com',
          externalId: 'gh|123456',
          username: 'test-user',
          role: 'user',
          image: 'https://picsum.photos/200'
        }
      }
    })

  const oauthLoginRes = await request(`${url}/api/login/github`)
  assert.equal(oauthLoginRes.statusCode, 302)

  const ghAuthorizeLocation = oauthLoginRes.headers.location
  const receivedCookie = oauthLoginRes.headers['set-cookie']
  stateCookie = receivedCookie.match(/oauth2-redirect-state=(.*); Path=\/;/)[1]
  const ghAuthorizeReply = await request(ghAuthorizeLocation)

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

  authorizeEndpoint(agent, 'GET', '/api/me')
  // call the /me endpoint
  const userRes = await request(`${url}/api/me`, {
    headers: {
      cookie: ICCAuthCookie
    }
  })
  assert.equal(userRes.statusCode, 200)
  const user = await userRes.body.json()
  assert.deepEqual(user, {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@user.com',
    externalId: 'gh|123456',
    username: 'test-user',
    role: 'user',
    image: 'https://picsum.photos/200'
  })
})
