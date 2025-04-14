'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { getServer } = require('../helper')
const { createUserSessionCookie } = require('../../../main/test/helper')

test('should get current user', async (t) => {
  const server = await getServer(t)
  // const server = await startICC(t)
  const authCookie = createUserSessionCookie(server)
  const res = await server.inject({
    method: 'GET',
    path: '/me',
    headers: {
      cookie: authCookie
    }
  })

  const response = res.json()
  assert.equal(res.statusCode, 200)
  assert.deepEqual(response, {
    email: 'john@doe.com',
    full_name: 'John Doe',
    image: 'https://picsum.photos/200/300',
    role: 'admin',
    username: 'johndoe'
  })
})

test('should add a new user with default values', async (t) => {
  const server = await getServer(t)
  const testUser = {
    email: 'john@doe.com'
  }
  const res = await server.inject({
    method: 'POST',
    path: '/users',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(testUser)
  })
  assert.equal(res.statusCode, 200)
  const foundUser = await server.platformatic.entities.user.find({
    where: { email: { eq: testUser.email } }
  })

  assert.equal(foundUser.length, 1)
  const theUser = foundUser[0]
  assert.equal(theUser.email, testUser.email)
  assert.equal(theUser.joined, false)
  assert.equal(theUser.externalId, null)
  assert.equal(theUser.username, null)
  assert.equal(theUser.role, 'user')
  assert.ok(theUser.id)
})

test('simulate update non-joined user role', async (t) => {
  const server = await getServer(t)
  const testUser = {
    email: 'john@doe.com'
  }
  const userCreateResponse = await server.inject({
    method: 'POST',
    path: '/users',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(testUser)
  })

  const createdUser = userCreateResponse.json()

  const res = await server.inject({
    method: 'POST',
    path: '/users',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      id: createdUser.id,
      role: 'admin',
      // the following proprieties should not change
      email: 'another@email.com',
      username: 'foobar',
      externalId: 'fake|123456'
    })
  })

  const output = res.json()
  assert.equal(res.statusCode, 200)

  assert.equal(output.email, testUser.email)
  assert.equal(output.joined, false)
  assert.equal(output.externalId, null)
  assert.equal(output.username, null)
  assert.equal(output.role, 'admin')
})
