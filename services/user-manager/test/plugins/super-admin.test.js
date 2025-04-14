'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { getServer, clearUserDb } = require('../helper')

test('should store the super admin on boot', async (t) => {
  const superAdminEmail = 'john@doe.com'
  process.env.PLT_USER_MANAGER_SUPER_ADMIN_EMAIL = superAdminEmail

  const server = await getServer(t)

  t.after(async () => {
    const { db, sql } = server.platformatic
    await clearUserDb(db, sql)
  })

  const foundUser = await server.platformatic.entities.user.find({
    where: { email: { eq: superAdminEmail } }
  })
  assert.equal(foundUser.length, 1)
  assert.equal(foundUser[0].email, superAdminEmail)
  assert.equal(foundUser[0].externalId, null)
  assert.equal(foundUser[0].joined, false)
  assert.equal(foundUser[0].username, null)
  assert.equal(foundUser[0].role, 'super-admin')
})

test('add multiple super admins', async (t) => {
  const superAdminEmails = 'john@doe.com,foo@bar.com, hey@hello.com'
  process.env.PLT_USER_MANAGER_SUPER_ADMIN_EMAIL = superAdminEmails

  const server = await getServer(t)

  t.after(async () => {
    const { db, sql } = server.platformatic
    await clearUserDb(db, sql)
  })

  const foundUsers = await server.platformatic.entities.user.find()
  assert.equal(foundUsers.length, 3)

  assert.equal(foundUsers[0].email, 'john@doe.com')
  assert.equal(foundUsers[0].externalId, null)
  assert.equal(foundUsers[0].joined, false)
  assert.equal(foundUsers[0].username, null)
  assert.equal(foundUsers[0].role, 'super-admin')

  assert.equal(foundUsers[1].email, 'foo@bar.com')
  assert.equal(foundUsers[1].externalId, null)
  assert.equal(foundUsers[1].joined, false)
  assert.equal(foundUsers[1].username, null)
  assert.equal(foundUsers[1].role, 'super-admin')

  assert.equal(foundUsers[2].email, 'hey@hello.com')
  assert.equal(foundUsers[2].externalId, null)
  assert.equal(foundUsers[2].joined, false)
  assert.equal(foundUsers[2].username, null)
  assert.equal(foundUsers[2].role, 'super-admin')
})
