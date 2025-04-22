'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const fastify = require('fastify')
const fp = require('fastify-plugin')
const cookiePlugin = require('../../lib/plugins/cookie')
const authorizationPlugin = require('../../lib/plugins/authorization')
const k8sTokenPlugin = require('../../lib/plugins/k8s-token')
const k8sAuthPlugin = require('../../lib/plugins/k8s-authentication')
const { MockAgent, setGlobalDispatcher } = require('undici')
const { mockAuthorizeEndpoint } = require('../helper')

const agent = new MockAgent()
setGlobalDispatcher(agent)

async function createMinimalFastifyInstance (t, config = {}) {
  const server = fastify()
  server.register(cookiePlugin)
  await server.register(fp(async function (app) {
    app.decorate('config', config)
  }, { name: 'config' }))
  server.register(k8sTokenPlugin)
  server.register(k8sAuthPlugin)
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

test('should support whitelist of strings and regexp', async (t) => {
  const server = await createMinimalFastifyInstance(t)
  let endpointReached = false
  server.post('/control-plane/applications/8e068b61-8972-42ac-847f-8ebf36642f66/state', async (req, res) => {
    endpointReached = true
    return { foo: 'bar' }
  })
  await server.listen({
    port: 0
  })

  const res = await server.inject({
    method: 'POST',
    path: '/control-plane/applications/8e068b61-8972-42ac-847f-8ebf36642f66/state'
  })
  const json = res.json()
  assert.equal(res.statusCode, 200)
  assert.deepEqual(json, {
    foo: 'bar'
  })
  assert.equal(endpointReached, true)
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

test('should whitelist zio routes', async (t) => {
  const server = await createMinimalFastifyInstance(t)
  const uuid = '8e068b61-8972-42ac-847f-8ebf36642f66'
  // add full urls containing the uuid parameter (when needed)
  const urlToTest = [
    ['POST', `/control-plane/applications/${uuid}/state`],
    ['POST', `/control-plane/applications/${uuid}/status`],
    ['GET', `/control-plane/applications/${uuid}`]
  ]
  // add those routes to fastify instance
  for (let i = 0; i < urlToTest.length; i++) {
    const [method, url] = urlToTest[i]
    const fastifyMethod = method.toLowerCase()
    const parameterizedPath = url.replace(uuid, ':id') // replace the uuid with the :id parameter
    server[fastifyMethod](parameterizedPath, async (req, res) => {
      return { method, id: req.params.id, pass: true, key: req.query.key }
    })
  }

  await server.listen({
    port: 0
  })

  // call each of them with proper method
  for (let i = 0; i < urlToTest.length; i++) {
    const [method, url] = urlToTest[i]
    {
      const res = await server.inject({
        method,
        path: url
      })
      const json = res.json()
      assert.equal(res.statusCode, 200)
      assert.deepEqual(json, {
        method,
        pass: true,
        id: uuid
      })
    }
    {
      // with a ?key=123456 parame
      const res = await server.inject({
        method,
        path: `${url}?key=123456`
      })
      const json = res.json()
      assert.equal(res.statusCode, 200)
      assert.deepEqual(json, {
        method,
        pass: true,
        id: uuid,
        key: 123456
      })
    }
  }
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
