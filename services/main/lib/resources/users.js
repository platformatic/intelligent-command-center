'use strict'

const fp = require('fastify-plugin')
const { request } = require('undici')
const { LoginError, UserManagerError } = require('../errors')

const PLT_USER_MANAGER_URL = 'http://user-manager.plt.local'

async function plugin (app) {
  app.decorate('logoutUser', async function () {
    const res = await request(`${PLT_USER_MANAGER_URL}/logout`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({})
    })

    const returnCookies = res.headers['set-cookie']

    return returnCookies
  })

  app.decorate('loginUser', async function (userData) {
    const res = await request(`${PLT_USER_MANAGER_URL}/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(userData)
    })
    const output = await res.body.json()
    if (res.statusCode === 200) {
      return {
        sessionCookie: res.headers['set-cookie'],
        user: output
      }
    }
    if (res.statusCode === 403) {
      throw new Error(output.message)
    }

    if (output.message) {
      throw new LoginError(output.message)
    }

    // unknown error
    throw new UserManagerError(JSON.stringify(output))
  })
}

module.exports = fp(plugin, {
  name: 'users',
  dependencies: ['config']
})
