'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { mkdir, writeFile, rm } = require('node:fs/promises')
const { join } = require('node:path')
const { tmpdir } = require('node:os')
function encodeJwt (payload) {
  const header = JSON.stringify({ alg: 'HS256', typ: 'JWT' })
  const encodedHeader = Buffer.from(header).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const encodedSignature = Buffer.from('signature').toString('base64url')
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`
}

test('k8s-auth', async (t) => {
  const tmpDir = join(tmpdir(), 'k8s-auth-test')
  const tokenPath = join(tmpDir, 'token')

  await t.beforeEach(async () => {
    await mkdir(tmpDir, { recursive: true })
    // Clear the cached token between tests by deleting the module cache
    delete require.cache[require.resolve('../lib/k8s-auth')]
  })

  await t.afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  await t.test('loads token from environment variable', () => {
    process.env.PLT_K8S_TOKEN = 'test-token-from-env'
    // eslint-disable-next-line global-require
    const { getK8sToken } = require('../lib/k8s-auth')
    assert.equal(getK8sToken(), 'test-token-from-env')
    delete process.env.PLT_K8S_TOKEN
  })

  await t.test('decodes JWT payload correctly', () => {
    // eslint-disable-next-line global-require
    const k8sAuth = require('../lib/k8s-auth')
    const token = encodeJwt({ exp: 9999999999, sub: 'test' })
    const payload = k8sAuth.decodeJwtPayload(token)
    assert.deepEqual(payload, { exp: 9999999999, sub: 'test' })
  })

  await t.test('returns null for invalid JWT', () => {
    // eslint-disable-next-line global-require
    const { decodeJwtPayload } = require('../lib/k8s-auth')
    assert.equal(decodeJwtPayload('invalid-token'), null)
    assert.equal(decodeJwtPayload(null), null)
    assert.equal(decodeJwtPayload(''), null)
  })

  await t.test('detects expired token', () => {
    // eslint-disable-next-line global-require
    const { isTokenExpired } = require('../lib/k8s-auth')
    const expiredToken = encodeJwt({ exp: 1 })
    const validToken = encodeJwt({ exp: 9999999999 })
    assert.equal(isTokenExpired(expiredToken), true)
    assert.equal(isTokenExpired(validToken), false)
  })

  await t.test('returns true for token without exp claim', () => {
    // eslint-disable-next-line global-require
    const { isTokenExpired } = require('../lib/k8s-auth')
    const tokenNoExp = encodeJwt({ sub: 'test' })
    assert.equal(isTokenExpired(tokenNoExp), true)
  })

  await t.test('returns true for null token', () => {
    // eslint-disable-next-line global-require
    const { isTokenExpired } = require('../lib/k8s-auth')
    assert.equal(isTokenExpired(null), true)
  })

  await t.test('getK8sTokenAsync returns cached token if not expired', async () => {
    process.env.PLT_K8S_TOKEN = encodeJwt({ exp: 9999999999 })
    // eslint-disable-next-line global-require
    const { getK8sTokenAsync } = require('../lib/k8s-auth')
    const token = await getK8sTokenAsync()
    assert.equal(token, process.env.PLT_K8S_TOKEN)
    delete process.env.PLT_K8S_TOKEN
  })

  await t.test('getK8sTokenAsync reloads expired token from file', async () => {
    const currentTime = Math.floor(Date.now() / 1000)
    const expiredToken = encodeJwt({ exp: currentTime - 100 })
    const newToken = encodeJwt({ exp: currentTime + 3600 })

    await mkdir(tmpDir, { recursive: true })
    await writeFile(tokenPath, newToken)

    process.env.PLT_K8S_TOKEN_PATH = tokenPath
    process.env.PLT_K8S_TOKEN = expiredToken

    // eslint-disable-next-line global-require
    const { getK8sTokenAsync } = require('../lib/k8s-auth')
    const token = await getK8sTokenAsync()
    assert.equal(token, newToken)

    delete process.env.PLT_K8S_TOKEN_PATH
    delete process.env.PLT_K8S_TOKEN
  })

  await t.test('k8sAuthHeaders returns authorization header with token', () => {
    process.env.PLT_K8S_TOKEN = 'test-token'
    // eslint-disable-next-line global-require
    const { k8sAuthHeaders } = require('../lib/k8s-auth')
    const headers = k8sAuthHeaders()
    assert.deepEqual(headers, { authorization: 'Bearer test-token' })
    delete process.env.PLT_K8S_TOKEN
  })

  await t.test('k8sAuthHeaders returns empty object if no token', () => {
    delete process.env.PLT_K8S_TOKEN
    // eslint-disable-next-line global-require
    const { k8sAuthHeaders } = require('../lib/k8s-auth')
    const headers = k8sAuthHeaders()
    assert.deepEqual(headers, {})
  })

  await t.test('k8sAuthHeadersAsync returns authorization header with valid token', async () => {
    process.env.PLT_K8S_TOKEN = encodeJwt({ exp: 9999999999 })
    // eslint-disable-next-line global-require
    const { k8sAuthHeadersAsync } = require('../lib/k8s-auth')
    const headers = await k8sAuthHeadersAsync()
    assert.deepEqual(headers, { authorization: `Bearer ${process.env.PLT_K8S_TOKEN}` })
    delete process.env.PLT_K8S_TOKEN
  })

  await t.test('k8sAuthHeadersAsync reloads expired token from file', async () => {
    const currentTime = Math.floor(Date.now() / 1000)
    const expiredToken = encodeJwt({ exp: currentTime - 100 })
    const newToken = encodeJwt({ exp: currentTime + 3600 })

    await mkdir(tmpDir, { recursive: true })
    await writeFile(tokenPath, newToken)

    process.env.PLT_K8S_TOKEN_PATH = tokenPath
    process.env.PLT_K8S_TOKEN = expiredToken

    // eslint-disable-next-line global-require
    const { k8sAuthHeadersAsync } = require('../lib/k8s-auth')
    const headers = await k8sAuthHeadersAsync()
    assert.deepEqual(headers, { authorization: `Bearer ${newToken}` })

    delete process.env.PLT_K8S_TOKEN_PATH
    delete process.env.PLT_K8S_TOKEN
  })

  await t.test('k8sAuthHeadersAsync returns empty object if no token', async () => {
    delete process.env.PLT_K8S_TOKEN
    // eslint-disable-next-line global-require
    const { k8sAuthHeadersAsync } = require('../lib/k8s-auth')
    const headers = await k8sAuthHeadersAsync()
    assert.deepEqual(headers, {})
  })

  await t.test('loadToken handles missing token file gracefully', async () => {
    process.env.PLT_K8S_TOKEN_PATH = '/nonexistent/path/token'
    delete process.env.PLT_K8S_TOKEN

    // eslint-disable-next-line global-require
    const { loadToken } = require('../lib/k8s-auth')
    const token = await loadToken()
    assert.equal(token, null)

    delete process.env.PLT_K8S_TOKEN_PATH
  })
})
