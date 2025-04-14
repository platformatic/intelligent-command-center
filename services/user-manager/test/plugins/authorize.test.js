'use strict'

const { describe, test } = require('node:test')
const assert = require('node:assert')
const { getServer } = require('../helper')

test('should throw an error if no session cookie provided', async (t) => {
  const app = await getServer(t)
  const { statusCode, body } = await app.inject({
    method: 'POST',
    url: '/authorize',
    body: JSON.stringify({
      method: 'POST',
      path: '/applications/create'
    }),
    headers: {
      'content-type': 'application/json'
    }
  })

  const output = JSON.parse(body)
  assert.equal(statusCode, 400)
  assert.deepEqual(output, {
    statusCode: 400,
    code: 'PLT_USER_MANAGER_MISSING_CREDENTIALS',
    error: 'Bad Request',
    message: 'Missing session cookie'
  })
})
