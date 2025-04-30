'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const {
  startControlPlane,
  startActivities,
  generateGeneration,
  generateApplication,
  generateDeployment,
  generateInstance,
  generateK8sHeader
} = require('./helper')

test('should save a "running" app instance status', async (t) => {
  const generation = generateGeneration()
  const application = generateApplication('test-app-1')

  const deployment = generateDeployment(application.id)
  deployment.status = 'starting'

  const instance = generateInstance(
    application.id,
    deployment.id
  )
  instance.status = 'starting'

  const events = []
  await startActivities(t, {
    saveEvent: async (event) => { events.push(event) }
  })

  const controlPlane = await startControlPlane(t, {
    generations: [generation],
    applications: [application],
    deployments: [deployment],
    instances: [instance]
  })

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${instance.podId}/instance/status`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(instance.podId)
    },
    body: { status: 'running' }
  })

  assert.strictEqual(statusCode, 200, body)

  const { entities } = controlPlane.platformatic

  const deployments = await entities.deployment.find()
  assert.strictEqual(deployments.length, 1)

  const foundDeployment = deployments[0]

  assert.strictEqual(foundDeployment.id, deployment.id)
  assert.strictEqual(foundDeployment.status, 'started')

  const instances = await entities.instance.find()
  assert.strictEqual(instances.length, 1)

  const foundInstance = instances[0]
  assert.strictEqual(foundInstance.id, instance.id)

  // assert.strictEqual(events.length, 1)
  //
  // const event = events[0]
  // assert.strictEqual(event.type, 'APPLICATION_START')
  // assert.strictEqual(event.applicationId, application.id)
  // assert.strictEqual(event.success, true)
  // assert.strictEqual(event.targetId, application.id)
})

test('should set "started" deployment status if it is already set to "failed"', async (t) => {
  const generation = generateGeneration()
  const application = generateApplication('test-app-1')

  const deployment = generateDeployment(application.id)
  deployment.status = 'failed'

  const instance = generateInstance(
    application.id,
    deployment.id
  )
  instance.status = 'starting'

  const events = []
  await startActivities(t, {
    saveEvent: async (event) => { events.push(event) }
  })

  const controlPlane = await startControlPlane(t, {
    generations: [generation],
    applications: [application],
    deployments: [deployment],
    instances: [instance]
  })

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${instance.podId}/instance/status`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(instance.podId)
    },
    body: { status: 'running' }
  })

  assert.strictEqual(statusCode, 200, body)

  const { entities } = controlPlane.platformatic

  const deployments = await entities.deployment.find()
  assert.strictEqual(deployments.length, 1)

  const foundDeployment = deployments[0]
  assert.strictEqual(foundDeployment.id, deployment.id)
  assert.strictEqual(foundDeployment.status, 'started')

  const instances = await entities.instance.find()
  assert.strictEqual(instances.length, 1)

  const foundInstance = instances[0]
  assert.strictEqual(foundInstance.id, instance.id)
  assert.strictEqual(foundInstance.status, 'running')

  // assert.strictEqual(events.length, 1)
  //
  // const event = events[0]
  // assert.strictEqual(event.type, 'APPLICATION_START')
  // assert.strictEqual(event.applicationId, application.id)
  // assert.strictEqual(event.success, true)
  // assert.strictEqual(event.targetId, application.id)
})

test('should set "failed" app instance status', async (t) => {
  const generation = generateGeneration()
  const application = generateApplication('test-app-1')

  const deployment = generateDeployment(application.id)
  deployment.status = 'starting'

  const instance = generateInstance(
    application.id,
    deployment.id
  )
  instance.status = 'starting'

  const events = []
  await startActivities(t, {
    saveEvent: async (event) => { events.push(event) }
  })

  const controlPlane = await startControlPlane(t, {
    generations: [generation],
    applications: [application],
    deployments: [deployment],
    instances: [instance]
  })

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${instance.podId}/instance/status`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(instance.podId)
    },
    body: { status: 'stopped' }
  })

  assert.strictEqual(statusCode, 200, body)

  const { entities } = controlPlane.platformatic

  const deployments = await entities.deployment.find()
  assert.strictEqual(deployments.length, 1)

  const foundDeployment = deployments[0]
  assert.strictEqual(foundDeployment.id, deployment.id)
  assert.strictEqual(foundDeployment.status, 'failed')

  const instances = await entities.instance.find()
  assert.strictEqual(instances.length, 1)

  const foundInstance = instances[0]
  assert.strictEqual(foundInstance.id, instance.id)
  assert.strictEqual(foundInstance.status, 'stopped')

  // assert.strictEqual(events.length, 1)
  //
  // const event = events[0]
  // assert.strictEqual(event.type, 'APPLICATION_START')
  // assert.strictEqual(event.applicationId, application.id)
  // assert.strictEqual(event.success, true)
  // assert.strictEqual(event.targetId, application.id)
})

test('should throw 401 if x-k8s header is missing', async (t) => {
  const podId = randomUUID()

  const controlPlane = await startControlPlane(t)

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance/status`,
    headers: {
      'content-type': 'application/json'
    },
    body: { status: 'stopped' }
  })

  assert.strictEqual(statusCode, 401, body)

  const error = JSON.parse(body)
  assert.deepStrictEqual(error, {
    statusCode: 401,
    code: 'PLT_CONTROL_PLANE_MISSING_K8S_AUTH_CONTEXT',
    error: 'Unauthorized',
    message: `Missing K8s auth context for pod "${podId}"`
  })
})

test('should throw 401 if pod id param does match with a jwt pod id', async (t) => {
  const podId = randomUUID()
  const jwtPodId = randomUUID()

  const controlPlane = await startControlPlane(t)

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance/status`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(jwtPodId)
    },
    body: { status: 'stopped' }
  })

  assert.strictEqual(statusCode, 401, body)

  const error = JSON.parse(body)
  assert.deepStrictEqual(error, {
    statusCode: 401,
    code: 'PLT_CONTROL_PLANE_POD_ID_NOT_AUTHORIZED',
    error: 'Unauthorized',
    message: `Request pod id "${podId}" does not match with a jwt pod id "${jwtPodId}"`
  })
})
