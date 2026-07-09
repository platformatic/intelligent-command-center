'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const fastify = require('fastify')
const fp = require('fastify-plugin')
const cookiePlugin = require('../../lib/plugins/cookie')
const authorizationPlugin = require('../../lib/plugins/authorization')
const k8sTokenPlugin = require('../../lib/plugins/k8s-token')
const machineAuthPlugin = require('../../lib/plugins/machine-authentication')
const { MockAgent, setGlobalDispatcher } = require('undici')
const { mockAuthorizeEndpoint } = require('../helper')

const agent = new MockAgent()
setGlobalDispatcher(agent)

process.env.PLT_ICC_SESSION_SECRET = 'test-secret'

async function createMinimalFastifyInstance (t, config = {}) {
  const server = fastify()
  server.register(cookiePlugin)
  await server.register(fp(async function (app) {
    app.decorate('config', config)
  }, { name: 'config' }))
  server.register(k8sTokenPlugin)
  server.register(machineAuthPlugin)

  server.register(authorizationPlugin)
  t.after(() => {
    server.close()
  })

  return server
}

test('should ignore PLT_MAIN_DISABLE_AUTHORIZATION flag', async (t) => {
  const server = await createMinimalFastifyInstance(t, {
    PLT_MAIN_DISABLE_AUTHORIZATION: true
  })

  mockAuthorizeEndpoint(agent, (method, path, what) => {
    assert.fail()
  })
  server.get('/foo/bar', async (req, res) => {
    return { foo: 'bar' }
  })
  await server.listen({
    port: 0
  })
  const res = await server.inject({
    method: 'GET',
    path: '/foo/bar'
  })
  const json = res.json()
  assert.equal(res.statusCode, 401)
  assert.deepEqual(json, {
    code: 'PLT_MAIN_MISSING_AUTH_CREDENTIALS',
    error: 'Unauthorized',
    message: 'Missing authorization credentials',
    statusCode: 401
  })
})

test('should check the method', async (t) => {
  const server = await createMinimalFastifyInstance(t)
  server.get('/control-plane/applications/8e068b61-8972-42ac-847f-8ebf36642f66/state', async (req, res) => {
    assert.fail()
  })
  await server.listen({
    port: 0
  })

  const res = await server.inject({
    method: 'GET',
    path: '/control-plane/applications/8e068b61-8972-42ac-847f-8ebf36642f66/state'
  })
  const json = res.json()
  assert.equal(res.statusCode, 401)
  // the following check ensure that the currentUrlIsWhiteListed() method returns false
  assert.deepEqual(json, {
    code: 'PLT_MAIN_MISSING_AUTH_CREDENTIALS',
    error: 'Unauthorized',
    message: 'Missing authorization credentials',
    statusCode: 401
  })
})

test('preflight route always gets through', async (t) => {
  const server = await createMinimalFastifyInstance(t)
  mockAuthorizeEndpoint(agent, (method, path, what) => {
    assert.fail()
  })
  server.options('/foo/bar', async (req, res) => {
    return { cors: 'ok' }
  })
  await server.listen({
    port: 0
  })
  const res = await server.inject({
    method: 'OPTIONS',
    path: '/foo/bar'
  })
  const json = res.json()
  assert.equal(res.statusCode, 200)
  assert.deepEqual(json, {
    cors: 'ok'
  })
})

test('should whitelist OpenaAPI spec for internal service', async (t) => {
  const server = await createMinimalFastifyInstance(t)
  let endpointReached = false
  server.get('/control-plane/documentation/json', async (req, res) => {
    endpointReached = true
    return { foo: 'bar' }
  })
  const res = await server.inject({
    method: 'GET',
    path: '/control-plane/documentation/json'

  })
  const json = res.json()
  assert.equal(res.statusCode, 200)
  assert.deepEqual(json, {
    foo: 'bar'
  })
  assert.equal(endpointReached, true)
})

test('should NOT whitelist OpenaAPI spec for an unknown service', async (t) => {
  const server = await createMinimalFastifyInstance(t)
  server.get('/control-plane/documentation/json', async (req, res) => {
    return { foo: 'bar' }
  })
  const res = await server.inject({
    method: 'GET',
    path: '/unknown/documentation/json'

  })
  const json = res.json()
  assert.equal(res.statusCode, 401)
  assert.deepEqual(json, {
    code: 'PLT_MAIN_MISSING_AUTH_CREDENTIALS',
    error: 'Unauthorized',
    message: 'Missing authorization credentials',
    statusCode: 401
  })
})

function mockDeployTokenVerify (decision) {
  agent
    .get('http://control-plane.plt.local')
    .intercept({ method: 'POST', path: '/deploy-tokens/verify' })
    .reply(200, decision)
}

test('deploy token: an authorized bearer reaches the route with x-user injected', async (t) => {
  const server = await createMinimalFastifyInstance(t)
  mockDeployTokenVerify({
    authorized: true,
    principal: { type: 'deploy-token', id: 't1', name: 'gha-prod', applicationId: 'app-1' }
  })

  let seenXUser = null
  server.post('/control-plane/applications/app-1/versions', async (req) => {
    seenXUser = req.headers['x-user']
    return { ok: true }
  })
  await server.listen({ port: 0 })

  const res = await server.inject({
    method: 'POST',
    path: '/control-plane/applications/app-1/versions',
    headers: { authorization: 'Bearer plt_deploy_abc123' }
  })

  assert.equal(res.statusCode, 200)
  const principal = JSON.parse(seenXUser)
  assert.equal(principal.type, 'deploy-token')
  assert.equal(principal.name, 'gha-prod')
})

test('deploy token: an unauthorized bearer is rejected', async (t) => {
  const server = await createMinimalFastifyInstance(t)
  mockDeployTokenVerify({ authorized: false, reason: 'route-not-allowed' })

  server.post('/control-plane/applications/app-1/versions', async () => {
    assert.fail('handler should not be reached')
  })
  await server.listen({ port: 0 })

  const res = await server.inject({
    method: 'POST',
    path: '/control-plane/applications/app-1/versions',
    headers: { authorization: 'Bearer plt_deploy_abc123' }
  })

  // 403: the bearer is present but not authorized (and a uniform 403 avoids
  // leaking whether the token exists).
  assert.equal(res.statusCode, 403)
})
