'use strict'

const { join } = require('node:path')
const { readFile } = require('node:fs/promises')
const Fastify = require('fastify')
const { buildServer } = require('@platformatic/composer')
const { randomUUID } = require('node:crypto')
const { MockAgent, setGlobalDispatcher, getGlobalDispatcher } = require('undici')
const assert = require('node:assert')

function setUpEnvironment (env = {}) {
  const defaultEnv = {
    DEV: false,
    PLT_MAIN_URL: 'http://localhost:1234'
  }

  Object.assign(process.env, defaultEnv, env)
}

module.exports.getComposerWithService = async function (t, services = []) {
  setUpEnvironment()
  const config = JSON.parse(await readFile(join(__dirname, '..', 'platformatic.json'), 'utf8'))
  // Add your config customizations here. For example you want to set
  // all things that are set in the config file to read from an env variable
  config.server = {}
  config.server.logger ||= {
    level: 'silent'
  }
  config.watch = false
  config.composer = {
    services: services.map((s) => {
      return {
        id: s.id,
        origin: s.origin,
        proxy: {
          prefix: s.id
        }
      }
    })
  }
  delete config.clients
  // Add your config customizations here
  const server = await buildServer(config)
  t.after(() => server.close())
  return server
}

module.exports.getServer = async function (t, env) {
  setUpEnvironment(env)
  const config = JSON.parse(await readFile(join(__dirname, '..', 'platformatic.json'), 'utf8'))
  // Add your config customizations here. For example you want to set
  // all things that are set in the config file to read from an env variable
  config.server = {}
  config.server.logger ||= {
    level: 'info'
  }
  config.watch = false

  config.composer = {
    services: [
      {
        id: 'control-plane',
        origin: process.env.PLT_CONTROL_PLANE_URL,
        proxy: {
          prefix: 'control-plane'
        }
      }
    ]
  }

  // Add your config customizations here
  const server = await buildServer(config)
  t.after(() => server.close())
  return server
}

module.exports.startActivities = async function (t, activities) {
  const totalCount = activities.length * 10
  const app = Fastify({ keepAliveTimeout: 1, logger: { level: 'silent' } })
  app.get('/events', async (request, reply) => {
    reply
      .code(200)
      .header('Content-Type', 'application/json; charset=utf-8')
      .header('X-Total-Count', totalCount)
      .send(activities)
  })

  t.after(async () => {
    process.env.PLT_ACTIVITIES_URL = ''
    await app.close()
  })

  const address = await app.listen()
  process.env.PLT_ACTIVITIES_URL = address
  return address
}

module.exports.generateRandomActivities = function (count) {
  const output = []
  for (let i = 0; i < count; i++) {
    output.push({
      objectId: randomUUID(),
      userId: randomUUID(),
      username: 'testuser',
      data: { name: 'PLT' },
      event: 'create'
    })
  }
  return output
}
/**
 * Generate the cookie to be sent to simulate a user authenticated and logged in
 * @param {*} serverInstance the server instance
 * @param {*} user an user object with properties: username, full_name, image, email. If not sent, a default John Doe user will be generated
 * @returns {string} the cookie value
 */
module.exports.createUserSessionCookie = function (serverInstance, user = null) {
  if (!user) {
    user = {
      username: 'johndoe',
      full_name: 'John Doe',
      image: 'https://picsum.photos/200/300',
      email: 'john@doe.com',
      role: 'admin'
    }
  }
  const session = serverInstance.createSecureSession({ user })
  const cookieString = serverInstance.encodeSecureSession(session)
  return `auth-cookie-name=${encodeURIComponent(cookieString)}; Path=/; HttpOnly`
}

module.exports.mockAuthorizeEndpoint = function (agent, callback) {
  if (agent === null) {
    agent = new MockAgent()
    setGlobalDispatcher(agent)
  }
  agent
    .get('http://user-manager.plt.local')
    .intercept({
      method: 'POST',
      path: '/authorize'
    }).reply((options) => {
      const { method, path } = JSON.parse(options.body)
      let cookie
      const match = options.headers.cookie.match(/auth-cookie-name=(.*)[;]?/)
      if (match) {
        cookie = match[1]
      }
      const output = callback(method, path, cookie)
      return {
        statusCode: 200,
        data: output
      }
    })
}

module.exports.authorizeEndpoint = function (agent, method, path, cookie) {
  if (agent === null) {
    // do not mess with some other MockAgents
    const currentGlobalDispatcher = getGlobalDispatcher()
    if (currentGlobalDispatcher instanceof MockAgent) {
      agent = currentGlobalDispatcher
    } else {
      agent = new MockAgent()
      setGlobalDispatcher(agent)
    }
  }
  const fakeUser = {
    id: 123456,
    email: 'foo@bar.com',
    username: 'foobar'
  }
  agent
    .get('http://user-manager.plt.local')
    .intercept({
      method: 'POST',
      path: '/authorize'
    }).reply((options) => {
      const body = JSON.parse(options.body)
      if (cookie) {
        // check also cookie

        let receivedCookie
        const match = options.headers.cookie.match(/auth-cookie-name=(.*)[;]?/)
        if (match) {
          receivedCookie = match[1]
        }
        assert.equal(cookie, receivedCookie)
      }

      if (body.method === method && body.path === path) {
        return {
          statusCode: 200,
          data: {
            user: fakeUser,
            authorized: true
          }
        }
      }
      return {
        statusCode: 200,
        data: {
          user: fakeUser,
          authorized: false
        }
      }
    })
  return { user: fakeUser }
}
