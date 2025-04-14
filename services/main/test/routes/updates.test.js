'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { getServer } = require('../helper')
const { MockAgent, getGlobalDispatcher, setGlobalDispatcher } = require('undici')

test('should poll only specific services for updates', async (t) => {
  const enabledServices = ['cluster-manager', 'auth']
  const iccEntrypoint = await getServer(t, {
    PLT_SERVICES_WITH_UPDATE_ROUTE: enabledServices.join(',')
  })
  await iccEntrypoint.start()
  // Mock user Manager
  const agent = new MockAgent()
  setGlobalDispatcher(agent)

  const calledServices = []
  for (const s of enabledServices) {
    agent.get(`http://${s}.plt.local`)
      .intercept({
        method: 'GET',
        path: '/updates'
      })
      .reply((options) => {
        calledServices.push(s)
        return {
          data: {
            serviceName: s,
            updates: []
          },
          statusCode: 200
        }
      })
  }

  const gd = getGlobalDispatcher()
  t.after(() => setGlobalDispatcher(gd))

  const { statusCode, body } = await iccEntrypoint.inject({
    method: 'GET',
    path: '/api/updates'
  })
  assert.equal(statusCode, 200, body)
  const json = JSON.parse(body)
  assert.equal(Object.keys(json).length, enabledServices.length)
  assert.deepEqual(calledServices, enabledServices)
  /**
   * Expect to return something like
   * {
      activities: [],
      auth: [],
      ...
      'user-manager': []
    }
   */
  for (const serviceUpdates of Object.values(json)) {
    assert.deepEqual(serviceUpdates, [])
  }
})

test('should return updates: [] for non 200 responses', async (t) => {
  const enabledServices = ['cluster-manager', 'auth']
  const iccEntrypoint = await getServer(t, {
    PLT_SERVICES_WITH_UPDATE_ROUTE: enabledServices.join(',')
  })
  await iccEntrypoint.start()
  // Mock user Manager
  const agent = new MockAgent()
  setGlobalDispatcher(agent)

  const calledServices = []
  for (const s of enabledServices) {
    agent.get(`http://${s}.plt.local`)
      .intercept({
        method: 'GET',
        path: '/updates'
      })
      .reply((options) => {
        calledServices.push(s)
        return {
          data: {
            statusCode: 404,
            code: 'FST_ERR_NOT_FOUND',
            error: 'Not found',
            message: 'Route GET /updates not found'
          },
          statusCode: 404
        }
      })
  }

  const gd = getGlobalDispatcher()
  t.after(() => setGlobalDispatcher(gd))

  const { statusCode, body } = await iccEntrypoint.inject({
    method: 'GET',
    path: '/api/updates'
  })
  const json = JSON.parse(body)
  assert.equal(statusCode, 200)

  assert.equal(Object.keys(json).length, enabledServices.length)
  assert.deepEqual(calledServices, enabledServices)
  /**
   * Expect to return something like
   * {
      activities: [],
      auth: [],
      ...
      'user-manager': []
    }
   */
  for (const serviceUpdates of Object.values(json)) {
    assert.deepEqual(serviceUpdates, [])
  }
})
