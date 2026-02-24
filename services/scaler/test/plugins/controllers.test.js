'use strict'

const { test } = require('node:test')
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

test('getApplicationControllers should return all controllers for an application', async (t) => {
  await startMachinist(t)

  const server = await buildServer(t)
  t.after(async () => {
    await server.close()
  })

  const applicationId = '123e4567-e89b-12d3-a456-426614174000'

  await server.platformatic.entities.controller.save({
    input: {
      applicationId,
      deploymentId: '123e4567-e89b-12d3-a456-426614174001',
      k8SControllerId: 'controller-v1',
      namespace: 'test-namespace',
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      replicas: 2
    }
  })

  await server.platformatic.entities.controller.save({
    input: {
      applicationId,
      deploymentId: '123e4567-e89b-12d3-a456-426614174002',
      k8SControllerId: 'controller-v2',
      namespace: 'test-namespace',
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      replicas: 3
    }
  })

  const controllers = await server.getApplicationControllers(applicationId)
  assert.strictEqual(controllers.length, 2)
  const controllerIds = controllers.map(c => c.k8SControllerId).sort()
  assert.deepStrictEqual(controllerIds, ['controller-v1', 'controller-v2'])
})

test('getApplicationControllers should return empty array when no controllers exist', async (t) => {
  await startMachinist(t)

  const server = await buildServer(t)
  t.after(async () => {
    await server.close()
  })

  const controllers = await server.getApplicationControllers('123e4567-e89b-12d3-a456-426614174999')
  assert.strictEqual(controllers.length, 0)
})

test('updateControllerReplicas should use provided controller instead of looking up', async (t) => {
  await startMachinist(t)

  const server = await buildServer(t)
  t.after(async () => {
    await server.close()
  })

  const applicationId = '123e4567-e89b-12d3-a456-426614174000'

  const controllerV1 = await server.platformatic.entities.controller.save({
    input: {
      applicationId,
      deploymentId: '123e4567-e89b-12d3-a456-426614174001',
      k8SControllerId: 'controller-v1',
      namespace: 'test-namespace',
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      replicas: 2
    }
  })

  await server.platformatic.entities.controller.save({
    input: {
      applicationId,
      deploymentId: '123e4567-e89b-12d3-a456-426614174002',
      k8SControllerId: 'controller-v2',
      namespace: 'test-namespace',
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      replicas: 5
    }
  })

  server.machinist.updateController = async () => {}

  // Pass controllerV1 explicitly - should scale that one, not the latest (v2)
  await server.updateControllerReplicas(applicationId, 4, 'Scale v1', controllerV1)

  const updatedV1 = await server.platformatic.entities.controller.find({
    where: { k8SControllerId: { eq: 'controller-v1' } }
  })
  assert.strictEqual(updatedV1[0].replicas, 4)

  // v2 should be unchanged
  const unchangedV2 = await server.platformatic.entities.controller.find({
    where: { k8SControllerId: { eq: 'controller-v2' } }
  })
  assert.strictEqual(unchangedV2[0].replicas, 5)
})
