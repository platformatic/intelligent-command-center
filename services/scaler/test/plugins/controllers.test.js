'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { buildServer, startMachinist } = require('../helper')

test('updateControllerReplicas should create scale events', async (t) => {
  const applicationId = '123e4567-e89b-12d3-a456-426614174000'
  const deploymentId = '123e4567-e89b-12d3-a456-426614174001'
  const k8sControllerId = 'test-controller'
  const namespace = 'test-namespace'

  await startMachinist(t)

  const server = await buildServer(t)
  t.after(async () => {
    await server.close()
  })

  const controller = await server.platformatic.entities.controller.save({
    input: {
      applicationId,
      deploymentId,
      k8SControllerId: k8sControllerId,
      namespace,
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      replicas: 2
    }
  })

  server.machinist.updateController = async () => {}

  await server.updateControllerReplicas(applicationId, 5, 'High CPU usage detected')

  const updatedController = await server.getApplicationController(applicationId)
  assert.strictEqual(updatedController.replicas, 5)
  assert.strictEqual(updatedController.id, controller.id, 'Should update existing controller')

  const scaleEvents = await server.platformatic.entities.scaleEvent.find({
    orderBy: [{ field: 'createdAt', direction: 'desc' }]
  })
  assert.strictEqual(scaleEvents.length, 1)

  const scaleUpEvent = scaleEvents[0]
  assert.strictEqual(scaleUpEvent.applicationId, applicationId)
  assert.strictEqual(scaleUpEvent.direction, 'up')
  assert.strictEqual(scaleUpEvent.replicas, 5)
  assert.strictEqual(scaleUpEvent.replicasDiff, 3)
  assert.strictEqual(scaleUpEvent.reason, 'High CPU usage detected')

  await server.updateControllerReplicas(applicationId, 3, 'Low resource utilization')

  const updatedController2 = await server.getApplicationController(applicationId)
  assert.strictEqual(updatedController2.replicas, 3)
  assert.strictEqual(updatedController2.id, controller.id, 'Should still be same controller')

  const allScaleEvents = await server.platformatic.entities.scaleEvent.find({
    orderBy: [{ field: 'createdAt', direction: 'desc' }]
  })
  assert.strictEqual(allScaleEvents.length, 2)

  const scaleDownEvent = allScaleEvents[0]
  assert.strictEqual(scaleDownEvent.applicationId, applicationId)
  assert.strictEqual(scaleDownEvent.direction, 'down')
  assert.strictEqual(scaleDownEvent.replicas, 3)
  assert.strictEqual(scaleDownEvent.replicasDiff, -2)
  assert.strictEqual(scaleDownEvent.reason, 'Low resource utilization')
})

test('updateControllerReplicas should not create scale event when replicas unchanged', async (t) => {
  const applicationId = '123e4567-e89b-12d3-a456-426614174000'
  const deploymentId = '123e4567-e89b-12d3-a456-426614174001'
  const k8sControllerId = 'test-controller'
  const namespace = 'test-namespace'

  await startMachinist(t)

  const server = await buildServer(t)
  t.after(async () => {
    await server.close()
  })

  await server.platformatic.entities.controller.save({
    input: {
      applicationId,
      deploymentId,
      k8SControllerId: k8sControllerId,
      namespace,
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      replicas: 3
    }
  })

  server.machinist.updateController = async () => {}

  await server.updateControllerReplicas(applicationId, 3, 'No change needed')

  const scaleEvents = await server.platformatic.entities.scaleEvent.find()
  assert.strictEqual(scaleEvents.length, 0, 'No scale event should be created when replicas unchanged')
})

test('updateControllerReplicas should throw error when controller not found', async (t) => {
  await startMachinist(t)

  const server = await buildServer(t)
  t.after(async () => {
    await server.close()
  })

  const nonExistentAppId = '123e4567-e89b-12d3-a456-426614174999'
  await assert.rejects(
    async () => await server.updateControllerReplicas(nonExistentAppId, 5),
    {
      message: `Application controller not found for "${nonExistentAppId}" application`
    }
  )
})
