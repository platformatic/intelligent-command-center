'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const {
  startControlPlane,
  startActivities,
  generateGeneration,
  generateApplication,
  generateDeployment,
  generateDetectedPod
} = require('./helper')

test('should save a "started" app instance status', async (t) => {
  const generation = generateGeneration()
  const application = generateApplication('test-app-1')

  const deployment = generateDeployment(application.id)
  deployment.status = 'starting'

  const detectedPod = generateDetectedPod(
    application.id,
    deployment.id
  )
  detectedPod.status = 'starting'

  const events = []
  await startActivities(t, {
    saveEvent: async (event) => { events.push(event) }
  })

  const controlPlane = await startControlPlane(t, {
    generations: [generation],
    applications: [application],
    deployments: [deployment],
    detectedPods: [detectedPod]
  })

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${detectedPod.podId}/instance/status`,
    headers: {
      'content-type': 'application/json'
    },
    body: { status: 'started' }
  })

  assert.strictEqual(statusCode, 200, body)

  const { entities } = controlPlane.platformatic

  const deployments = await entities.deployment.find()
  assert.strictEqual(deployments.length, 1)

  const foundDeployment = deployments[0]

  assert.strictEqual(foundDeployment.id, deployment.id)
  assert.strictEqual(foundDeployment.status, 'started')

  const detectedPods = await entities.detectedPod.find()
  assert.strictEqual(detectedPods.length, 1)

  const foundDetectedPod = detectedPods[0]
  assert.strictEqual(foundDetectedPod.id, detectedPod.id)

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

  const detectedPod = generateDetectedPod(
    application.id,
    deployment.id
  )
  detectedPod.status = 'starting'

  const events = []
  await startActivities(t, {
    saveEvent: async (event) => { events.push(event) }
  })

  const controlPlane = await startControlPlane(t, {
    generations: [generation],
    applications: [application],
    deployments: [deployment],
    detectedPods: [detectedPod]
  })

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${detectedPod.podId}/instance/status`,
    headers: {
      'content-type': 'application/json'
    },
    body: { status: 'started' }
  })

  assert.strictEqual(statusCode, 200, body)

  const { entities } = controlPlane.platformatic

  const deployments = await entities.deployment.find()
  assert.strictEqual(deployments.length, 1)

  const foundDeployment = deployments[0]
  assert.strictEqual(foundDeployment.id, deployment.id)
  assert.strictEqual(foundDeployment.status, 'started')

  const detectedPods = await entities.detectedPod.find()
  assert.strictEqual(detectedPods.length, 1)

  const foundDetectedPod = detectedPods[0]
  assert.strictEqual(foundDetectedPod.id, detectedPod.id)
  assert.strictEqual(foundDetectedPod.status, 'started')

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

  const detectedPod = generateDetectedPod(
    application.id,
    deployment.id
  )
  detectedPod.status = 'starting'

  const events = []
  await startActivities(t, {
    saveEvent: async (event) => { events.push(event) }
  })

  const controlPlane = await startControlPlane(t, {
    generations: [generation],
    applications: [application],
    deployments: [deployment],
    detectedPods: [detectedPod]
  })

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${detectedPod.podId}/instance/status`,
    headers: {
      'content-type': 'application/json'
    },
    body: { status: 'failed' }
  })

  assert.strictEqual(statusCode, 200, body)

  const { entities } = controlPlane.platformatic

  const deployments = await entities.deployment.find()
  assert.strictEqual(deployments.length, 1)

  const foundDeployment = deployments[0]
  assert.strictEqual(foundDeployment.id, deployment.id)
  assert.strictEqual(foundDeployment.status, 'failed')

  const detectedPods = await entities.detectedPod.find()
  assert.strictEqual(detectedPods.length, 1)

  const foundDetectedPod = detectedPods[0]
  assert.strictEqual(foundDetectedPod.id, detectedPod.id)
  assert.strictEqual(foundDetectedPod.status, 'failed')

  // assert.strictEqual(events.length, 1)
  //
  // const event = events[0]
  // assert.strictEqual(event.type, 'APPLICATION_START')
  // assert.strictEqual(event.applicationId, application.id)
  // assert.strictEqual(event.success, true)
  // assert.strictEqual(event.targetId, application.id)
})
