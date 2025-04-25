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
    PLT_MAIN_REDIS_HOST: 'localhost',
    PLT_MAIN_REDIS_PORT: 6343,
    PLT_MAIN_REDIS_DB: 1,
    PLT_MAIN_URL: 'http://localhost:1234',
    PLT_CONTROL_PLANE_URL: 'http://localhost:1234',
    PLT_DISABLE_K8S_AUTH: true
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
    level: 'silent'
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
  const app = Fastify({
    keepAliveTimeout: 1,
    logger: { level: 'silent' }
  })

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

module.exports.startControlPlane = async function (t, opts = {}) {
  const app = Fastify({
    keepAliveTimeout: 1,
    logger: { level: 'error' }
  })

  app.post('/pods/:id/instance/status', async (request, reply) => {
    const podId = request.params.id
    const status = request.body.status
    return opts.savePodStatus?.({ podId, status })
  })

  t.after(async () => {
    process.env.PLT_CONTROL_PLANE_URL = ''
    await app.close()
  })

  const address = await app.listen()
  process.env.PLT_CONTROL_PLANE_URL = address
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
const baseK8sPayload = {
  aud: [
    'https://kubernetes.default.svc.cluster.local',
    'k3s'
  ],
  exp: 1776504891, // Will be overwritten
  iat: 1744968891,
  iss: 'https://kubernetes.default.svc.cluster.local',
  jti: 'ca60f2d6-4655-4fd0-9ecb-ffeb10360230',
  'kubernetes.io': {
    namespace: 'platformatic',
    node: {
      name: 'k3d-plt-cluster-server-0',
      uid: '723cf17a-e783-4382-bc86-b2a6c06248ab'
    },
    pod: {
      name: 'test-6cc7c6cd58-kpsdd',
      uid: 'bab4c2fc-7438-4204-9804-bf92f65641e4'
    },
    serviceaccount: {
      name: 'platformatic',
      uid: '0f668f4e-f2f8-4e2a-8642-08b87da06e22'
    },
    warnafter: 1744972498
  },
  nbf: 1744968891,
  sub: 'system:serviceaccount:platformatic:platformatic'
}

function decodeJwtPayload (token) {
  try {
    if (!token) return null
    const base64Payload = token.split('.')[1]
    if (!base64Payload) return null
    const payload = Buffer.from(base64Payload, 'base64').toString('utf8')
    return JSON.parse(payload)
  } catch (err) {
    return null
  }
}

function encodeJwtPayload (exp = null) {
  const payload = { ...baseK8sPayload }
  if (exp !== null) {
    payload.exp = exp
  } else {
    // Default to 1 hour
    payload.exp = Math.floor(Date.now() / 1000) + 3600
  }
  const header = { alg: 'HS256', typ: 'JWT' }
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = 'TEST_SIGNATURE_FOR_K8S_JWT_TOKEN'
  const encodedSignature = Buffer.from(signature).toString('base64url')
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`
}

function isTokenExpired (token) {
  const payload = decodeJwtPayload(token)
  if (!payload || !payload.exp) return true

  // Check if token is expired
  const currentTime = Math.floor(Date.now() / 1000)
  return payload.exp <= currentTime
}

module.exports.isTokenExpired = isTokenExpired
module.exports.decodeJwtPayload = decodeJwtPayload
module.exports.baseK8sPayload = baseK8sPayload
module.exports.encodeJwtPayload = encodeJwtPayload
module.exports.setUpEnvironment = setUpEnvironment
