'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { randomUUID } = require('node:crypto')

const userLoginEvent = require('../events/user-login-event')
const createApplicationEvent = require('../events/create-application-event')

const testUser = {
  id: randomUUID(),
  username: 'testuser'
}

test('user login event helper', async (t) => {
  const helper = userLoginEvent(testUser.id, testUser.username)

  assert.deepEqual(helper, {
    description: 'logged in',
    event: 'USER_LOGIN',
    objectId: testUser.id,
    objectType: 'user',
    userId: testUser.id,
    username: 'testuser'
  })
})

test('create application event helper', async (t) => {
  const applicationId = randomUUID()
  const applicationName = 'test-application-1'
  const helper = createApplicationEvent(applicationId, applicationName)

  assert.deepEqual(helper, {
    applicationId,
    description: `created a new application "${applicationName}"`,
    event: 'APPLICATION_CREATE',
    objectId: applicationId,
    objectType: 'application'
  })
})
