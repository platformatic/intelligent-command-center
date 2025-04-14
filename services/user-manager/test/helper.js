'use strict'

const { join } = require('node:path')
const { readFile } = require('node:fs/promises')
const { randomBytes } = require('node:crypto')
const { buildServer } = require('@platformatic/db')

async function getServer (t, users = []) {
  process.env.PLT_USER_MANAGER_SESSION_SECRET_KEY = randomBytes(32).toString('base64url')

  const connectionString = 'postgres://postgres:postgres@127.0.0.1:5433/user_manager'

  const config = JSON.parse(await readFile(join(__dirname, '..', 'platformatic.json'), 'utf8'))
  // Add your config customizations here. For example you want to set
  // all things that are set in the config file to read from an env variable
  config.server ||= {}
  config.server.logger = {
    level: 'error'
  }

  config.plugins = {
    paths: [
      {
        path: join(__dirname, '..', 'plugins'),
        encapsulate: false
      }
    ],
    typescript: '{PLT_USER_MANAGER_TYPESCRIPT}'
  }
  config.watch = false

  config.migrations.dir = join(__dirname, '..', 'migrations')
  config.migrations.autoApply = true
  config.types.autogenerate = true
  config.db.connectionString = connectionString

  // Add your config customizations here
  const server = await buildServer(config)
  const { db, sql } = server.platformatic
  if (process.env.PLT_USER_MANAGER_SUPER_ADMIN_EMAIL) {
    // do not delete the databases, the test will fail
  } else {
    await clearUserDb(db, sql)
  }
  t && t.after(async () => {
    await clearUserDb(db, sql)
    server.close()
    delete process.env.PLT_USER_MANAGER_SESSION_SECRET_KEY
  })

  if (users.length > 0) {
    await server.platformatic.entities.user.insert({
      inputs: users,
      skipAuth: true
    })
  }
  return server
}

/**
 * Generate the cookie to be sent to simulate a user authenticated and logged in
 * @param {*} serverInstance the server instance
 * @param {*} user an user object with properties: username, full_name, image, email. If not sent, a default John Doe user will be generated
 * @returns {string} the cookie value
 */
function createUserSessionCookie (serverInstance, user = null) {
  if (!user) {
    user = {
      username: 'johndoe',
      full_name: 'John Doe',
      image: 'https://picsum.photos/200/300',
      email: 'john@doe.com'
    }
  }
  const session = serverInstance.createSecureSession({ user })
  const cookieString = serverInstance.encodeSecureSession(session)
  return `auth-cookie-name=${encodeURIComponent(cookieString)}; Path=/; HttpOnly`
}

async function clearUserDb (db, sql) {
  await db.query(sql`DELETE FROM users;`)
}

module.exports.createUserSessionCookie = createUserSessionCookie
module.exports.getServer = getServer
module.exports.clearUserDb = clearUserDb
