'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')
const { randomUUID } = require('node:crypto')
const { buildServer, startMachinist } = require('../helper')

test('should save a new controller', async (t) => {
  const controllerId = 'controller-id'
  const kind = 'Controller'
  const apiVersion = 'v1'

  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      kind,
      apiVersion,
      replicas: 1
    })
  })

  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const namespace = 'platformatic'
  const podId = 'pod-id'

  const server = await buildServer(t)
  t.after(async () => {
    await server.close()
  })

  const { statusCode } = await server.inject({
    method: 'POST',
    url: '/controllers',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      applicationId,
      deploymentId,
      namespace,
      podId
    })
  })

  assert.strictEqual(statusCode, 200)

  const controllers = await server.platformatic.entities.controller.find()
  assert.strictEqual(controllers.length, 1)

  const controller = controllers[0]
  assert.strictEqual(controller.applicationId, applicationId)
  assert.strictEqual(controller.deploymentId, deploymentId)
  assert.strictEqual(controller.namespace, namespace)
  assert.strictEqual(controller.k8SControllerId, controllerId)
  assert.strictEqual(controller.kind, kind)
  assert.strictEqual(controller.apiVersion, apiVersion)
  assert.strictEqual(controller.replicas, 1)

  const scaleConfigs = await server.platformatic.entities.applicationScaleConfig.find()
  assert.strictEqual(scaleConfigs.length, 1)

  const scaleConfig = scaleConfigs[0]
  assert.strictEqual(scaleConfig.applicationId, applicationId)
  assert.strictEqual(scaleConfig.minPods, 1)
  assert.strictEqual(scaleConfig.maxPods, 10)

  const scaleEvents = await server.platformatic.entities.scaleEvent.find()
  assert.strictEqual(scaleEvents.length, 1)

  const scaleEvent = scaleEvents[0]
  assert.strictEqual(scaleEvent.applicationId, applicationId)
  assert.strictEqual(scaleEvent.direction, 'up')
  assert.strictEqual(scaleEvent.replicas, 1)
  assert.strictEqual(scaleEvent.replicasDiff, 1)
  assert.strictEqual(scaleEvent.reason, 'Initial controller creation')
})
