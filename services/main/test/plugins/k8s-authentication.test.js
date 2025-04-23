'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { writeFile, mkdir, rm } = require('node:fs/promises')
const path = require('node:path')
const fastify = require('fastify')
const configPlugin = require('../../lib/plugins/config')
const k8sTokenPlugin = require('../../lib/plugins/k8s-token')
const k8sAuthPlugin = require('../../lib/plugins/k8s-authentication')
const { createSigner } = require('fast-jwt')

const { createPublicKey, generateKeyPairSync } = require('node:crypto')

// creates a RSA key pair for the test
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
})
const jwtPublicKey = createPublicKey(publicKey).export({ format: 'jwk' })

let headers = {}
async function buildJwksEndpoint (jwks, fail = false) {
  const app = fastify()
  app.get('/openid/v1/jwks', async (req) => {
    if (fail) {
      throw Error('JWKS ENDPOINT ERROR')
    }
    headers = req.headers
    return jwks
  })
  await app.listen({ port: 0 })
  return app
}

// Setup and teardown temporary test directory structure
const testDir = path.join(__dirname, 'test-k8s-auth')
const secretsDir = path.join(testDir, 'var', 'run', 'secrets', 'kubernetes.io', 'serviceaccount')

async function setupICCEnv (token) {
  await mkdir(secretsDir, { recursive: true })
  await writeFile(path.join(secretsDir, 'token'), token)
  process.env.K8S_TOKEN_PATH = path.join(secretsDir, 'token')
}

async function cleanupTestEnv () {
  await rm(testDir, { recursive: true, force: true })
}

async function setupApp () {
  process.env.DEV = false
  process.env.PLT_MAIN_URL = 'http://localhost:1234'
  const app = fastify()
  await app.register(configPlugin)
  await app.register(k8sTokenPlugin)
  await app.register(k8sAuthPlugin)
  app.post('/control-plane/pods/:podId/instance', async function (request) {
    await app.k8sJWTAuth(request)
    return request.k8s
  })
  app.post('/not-allowed', async function (request) {
    return app.k8sJWTAuth(request)
  })
  return app
}

test('k8sJWTAuth process correctly valid token', async (t) => {
  // The icctoken is used to call K8S APIs, in this test we just check
  // tha it's sent to the JWKS endpoint
  const iccToken = 'TEST_TOKEN'
  await setupICCEnv(iccToken)

  // JWKS setup
  const { n, e, kty } = jwtPublicKey
  const kid = 'TEST-KID'
  const alg = 'RS256'
  const jwksEndpoint = await buildJwksEndpoint(
    {
      keys: [
        {
          alg,
          kty,
          n,
          e,
          use: 'sig',
          kid
        }
      ]
    }
  )
  test.after(() => jwksEndpoint.close())

  const issuer = `http://localhost:${jwksEndpoint.server.address().port}`
  const header = {
    kid,
    alg,
    typ: 'JWT'
  }
  const payload = {
    'kubernetes.io': {
      namespace: 'platformatic',
      node: {
        name: 'k3d-plt-cluster-server-0',
        uid: '723cf17a-e783-4382-bc86-b2a6c06248ab'
      },
      pod: {
        name: 'plt-6cc7c6cd58-kpsdd',
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
    iss: issuer,
    kid
  })
  const token = signSync(payload)

  t.after(async () => {
    await cleanupTestEnv()
    headers = {}
  })

  const app = await setupApp()
  await app.ready()
  const { statusCode, body } = await app.inject({
    method: 'POST',
    url: '/control-plane/pods/xxxyyyzzz/instance',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  assert.equal(statusCode, 200)
  const k8sInfo = JSON.parse(body)
  assert.equal(k8sInfo.namespace, 'platformatic')
  assert.equal(k8sInfo.pod.name, 'plt-6cc7c6cd58-kpsdd')

  // We test the headers sent to the JWKS endpoint
  assert.equal(headers.authorization, `Bearer ${iccToken}`)
})

test('k8sJWTAuth process fails if there is JWKS is not reachable', async (t) => {
  // The icctoken is used to call K8S APIs, in this test we just check
  // tha it's sent to the JWKS endpoint
  const iccToken = 'TEST_TOKEN'
  await setupICCEnv(iccToken)

  // JWKS setup
  const { n, e, kty } = jwtPublicKey
  const kid = 'TEST-KID'
  const alg = 'RS256'
  const jwksEndpoint = await buildJwksEndpoint(
    {
      keys: [
        {
          alg,
          kty,
          n,
          e,
          use: 'sig',
          kid
        }
      ]
    }, true
  )
  test.after(() => jwksEndpoint.close())

  const issuer = `http://localhost:${jwksEndpoint.server.address().port}`
  const header = {
    kid,
    alg,
    typ: 'JWT'
  }
  const payload = {
    'kubernetes.io': {
      namespace: 'platformatic',
      node: {
        name: 'k3d-plt-cluster-server-0',
        uid: '723cf17a-e783-4382-bc86-b2a6c06248ab'
      },
      pod: {
        name: 'plt-6cc7c6cd58-kpsdd',
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
    iss: issuer,
    kid
  })
  const token = signSync(payload)

  t.after(async () => {
    await cleanupTestEnv()
    headers = {}
  })

  const app = await setupApp()
  await app.ready()
  const { statusCode, body } = await app.inject({
    method: 'POST',
    url: '/control-plane/pods/xxxyyyzzz/instance',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  assert.equal(statusCode, 401)
  const error = JSON.parse(body)
  assert.equal(error.error, 'Unauthorized')
  assert.equal(error.message, 'Unauthorized API call. K8s JWT verification failed')
  assert.equal(error.code, 'PLT_MAIN_UNAUTHORIZED')
})

test('k8sJWTAuth process fails if the JWT token is invalid', async (t) => {
  // The icctoken is used to call K8S APIs, in this test we just check
  // tha it's sent to the JWKS endpoint
  const iccToken = 'TEST_TOKEN'
  await setupICCEnv(iccToken)

  // JWKS setup
  const { n, e, kty } = jwtPublicKey
  const kid = 'TEST-KID'
  const alg = 'RS256'
  const jwksEndpoint = await buildJwksEndpoint(
    {
      keys: [
        {
          alg,
          kty,
          n,
          e,
          use: 'sig',
          kid
        }
      ]
    }
  )
  test.after(() => jwksEndpoint.close())

  const token = 'INVALID_TOKEN'

  t.after(async () => {
    await cleanupTestEnv()
    headers = {}
  })

  const app = await setupApp()
  await app.ready()
  const { statusCode, body } = await app.inject({
    method: 'POST',
    url: '/control-plane/pods/xxxyyyzzz/instance',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  assert.equal(statusCode, 401)
  const error = JSON.parse(body)
  assert.equal(error.error, 'Unauthorized')
  assert.equal(error.message, 'Unauthorized API call. K8s JWT verification failed')
  assert.equal(error.code, 'PLT_MAIN_UNAUTHORIZED')
})

test('k8sJWTAuth process fails if the token is expired', async (t) => {
  // The icctoken is used to call K8S APIs, in this test we just check
  // tha it's sent to the JWKS endpoint
  const iccToken = 'TEST_TOKEN'
  await setupICCEnv(iccToken)

  // JWKS setup
  const { n, e, kty } = jwtPublicKey
  const kid = 'TEST-KID'
  const alg = 'RS256'
  const jwksEndpoint = await buildJwksEndpoint(
    {
      keys: [
        {
          alg,
          kty,
          n,
          e,
          use: 'sig',
          kid
        }
      ]
    }
  )
  test.after(() => jwksEndpoint.close())

  const issuer = `http://localhost:${jwksEndpoint.server.address().port}`
  const header = {
    kid,
    alg,
    typ: 'JWT'
  }
  const payload = {
    'kubernetes.io': {
      namespace: 'platformatic',
      node: {
        name: 'k3d-plt-cluster-server-0',
        uid: '723cf17a-e783-4382-bc86-b2a6c06248ab'
      },
      pod: {
        name: 'plt-6cc7c6cd58-kpsdd',
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
    iss: issuer,
    kid,
    expiresIn: 1 // Expires in 1 millis
  })
  const token = signSync(payload)

  t.after(async () => {
    await cleanupTestEnv()
    headers = {}
  })

  const app = await setupApp()
  await app.ready()
  const { statusCode, body } = await app.inject({
    method: 'POST',
    url: '/control-plane/pods/xxxyyyzzz/instance',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  assert.equal(statusCode, 401)
  const error = JSON.parse(body)
  assert.equal(error.error, 'Unauthorized')
  assert.equal(error.message, 'Unauthorized API call. K8s JWT verification failed')
  assert.equal(error.code, 'PLT_MAIN_UNAUTHORIZED')
})

test('k8sJWTAuth process fails if the route is not allowed', async (t) => {
  // The icctoken is used to call K8S APIs, in this test we just check
  // tha it's sent to the JWKS endpoint
  const iccToken = 'TEST_TOKEN'
  await setupICCEnv(iccToken)

  // JWKS setup
  const { n, e, kty } = jwtPublicKey
  const kid = 'TEST-KID'
  const alg = 'RS256'
  const jwksEndpoint = await buildJwksEndpoint(
    {
      keys: [
        {
          alg,
          kty,
          n,
          e,
          use: 'sig',
          kid
        }
      ]
    }
  )
  test.after(() => jwksEndpoint.close())

  const issuer = `http://localhost:${jwksEndpoint.server.address().port}`
  const header = {
    kid,
    alg,
    typ: 'JWT'
  }
  const payload = {
    'kubernetes.io': {
      namespace: 'platformatic',
      node: {
        name: 'k3d-plt-cluster-server-0',
        uid: '723cf17a-e783-4382-bc86-b2a6c06248ab'
      },
      pod: {
        name: 'plt-6cc7c6cd58-kpsdd',
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
    iss: issuer,
    kid
  })
  const token = signSync(payload)

  t.after(async () => {
    await cleanupTestEnv()
    headers = {}
  })

  const app = await setupApp()
  await app.ready()
  const { statusCode, body } = await app.inject({
    method: 'POST',
    url: '/not-allowed',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  assert.equal(statusCode, 401)
  const error = JSON.parse(body)
  assert.equal(error.error, 'Unauthorized')
  assert.equal(error.message, 'Unauthorized API call. K8s authentication denied: route not in whitelist')
  assert.equal(error.code, 'PLT_MAIN_UNAUTHORIZED')
})
