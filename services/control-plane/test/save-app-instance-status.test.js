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
  generateMachineHeaders
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
    url: `/pods/${instance.machineId}/instance/status`,
    headers: {
      'content-type': 'application/json',
      ...generateMachineHeaders(instance.machineId)
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
    url: `/pods/${instance.machineId}/instance/status`,
    headers: {
      'content-type': 'application/json',
      ...generateMachineHeaders(instance.machineId)
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
    url: `/pods/${instance.machineId}/instance/status`,
    headers: {
      'content-type': 'application/json',
      ...generateMachineHeaders(instance.machineId)
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

test('should throw 401 if machine context headers are missing', async (t) => {
  const machineId = randomUUID()

  const controlPlane = await startControlPlane(t)

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${machineId}/instance/status`,
    headers: {
      'content-type': 'application/json'
    },
    body: { status: 'stopped' }
  })

  assert.strictEqual(statusCode, 401, body)

  const error = JSON.parse(body)
  assert.deepStrictEqual(error, {
    statusCode: 401,
    code: 'PLT_CONTROL_PLANE_MISSING_MACHINE_AUTH_CONTEXT',
    error: 'Unauthorized',
    message: `Missing machine auth context for machine "${machineId}"`
  })
})

test('should throw 401 if machineId param does not match with the authenticated machineId', async (t) => {
  const machineId = randomUUID()
  const jwtMachineId = randomUUID()

  const controlPlane = await startControlPlane(t)

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${machineId}/instance/status`,
    headers: {
      'content-type': 'application/json',
      ...generateMachineHeaders(jwtMachineId)
    },
    body: { status: 'stopped' }
  })

  assert.strictEqual(statusCode, 401, body)

  const error = JSON.parse(body)
  assert.deepStrictEqual(error, {
    statusCode: 401,
    code: 'PLT_CONTROL_PLANE_MACHINE_ID_NOT_AUTHORIZED',
    error: 'Unauthorized',
    message: `Request machine id "${machineId}" does not match the authenticated machine id "${jwtMachineId}"`
  })
})
