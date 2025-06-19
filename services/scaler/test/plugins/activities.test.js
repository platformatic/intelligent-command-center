'use strict'

const { test } = require('node:test')
const assert = require('assert')
const helper = require('../helper')

test('should record scaling activity', async (t) => {
  const app = await helper.buildServer(t)

  let recordedActivity = null

  // Mock the clients
  app.platformaticContext = {
    clients: {
      controlPlane: {
        getApplication: async ({ applicationId }) => {
          assert.strictEqual(applicationId, 'test-app-id')
          return { name: 'test-app' }
        }
      },
      activities: {
        postEvents: async (event) => {
          recordedActivity = event
        }
      }
    }
  }

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

  // Mock the clients with error
  app.platformaticContext = {
    clients: {
      controlPlane: {
        getApplication: async () => {
          throw new Error('Application not found')
        }
      },
      activities: {
        postEvents: async (event) => {
          recordedActivity = event
        }
      }
    }
  }

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

  // Mock the clients with error
  app.platformaticContext = {
    clients: {
      controlPlane: {
        getApplication: async () => {
          return { name: 'test-app' }
        }
      },
      activities: {
        postEvents: async () => {
          throw new Error('Activities service error')
        }
      }
    }
  }

  // Should not throw
  await assert.doesNotReject(async () => {
    await app.recordScalingActivity('test-app-id', 2, 4, 'up', 'High CPU usage')
  })
})
