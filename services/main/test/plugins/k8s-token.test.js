'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { writeFile, mkdir, rm } = require('node:fs/promises')
const path = require('node:path')
const fastify = require('fastify')
const configPlugin = require('../../lib/plugins/config')
const k8sTokenPlugin = require('../../lib/plugins/k8s-token')
const { baseK8sPayload, encodeJwtPayload, decodeJwtPayload, isTokenExpired } = require('../helper')

const validToken = encodeJwtPayload()
const testDir = path.join(__dirname, 'test-k8s-token')
const secretsDir = path.join(testDir, 'var', 'run', 'secrets', 'kubernetes.io', 'serviceaccount')

async function setupTestEnv (token = validToken) {
  await mkdir(secretsDir, { recursive: true })
  await writeFile(path.join(secretsDir, 'token'), token)
  process.env.K8S_TOKEN_PATH = path.join(secretsDir, 'token')
  process.env.DEV = true
  process.env.PLT_MAIN_URL = 'http://localhost:3000'
}

async function cleanupTestEnv () {
  await rm(testDir, { recursive: true, force: true })
}

test('encodeJwtPayload and decodeJwtPayload work correctly', async () => {
  // Test with explicit expiration time
  const expTime = Math.floor(Date.now() / 1000) + 3600
  const token = encodeJwtPayload(expTime)
  const decoded = decodeJwtPayload(token)

  assert.equal(decoded.exp, expTime, 'Expiration time should match')
  assert.deepStrictEqual(decoded.aud, baseK8sPayload.aud, 'aud should match')
  assert.equal(decoded.iss, baseK8sPayload.iss, 'iss should match')
  assert.deepStrictEqual(decoded['kubernetes.io'], baseK8sPayload['kubernetes.io'], 'kubernetes.io should match')
})

test('k8s-token plugin returns valid token', async (t) => {
  await setupTestEnv()
  t.after(async () => {
    await cleanupTestEnv()
  })

  const app = fastify()
  await app.register(configPlugin)
  await app.register(k8sTokenPlugin)

  const token = await app.getK8SJWTToken()
  assert.equal(token, validToken, 'Should return the correct token')

  const payload = decodeJwtPayload(token)
  assert.ok(payload, 'Should be able to decode token payload')

  assert.ok(Array.isArray(payload.aud), 'aud should be an array')
  assert.equal(payload.iss, 'https://kubernetes.default.svc.cluster.local', 'iss should match Kubernetes URL')
  assert.ok(payload['kubernetes.io'], 'Should have kubernetes.io section')
  assert.equal(payload.sub, 'system:serviceaccount:platformatic:platformatic', 'sub should match service account')

  assert.equal(payload['kubernetes.io'].namespace, 'platformatic', 'Should have correct namespace')
  assert.ok(payload['kubernetes.io'].pod, 'Should have pod information')
  assert.ok(payload['kubernetes.io'].serviceaccount, 'Should have service account information')
})

test('k8s-token plugin handles missing token files', async () => {
  const app = fastify()
  process.env.K8S_TOKEN_PATH = '/does/not/exist/token'
  process.env.PLT_TEST_TOKEN = validToken // Set fallback token

  await app.register(configPlugin)
  await app.register(k8sTokenPlugin)
  const token = await app.getK8SJWTToken()
  assert.equal(token, validToken, 'Should use fallback token from environment')
})

test('k8s-token plugin handles token expiration', async (t) => {
  const expiredToken = encodeJwtPayload(Math.floor(Date.now() / 1000) - 3600) // Expired 1 hour ago

  await setupTestEnv(expiredToken)
  t.after(async () => {
    await cleanupTestEnv()
  })

  const app = fastify()
  await app.register(configPlugin)
  await app.register(k8sTokenPlugin)

  {
    // th token is expired, but there is no new token still, so must be the sameThe token is
    const token = await app.getK8SJWTToken()
    assert.equal(token, expiredToken, 'Should use fallback token from environment')
  }

  {
    // Writing on FS the new token
    await writeFile(path.join(secretsDir, 'token'), validToken)
    const token = await app.getK8SJWTToken()
    assert.equal(token, validToken, 'Should use the new token from file')
    assert.ok(!isTokenExpired(token), 'Token should not be expired')
  }
})
