'use strict'

const { test } = require('node:test')
const assert = require('assert')
const helper = require('../helper')
const { MockAgent, setGlobalDispatcher, getGlobalDispatcher } = require('undici')

test('should record scaling activity', async (t) => {
  const app = await helper.buildServer(t)

  let recordedActivity = null

  // Set up mock agent
  const originalDispatcher = getGlobalDispatcher()
  const mockAgent = new MockAgent()
  mockAgent.disableNetConnect()
  setGlobalDispatcher(mockAgent)
  t.after(() => setGlobalDispatcher(originalDispatcher))

  // Mock control-plane GET request
  const mockControlPlane = mockAgent.get('http://control-plane.plt.local')
  mockControlPlane
    .intercept({
      path: '/applications/test-app-id',
      method: 'GET'
    })
    .reply(200, { name: 'test-app' })
    .persist()

  // Mock activities POST request
  const mockActivities = mockAgent.get('http://activities.plt.local')
  mockActivities
    .intercept({
      path: '/events',
      method: 'POST'
    })
    .reply((opts) => {
      recordedActivity = JSON.parse(opts.body)
      return { statusCode: 201, data: {} }
    })
    .persist()

  // Test scale up
  await app.recordScalingActivity('test-app-id', 2, 4, 'up', 'High CPU usage')

  assert.deepStrictEqual(recordedActivity, {
    type: 'SCALED_UP',
    applicationId: 'test-app-id',
    targetId: 'test-app-id',
    success: true,
    data: {
      applicationName: 'test-app',
      oldReplicas: 2,
      newReplicas: 4,
      reason: 'High CPU usage'
    }
  })

  // Test scale down
  await app.recordScalingActivity('test-app-id', 4, 2, 'down', 'Low CPU usage')

  assert.deepStrictEqual(recordedActivity, {
    type: 'SCALED_DOWN',
    applicationId: 'test-app-id',
    targetId: 'test-app-id',
    success: true,
    data: {
      applicationName: 'test-app',
      oldReplicas: 4,
      newReplicas: 2,
      reason: 'Low CPU usage'
    }
  })
})

test('should handle missing application name gracefully', async (t) => {
  const app = await helper.buildServer(t)

  let recordedActivity = null

  // Set up mock agent
  const originalDispatcher = getGlobalDispatcher()
  const mockAgent = new MockAgent()
  mockAgent.disableNetConnect()
  setGlobalDispatcher(mockAgent)
  t.after(() => setGlobalDispatcher(originalDispatcher))

  // Mock control-plane GET request with 404
  const mockControlPlane = mockAgent.get('http://control-plane.plt.local')
  mockControlPlane
    .intercept({
      path: '/applications/test-app-id',
      method: 'GET'
    })
    .reply(404, { error: 'Application not found' })

  // Mock activities POST request
  const mockActivities = mockAgent.get('http://activities.plt.local')
  mockActivities
    .intercept({
      path: '/events',
      method: 'POST'
    })
    .reply((opts) => {
      recordedActivity = JSON.parse(opts.body)
      return { statusCode: 201, data: {} }
    })

  await app.recordScalingActivity('test-app-id', 2, 4, 'up', 'High CPU usage')

  assert.deepStrictEqual(recordedActivity, {
    type: 'SCALED_UP',
    applicationId: 'test-app-id',
    targetId: 'test-app-id',
    success: true,
    data: {
      applicationName: 'Unknown',
      oldReplicas: 2,
      newReplicas: 4,
      reason: 'High CPU usage'
    }
  })
})

test('should handle activities service errors gracefully', async (t) => {
  const app = await helper.buildServer(t)

  // Set up mock agent
  const originalDispatcher = getGlobalDispatcher()
  const mockAgent = new MockAgent()
  mockAgent.disableNetConnect()
  setGlobalDispatcher(mockAgent)
  t.after(() => setGlobalDispatcher(originalDispatcher))

  // Mock control-plane GET request
  const mockControlPlane = mockAgent.get('http://control-plane.plt.local')
  mockControlPlane
    .intercept({
      path: '/applications/test-app-id',
      method: 'GET'
    })
    .reply(200, { name: 'test-app' })

  // Mock activities POST request with error
  const mockActivities = mockAgent.get('http://activities.plt.local')
  mockActivities
    .intercept({
      path: '/events',
      method: 'POST'
    })
    .reply(500, { error: 'Activities service error' })

  // Should not throw
  await assert.doesNotReject(async () => {
    await app.recordScalingActivity('test-app-id', 2, 4, 'up', 'High CPU usage')
  })
})
