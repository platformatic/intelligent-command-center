'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { getServer } = require('../helper')
const { MockAgent, getGlobalDispatcher, setGlobalDispatcher } = require('undici')

test('should logout and return set-cookie headers from user-manager', async (t) => {
  const iccEntrypoint = await getServer(t)
  await iccEntrypoint.start()
  // Mock user Manager
  const agent = new MockAgent()
  setGlobalDispatcher(agent)
  agent.get('http://user-manager.plt.local')
    .intercept({
      method: 'POST',
      path: '/logout'
    })
    .reply((options) => {
      return {
        data: {},
        statusCode: 200,
        responseOptions: {
          headers: {
            'set-cookie': 'set-this-cookie'
          }
        }

      }
    })
  const gd = getGlobalDispatcher()
  t.after(() => setGlobalDispatcher(gd))

  const { statusCode, headers } = await iccEntrypoint.inject({
    method: 'GET',
    path: '/api/logout'
  })
  assert.equal(statusCode, 302)
  // checks the cookie set is coming from user-manager
  assert.equal(headers['set-cookie'], 'set-this-cookie')
})
