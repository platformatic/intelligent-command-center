'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
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

test('PUT scaling-disabled should disable scaling for a controller', async (t) => {
  await startMachinist(t, {
    getPodController: () => ({
      name: 'test-ctrl',
      kind: 'Deployment',
      apiVersion: 'apps/v1',
      replicas: 2
    })
  })

  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const namespace = 'platformatic'

  const server = await buildServer(t)
  t.after(async () => {
    await server.close()
  })

  await server.inject({
    method: 'POST',
    url: '/controllers',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ applicationId, deploymentId, namespace, podId: 'pod-1' })
  })

  const res = await server.inject({
    method: 'PUT',
    url: `/controllers/${namespace}/test-ctrl/scaling-disabled`,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ disabled: true })
  })

  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(JSON.parse(res.body).success, true)

  const controllers = await server.platformatic.entities.controller.find({
    where: { k8SControllerId: { eq: 'test-ctrl' } }
  })
  assert.strictEqual(controllers[0].scalingDisabled, true)
})

test('PUT scaling-disabled should re-enable scaling', async (t) => {
  await startMachinist(t, {
    getPodController: () => ({
      name: 'test-ctrl-re',
      kind: 'Deployment',
      apiVersion: 'apps/v1',
      replicas: 1
    })
  })

  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const namespace = 'platformatic'

  const server = await buildServer(t)
  t.after(async () => {
    await server.close()
  })

  await server.inject({
    method: 'POST',
    url: '/controllers',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ applicationId, deploymentId, namespace, podId: 'pod-1' })
  })

  // Disable
  await server.inject({
    method: 'PUT',
    url: `/controllers/${namespace}/test-ctrl-re/scaling-disabled`,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ disabled: true })
  })

  // Re-enable
  const res = await server.inject({
    method: 'PUT',
    url: `/controllers/${namespace}/test-ctrl-re/scaling-disabled`,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ disabled: false })
  })

  assert.strictEqual(res.statusCode, 200)

  const controllers = await server.platformatic.entities.controller.find({
    where: { k8SControllerId: { eq: 'test-ctrl-re' } }
  })
  assert.strictEqual(controllers[0].scalingDisabled, false)
})

test('PUT scaling-disabled should return error for unknown controller', async (t) => {
  await startMachinist(t)

  const server = await buildServer(t)
  t.after(async () => {
    await server.close()
  })

  const res = await server.inject({
    method: 'PUT',
    url: '/controllers/platformatic/nonexistent/scaling-disabled',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ disabled: true })
  })

  assert.strictEqual(res.statusCode, 200)
  const body = JSON.parse(res.body)
  assert.strictEqual(body.success, false)
  assert.strictEqual(body.error, 'controller not found')
})
