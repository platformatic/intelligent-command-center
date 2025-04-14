'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { getServer } = require('../helper')

test('should not login if not added beforehand', async (t) => {
  const server = await getServer(t)
  const testUser = {
    email: 'john@doe.com',
    externalId: 'gh|12345',
    username: 'JohnDoe',
    role: 'user'
  }
  const res = await server.inject({
    method: 'POST',
    path: '/login',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(testUser)
  })
  const error = await res.json()
  assert.equal(res.statusCode, 403)
  assert.deepEqual(error, {
    code: 'PLT_USER_MANAGER_UNKNOWN_USER',
    error: 'Forbidden',
    message: 'Unknown user john@doe.com',
    statusCode: 403
  })
})
test('update existing non-joined user on login', async (t) => {
  const server = await getServer(t, [
    {
      email: 'john@doe.com',
      joined: false,
      role: 'super-admin'
    }
  ])
  const testUser = {
    email: 'john@doe.com',
    externalId: 'gh|12345',
    username: 'JohnDoe',
    role: 'user'
  }
  const res = await server.inject({
    method: 'POST',
    path: '/login',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(testUser)
  })

  const loggedUser = await res.json()
  const foundUser = await server.platformatic.entities.user.find({
    where: { id: { eq: loggedUser.id } }
  })

  assert.equal(res.statusCode, 200)
  assert.equal(foundUser[0].email, testUser.email)
  assert.equal(foundUser[0].externalId, testUser.externalId)
  assert.equal(foundUser[0].joined, true)
  assert.equal(foundUser[0].role, 'super-admin') // the role has not been changed
})

test('do not duplicate users on second login', async (t) => {
  const server = await getServer(t, [
    {
      email: 'john@doe.com',
      joined: false
    }
  ])
  const testUser = {
    email: 'john@doe.com',
    externalId: 'gh|12345',
    username: 'JohnDoe',
    role: 'user'
  }
  // first login
  const firstRes = await server.inject({
    method: 'POST',
    path: '/login',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(testUser)
  })

  const firstLoggedInUser = await firstRes.json()

  const secondRes = await server.inject({
    method: 'POST',
    path: '/login',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(testUser)
  })

  const secondLoggedInUser = await secondRes.json()

  const foundUser = await server.platformatic.entities.user.find({
    where: { email: { eq: testUser.email } }
  })

  assert.equal(firstLoggedInUser.id, secondLoggedInUser.id)
  assert.equal(foundUser.length, 1) // only one user saved
})
