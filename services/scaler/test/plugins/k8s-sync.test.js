'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { setTimeout } = require('timers/promises')
const { buildServer } = require('../helper')

test('k8s-sync plugin syncControllerData updates controllers and creates scale events', async (t) => {
  const applicationId = '123e4567-e89b-12d3-a456-426614174000'
  const deploymentId = '123e4567-e89b-12d3-a456-426614174001'
  const controllerId = 'test-controller-1'
  const namespace = 'default'

  const server = await buildServer(t)

  const controller = await server.platformatic.entities.controller.save({
    input: {
      applicationId,
      deploymentId,
      k8SControllerId: controllerId,
      namespace,
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      replicas: 2
    }
  })

  server.machinist.getController = async (id, ns, apiVersion, kind) => {
    return {
      replicas: 5,
      metadata: { name: controllerId }
    }
  }

  await server.k8sSync.syncControllerData()

  const updatedController = await server.platformatic.entities.controller.find({
    where: { id: { eq: controller.id } }
  })
  assert.strictEqual(updatedController.length, 1)
  assert.strictEqual(updatedController[0].replicas, 5)

  const scaleEvents = await server.platformatic.entities.scaleEvent.find({
    where: { applicationId: { eq: applicationId } },
    orderBy: [{ field: 'createdAt', direction: 'desc' }]
  })
  assert.strictEqual(scaleEvents.length, 1)

  const scaleEvent = scaleEvents[0]
  assert.strictEqual(scaleEvent.applicationId, applicationId)
  assert.strictEqual(scaleEvent.direction, 'up')
  assert.strictEqual(scaleEvent.replicas, 5)
  assert.strictEqual(scaleEvent.replicasDiff, 3)
  assert.strictEqual(scaleEvent.reason, 'sync with k8s controller')
  assert.strictEqual(scaleEvent.sync, true)
})

test('k8s-sync plugin handles no replica changes', async (t) => {
  const applicationId = '123e4567-e89b-12d3-a456-426614174002'
  const deploymentId = '123e4567-e89b-12d3-a456-426614174003'
  const controllerId = 'test-controller-2'
  const namespace = 'default'

  const server = await buildServer(t)

  const controller = await server.platformatic.entities.controller.save({
    input: {
      applicationId,
      deploymentId,
      k8SControllerId: controllerId,
      namespace,
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      replicas: 3
    }
  })

  server.machinist.getController = async () => {
    return { replicas: 3 }
  }

  const initialScaleEvents = await server.platformatic.entities.scaleEvent.find({
    where: { applicationId: { eq: applicationId } }
  })

  await server.k8sSync.syncControllerData()

  const updatedController = await server.platformatic.entities.controller.find({
    where: { id: { eq: controller.id } }
  })
  assert.strictEqual(updatedController.length, 1)
  assert.strictEqual(updatedController[0].replicas, 3)

  const finalScaleEvents = await server.platformatic.entities.scaleEvent.find({
    where: { applicationId: { eq: applicationId } }
  })
  assert.strictEqual(finalScaleEvents.length, initialScaleEvents.length)
})

test('k8s-sync plugin handles scale down scenario', async (t) => {
  const applicationId = '123e4567-e89b-12d3-a456-426614174004'
  const deploymentId = '123e4567-e89b-12d3-a456-426614174005'
  const controllerId = 'test-controller-3'
  const namespace = 'test-ns'

  const server = await buildServer(t)

  const controller = await server.platformatic.entities.controller.save({
    input: {
      applicationId,
      deploymentId,
      k8SControllerId: controllerId,
      namespace,
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      replicas: 5
    }
  })

  server.machinist.getController = async () => {
    return { replicas: 2 }
  }

  await server.k8sSync.syncControllerData()

  const updatedController = await server.platformatic.entities.controller.find({
    where: { id: { eq: controller.id } }
  })
  assert.strictEqual(updatedController.length, 1)
  assert.strictEqual(updatedController[0].replicas, 2)

  const scaleEvents = await server.platformatic.entities.scaleEvent.find({
    where: { applicationId: { eq: applicationId } },
    orderBy: [{ field: 'createdAt', direction: 'desc' }]
  })
  assert.strictEqual(scaleEvents.length, 1)

  const scaleEvent = scaleEvents[0]
  assert.strictEqual(scaleEvent.applicationId, applicationId)
  assert.strictEqual(scaleEvent.direction, 'down')
  assert.strictEqual(scaleEvent.replicas, 2)
  assert.strictEqual(scaleEvent.replicasDiff, 3)
  assert.strictEqual(scaleEvent.reason, 'sync with k8s controller')
  assert.strictEqual(scaleEvent.sync, true)
})

test('k8s-sync plugin handles machinist API failures gracefully', async (t) => {
  const applicationId = '123e4567-e89b-12d3-a456-426614174006'
  const deploymentId = '123e4567-e89b-12d3-a456-426614174007'
  const controllerId = 'test-controller-4'
  const namespace = 'default'

  const server = await buildServer(t)

  await server.platformatic.entities.controller.save({
    input: {
      applicationId,
      deploymentId,
      k8SControllerId: controllerId,
      namespace,
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      replicas: 2
    }
  })

  server.machinist.getController = async () => {
    throw new Error('K8s API connection failed')
  }

  await server.k8sSync.syncControllerData()

  const controllers = await server.platformatic.entities.controller.find({
    where: { applicationId: { eq: applicationId } }
  })
  assert.strictEqual(controllers.length, 1)
  assert.strictEqual(controllers[0].replicas, 2)

  const scaleEvents = await server.platformatic.entities.scaleEvent.find({
    where: { applicationId: { eq: applicationId } }
  })
  assert.strictEqual(scaleEvents.length, 0)
})

test('k8s-sync plugin handles mixed success and failure scenarios', async (t) => {
  const applicationId1 = '123e4567-e89b-12d3-a456-426614174008'
  const applicationId2 = '123e4567-e89b-12d3-a456-426614174009'
  const deploymentId1 = '123e4567-e89b-12d3-a456-426614174010'
  const deploymentId2 = '123e4567-e89b-12d3-a456-426614174011'

  const server = await buildServer(t)

  await server.platformatic.entities.controller.save({
    input: {
      applicationId: applicationId1,
      deploymentId: deploymentId1,
      k8SControllerId: 'success-controller',
      namespace: 'default',
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      replicas: 1
    }
  })

  await server.platformatic.entities.controller.save({
    input: {
      applicationId: applicationId2,
      deploymentId: deploymentId2,
      k8SControllerId: 'fail-controller',
      namespace: 'default',
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      replicas: 1
    }
  })

  server.machinist.getController = async (id) => {
    if (id === 'success-controller') {
      return { replicas: 3 }
    } else {
      throw new Error('Controller not found')
    }
  }

  await server.k8sSync.syncControllerData()

  const successController = await server.platformatic.entities.controller.find({
    where: { applicationId: { eq: applicationId1 } }
  })
  assert.strictEqual(successController.length, 1)
  assert.strictEqual(successController[0].replicas, 3)

  const failController = await server.platformatic.entities.controller.find({
    where: { applicationId: { eq: applicationId2 } }
  })
  assert.strictEqual(failController.length, 1)
  assert.strictEqual(failController[0].replicas, 1)

  const scaleEvents = await server.platformatic.entities.scaleEvent.find({
    where: { applicationId: { eq: applicationId1 } }
  })
  assert.strictEqual(scaleEvents.length, 1)
  assert.strictEqual(scaleEvents[0].sync, true)

  const failScaleEvents = await server.platformatic.entities.scaleEvent.find({
    where: { applicationId: { eq: applicationId2 } }
  })
  assert.strictEqual(failScaleEvents.length, 0)
})

test('k8s-sync plugin processes only the most recent controller per application', async (t) => {
  const applicationId = '123e4567-e89b-12d3-a456-426614174100'
  const deploymentId1 = '123e4567-e89b-12d3-a456-426614174101'
  const deploymentId2 = '123e4567-e89b-12d3-a456-426614174102'
  const deploymentId3 = '123e4567-e89b-12d3-a456-426614174103'

  const server = await buildServer(t)

  // Create three controllers for the same application with different created times
  const controller1 = await server.platformatic.entities.controller.save({
    input: {
      applicationId,
      deploymentId: deploymentId1,
      k8SControllerId: 'old-controller',
      namespace: 'default',
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      replicas: 2
    }
  })

  // Wait a bit to ensure different timestamps
  await setTimeout(10)

  const controller2 = await server.platformatic.entities.controller.save({
    input: {
      applicationId,
      deploymentId: deploymentId2,
      k8SControllerId: 'middle-controller',
      namespace: 'default',
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      replicas: 3
    }
  })

  await setTimeout(10)

  const controller3 = await server.platformatic.entities.controller.save({
    input: {
      applicationId,
      deploymentId: deploymentId3,
      k8SControllerId: 'newest-controller',
      namespace: 'default',
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      replicas: 4
    }
  })

  let calledControllerId = null
  server.machinist.getController = async (id) => {
    calledControllerId = id
    if (id === 'newest-controller') {
      return { replicas: 6 }
    } else if (id === 'middle-controller') {
      return { replicas: 5 }
    } else {
      return { replicas: 3 }
    }
  }

  await server.k8sSync.syncControllerData()

  // Should only have called machinist for the newest controller
  assert.strictEqual(calledControllerId, 'newest-controller')

  // Check that only the newest controller was updated
  const updatedController1 = await server.platformatic.entities.controller.find({
    where: { id: { eq: controller1.id } }
  })
  assert.strictEqual(updatedController1[0].replicas, 2, 'Old controller should not be updated')

  const updatedController2 = await server.platformatic.entities.controller.find({
    where: { id: { eq: controller2.id } }
  })
  assert.strictEqual(updatedController2[0].replicas, 3, 'Middle controller should not be updated')

  const updatedController3 = await server.platformatic.entities.controller.find({
    where: { id: { eq: controller3.id } }
  })
  assert.strictEqual(updatedController3[0].replicas, 6, 'Newest controller should be updated')

  // Should only have one scale event for this application
  const scaleEvents = await server.platformatic.entities.scaleEvent.find({
    where: { applicationId: { eq: applicationId } }
  })
  assert.strictEqual(scaleEvents.length, 1)
  assert.strictEqual(scaleEvents[0].replicas, 6)
  assert.strictEqual(scaleEvents[0].replicasDiff, 2)
  assert.strictEqual(scaleEvents[0].direction, 'up')
})

test('k8s-sync plugin handles multiple applications with multiple controllers each', async (t) => {
  const applicationId1 = '123e4567-e89b-12d3-a456-426614174200'
  const applicationId2 = '123e4567-e89b-12d3-a456-426614174201'

  const server = await buildServer(t)

  // Create two old controllers for app1
  await server.platformatic.entities.controller.save({
    input: {
      applicationId: applicationId1,
      deploymentId: '123e4567-e89b-12d3-a456-426614174202',
      k8SControllerId: 'app1-old',
      namespace: 'default',
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      replicas: 1
    }
  })

  await setTimeout(10)

  await server.platformatic.entities.controller.save({
    input: {
      applicationId: applicationId1,
      deploymentId: '123e4567-e89b-12d3-a456-426614174203',
      k8SControllerId: 'app1-new',
      namespace: 'default',
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      replicas: 2
    }
  })

  // Create two old controllers for app2
  await server.platformatic.entities.controller.save({
    input: {
      applicationId: applicationId2,
      deploymentId: '123e4567-e89b-12d3-a456-426614174204',
      k8SControllerId: 'app2-old',
      namespace: 'staging',
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      replicas: 3
    }
  })

  await setTimeout(10)

  await server.platformatic.entities.controller.save({
    input: {
      applicationId: applicationId2,
      deploymentId: '123e4567-e89b-12d3-a456-426614174205',
      k8SControllerId: 'app2-new',
      namespace: 'staging',
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      replicas: 4
    }
  })

  const calledControllerIds = []
  server.machinist.getController = async (id) => {
    calledControllerIds.push(id)
    if (id === 'app1-new') {
      return { replicas: 5 }
    } else if (id === 'app2-new') {
      return { replicas: 7 }
    } else {
      throw new Error(`Should not call old controller ${id}`)
    }
  }

  await server.k8sSync.syncControllerData()

  // Should have called machinist for both newest controllers only
  assert.strictEqual(calledControllerIds.length, 2)
  assert.ok(calledControllerIds.includes('app1-new'))
  assert.ok(calledControllerIds.includes('app2-new'))

  // Check scale events for both applications
  const app1ScaleEvents = await server.platformatic.entities.scaleEvent.find({
    where: { applicationId: { eq: applicationId1 } }
  })
  assert.strictEqual(app1ScaleEvents.length, 1)
  assert.strictEqual(app1ScaleEvents[0].replicas, 5)

  const app2ScaleEvents = await server.platformatic.entities.scaleEvent.find({
    where: { applicationId: { eq: applicationId2 } }
  })
  assert.strictEqual(app2ScaleEvents.length, 1)
  assert.strictEqual(app2ScaleEvents[0].replicas, 7)
})
