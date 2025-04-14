'use strict'

const { test } = require('node:test')
const { getServer } = require('./helper')
const assert = require('node:assert')
const { MockAgent, setGlobalDispatcher } = require('undici')

const agent = new MockAgent()
setGlobalDispatcher(agent)

test('generic login error from user-manager', async (t) => {
  const app = await getServer(t)
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
        statusCode: 500,
        data: {
          code: 'PLT_USER_MANAGER_GENERIC_ERROR',
          error: 'Server Error',
          message: 'Generic Error',
          statusCode: 500
        }
      }
    })

  try {
    await app.loginUser({
      email: 'test@user.com',
      externalId: 'gh|123456',
      username: 'test-user',
      role: 'user'
    })
    assert.fail()
  } catch (err) {
    assert.equal(err.code, 'PLT_MAIN_LOGIN_ERROR')
    assert.equal(err.message, 'Login error: Generic Error')
    assert.equal(err.statusCode, 500)
  }
})

test('unkown user error (403)', async (t) => {
  const app = await getServer(t)
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

        statusCode: 403,
        data: {
          code: 'PLT_USER_MANAGER__UNKNOWN_USER',
          error: 'Server Error',
          message: 'Unkown user test@user.com',
          statusCode: 403
        }
      }
    })

  try {
    await app.loginUser({
      email: 'test@user.com',
      externalId: 'gh|123456',
      username: 'test-user',
      role: 'user'
    })
    assert.fail()
  } catch (err) {
    assert.ok(err instanceof Error)
    assert.equal(err.message, 'Unkown user test@user.com')
  }
})

test('other error with message', async (t) => {
  const app = await getServer(t)
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

        statusCode: 401,
        data: {
          message: 'Another error with message'
        }
      }
    })

  try {
    await app.loginUser({
      email: 'test@user.com',
      externalId: 'gh|123456',
      username: 'test-user',
      role: 'user'
    })
    assert.fail()
  } catch (err) {
    assert.ok(err instanceof Error)
    assert.equal(err.message, 'Login error: Another error with message')
  }
})

test('more generic json error', async (t) => {
  const app = await getServer(t)
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

        statusCode: 515,
        data: {
          foo: 'bar',
          error: 'this is an error'
        }
      }
    })

  try {
    await app.loginUser({
      email: 'test@user.com',
      externalId: 'gh|123456',
      username: 'test-user',
      role: 'user'
    })
    assert.fail()
  } catch (err) {
    assert.ok(err instanceof Error)
    assert.equal(err.message, 'Error from user-manager: {"foo":"bar","error":"this is an error"}')
  }
})
