'use strict'

const assert = require('node:assert')
const { join } = require('node:path')
const { readFile } = require('node:fs/promises')
const { randomUUID, createPublicKey, generateKeyPairSync } = require('node:crypto')
const Fastify = require('fastify')
const { buildServer } = require('@platformatic/composer')
const { MockAgent, setGlobalDispatcher, getGlobalDispatcher } = require('undici')
const { createSigner } = require('fast-jwt')

function setUpEnvironment (env = {}) {
  const defaultEnv = {
    DEV: false,
    PLT_ICC_VALKEY_CONNECTION_STRING: 'redis://localhost:6343',
    PLT_MAIN_URL: 'http://localhost:1234',
    PLT_CONTROL_PLANE_URL: 'http://localhost:1234',
    PLT_DISABLE_K8S_AUTH: true,
    PLT_ICC_SESSION_SECRET: 'test-secret'
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

  app.post('/pods/:id/instance/status', async (request) => {
    const podId = request.params.id
    const status = request.body.status
    return opts.savePodStatus?.({ podId, status })
  })

  app.get('/instances', async (request) => {
    const podId = request.query['where.podId.eq']
    const podDetails = await opts.getPodDetails?.({ podId })
    return [podDetails]
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

module.exports.startK8sAuthService = async function (t) {
  const app = Fastify()

  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
  })

  const jwtPublicKey = createPublicKey(publicKey).export({ format: 'jwk' })

  const { n, e, kty } = jwtPublicKey
  const kid = 'TEST-KID'
  const alg = 'RS256'

  app.get('/openid/v1/jwks', async () => {
    return { keys: [{ alg, kty, n, e, use: 'sig', kid }] }
  })

  let url = null
  app.decorate('generateToken', (podId, namespace) => {
    const header = { kid, alg, typ: 'JWT' }
    const payload = {
      'kubernetes.io': {
        namespace: namespace ?? 'platformatic',
        node: {
          name: 'k3d-plt-cluster-server-0',
          uid: '723cf17a-e783-4382-bc86-b2a6c06248ab'
        },
        pod: {
          name: podId,
          uid: 'bab4c2fc-7438-4204-9804-bf92f65641e4'
        },
        serviceaccount: {
          name: 'platformatic',
          uid: '0f668f4e-f2f8-4e2a-8642-08b87da06e22'
        },
        warnafter: 1744972498
      }
    }

    const signSync = createSigner({
      algorithm: 'RS256',
      key: privateKey,
      header,
      iss: url,
      kid
    })

    const token = signSync(payload)
    return token
  })

  url = await app.listen({ port: 0 })

  t.after(async () => {
    await app.close()
  })

  return app
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
