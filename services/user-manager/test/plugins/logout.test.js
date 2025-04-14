'use strict'
const { test } = require('node:test')
const assert = require('node:assert')
const { getServer, createUserSessionCookie } = require('../helper')

test('should logout current', async (t) => {
  const server = await getServer(t)
  // const server = await startICC(t)
  const authCookie = createUserSessionCookie(server)
  const res = await server.inject({
    method: 'POST',
    path: '/logout',
    headers: {
      cookie: authCookie
    }
  })

  assert.equal(res.statusCode, 200)
  assert.match(res.headers['set-cookie'], /auth-cookie-name=;/)
})
