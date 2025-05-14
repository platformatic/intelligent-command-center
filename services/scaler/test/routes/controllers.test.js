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
  assert.strictEqual(controller.controllerId, controllerId)
  assert.strictEqual(controller.kind, kind)
  assert.strictEqual(controller.apiVersion, apiVersion)
  assert.strictEqual(controller.replicas, 1)
})
