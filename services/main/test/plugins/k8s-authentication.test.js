'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { writeFile, mkdir, rm } = require('node:fs/promises')
const path = require('node:path')
const fastify = require('fastify')
const k8sTokenPlugin = require('../../lib/plugins/k8s-token')
const k8sAuthPlugin = require('../../lib/plugins/k8s-authentication')
const { encodeJwtPayload } = require('../helper')

// Create a valid token (not expired)
const validToken = encodeJwtPayload()

// Setup and teardown temporary test directory structure
const testDir = path.join(__dirname, 'test-k8s-auth')
const secretsDir = path.join(testDir, 'var', 'run', 'secrets', 'kubernetes.io', 'serviceaccount')

async function setupTestEnv (token = validToken) {
  await mkdir(secretsDir, { recursive: true })
  await writeFile(path.join(secretsDir, 'token'), token)
  process.env.K8S_TOKEN_PATH = path.join(secretsDir, 'token')
  // Create an empty CA certificate file for the test
  await writeFile(path.join(secretsDir, 'ca.crt'), 'TEST_CA_CERTIFICATE')
}

async function cleanupTestEnv () {
  await rm(testDir, { recursive: true, force: true })
}

function setupK8sEnv () {
  process.env.KUBERNETES_SERVICE_HOST = 'kubernetes.default.svc.cluster.local'
  process.env.KUBERNETES_SERVICE_PORT_HTTPS = '443'
  process.env.K8S_TOKEN_PATH = path.join(secretsDir, 'token')
}

async function setupApp () {
  const app = fastify()
  setupK8sEnv()
  await app.register(k8sTokenPlugin)
  await app.register(k8sAuthPlugin)
  app.get('/', async function (request) {
    await app.k8sJWTAuth(request)

    return request.k8s
  })
  app.k8sCaCertPath = path.join(secretsDir, 'ca.crt')
  return app
}

test('k8s-authentication plugin registers required decorators', async (t) => {
  await setupTestEnv()
  t.after(async () => {
    await cleanupTestEnv()
  })
  const app = await setupApp()
  assert.equal(typeof app.k8sJWTAuth, 'function', 'k8sJWTAuth should be a function')
})

test.only('k8sJWTAuth throw with 401 if cannot validate the token', async (t) => {
  await setupTestEnv()
  t.after(async () => {
    await cleanupTestEnv()
  })

  const app = await setupApp()
  await app.ready()

  // The token is valid, but cannot be validated
  const { statusCode, body } = await app.inject({
    method: 'GET',
    url: '/',
    headers: {
      Authorization: `Bearer ${validToken}`
    }
  })

  assert.equal(statusCode, 401)
  const error = JSON.parse(body)
  assert.equal(error.statusCode, 401)
  assert.equal(error.error, 'Unauthorized')
  assert.equal(error.message, 'Unauthorized API call. K8s JWT verification failed')
  assert.equal(error.code, 'PLT_MAIN_UNAUTHORIZED')
})

test.only('k8sJWTAuth process correctly valid token', async (t) => {
  await setupTestEnv()
  t.after(async () => {
    await cleanupTestEnv()
  })

  const app = await setupApp()
  await app.ready()

  const { statusCode, body } = await app.inject({
    method: 'GET',
    url: '/',
    headers: {
      Authorization: `Bearer ${validToken}`
    }
  })

  assert.equal(statusCode, 200)
  const k8sInfo = JSON.parse(body)
  console.lg('k8sInfo@@@@@@@@@@@@@@@@@@@@@@', k8sInfo)
})
