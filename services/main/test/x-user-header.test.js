'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { getComposerWithService } = require('./helper')
const { MockAgent, setGlobalDispatcher, getGlobalDispatcher } = require('undici')
const fastify = require('fastify')
test('should set x-user header when proxying a request to an internal service', async (t) => {
  // starts a dummy echo server
  const headersEchoServer = fastify()
  headersEchoServer.get('/headers', async (request) => {
    return { headers: request.headers }
  })
  const headersEchoOrigin = await headersEchoServer.listen({ port: 0 })

  // create composer to route request to that echo server
  const server = await getComposerWithService(t, [
    {
      id: 'headers-echo',
      origin: headersEchoOrigin
    }
  ])

  const testUser = {
    id: 123456,
    email: 'foo@bar.com',
    username: 'foobar'
  }
  await server.start()
  const agent = new MockAgent()
  const gd = getGlobalDispatcher()

  setGlobalDispatcher(agent)
  agent
    .get('http://user-manager.plt.local')
    .intercept({
      method: 'POST',
      path: '/authorize'
    }).reply((options) => {
      assert.equal(options.headers.cookie, 'auth-cookie-name=this-is-a-mocked-cookie')
      return {
        statusCode: 200,
        data: {
          authorized: true,
          user: testUser
        }
      }
    })

  t.after(() => {
    server.close()
    headersEchoServer.close()
    setGlobalDispatcher(gd)
  })

  const res = await server.inject({
    method: 'GET',
    path: 'headers-echo/headers',
    headers: {
      cookie: 'auth-cookie-name=this-is-a-mocked-cookie'
    }
  })
  const userInHeaders = res.json().headers['x-user']
  assert.equal(res.statusCode, 200)
  assert.deepEqual(userInHeaders, JSON.stringify(testUser))
})
