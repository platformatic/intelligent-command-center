'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { startControlPlane, startMachinist } = require('./helper')

test('should get an application k8s state', async (t) => {
  const applicationName = 'test-app'
  const machineId = 'test-pod-3'
  const imageId = 'test-image-1'

  const machines = [
    {
      id: machineId,
      status: 'running',
      startTime: '2023-01-01T00:00:00Z',
      resources: {
        limits: {
          cpu: '1',
          memory: '1Gi'
        },
        requests: {
          cpu: '1',
          memory: '1Gi'
        }
      }
    }
  ]

  await startMachinist(t, {
    getMachines: () => machines
  })

  const controlPlane = await startControlPlane(t)

  const { application } = await controlPlane.testApi.saveInstance(
    applicationName,
    imageId,
    machineId
  )

  const { statusCode, body } = await controlPlane.inject({
    url: `/applications/${application.id}/k8s/state`
  })
  assert.strictEqual(statusCode, 200, body)

  const { pods } = JSON.parse(body)
  assert.strictEqual(pods.length, 1)

  const pod1 = pods[0]
  assert.strictEqual(pod1.id, machineId)
  assert.strictEqual(pod1.status, 'running')
  assert.strictEqual(pod1.startTime, '2023-01-01T00:00:00Z')
  assert.deepStrictEqual(pod1.resources, {
    limits: {
      cpu: '1',
      memory: '1Gi'
    },
    requests: {
      cpu: '1',
      memory: '1Gi'
    }
  })
})
