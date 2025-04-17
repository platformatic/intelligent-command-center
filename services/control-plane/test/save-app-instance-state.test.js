'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const {
  startControlPlane,
  generateGeneration,
  generateApplication,
  generateApplicationState,
  generateDeployment,
  generateDetectedPod
} = require('./helper')

test('should save a application instance state', async (t) => {
  const generation = generateGeneration()
  const application1 = generateApplication('test-app-1')
  const application2 = generateApplication('test-app-2')

  const deployment1 = generateDeployment(application1.id)
  const deployment2 = generateDeployment(application2.id)

  const detectedPod1 = generateDetectedPod(
    application1.id,
    deployment1.id
  )
  const detectedPod2 = generateDetectedPod(
    application2.id,
    deployment2.id
  )

  const controlPlane = await startControlPlane(t, {
    generations: [generation],
    applications: [application1, application2],
    deployments: [deployment1, deployment2],
    detectedPods: [detectedPod1, detectedPod2]
  })

  const serviceMetadata1 = {
    id: 'entrypoint',
    type: '@platformatic/composer',
    version: '1.0.0',
    entrypoint: true
  }

  const serviceMetadata2 = {
    id: 'service-2',
    type: '@platformatic/service',
    version: '1.0.0',
    entrypoint: false
  }

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${detectedPod1.podId}/instance/state`,
    headers: {
      'content-type': 'application/json'
    },
    body: {
      metadata: {
        platformaticVersion: '1.42.0'
      },
      services: [serviceMetadata1, serviceMetadata2]
    }
  })

  assert.strictEqual(statusCode, 200, body)

  const { entities } = controlPlane.platformatic

  const applicationStates = await entities.applicationState.find()
  assert.strictEqual(applicationStates.length, 1)

  const applicationState = applicationStates[0]

  assert.strictEqual(applicationState.applicationId, application1.id)
  assert.strictEqual(applicationState.pltVersion, '1.42.0')

  const { services } = applicationState.state

  const entrypointService = services.find((s) => s.id === 'entrypoint')
  assert.deepStrictEqual(entrypointService, {
    id: 'entrypoint',
    type: '@platformatic/composer',
    version: '1.0.0',
    entrypoint: true
  })

  const service2 = services.find((s) => s.id === 'service-2')

  assert.deepStrictEqual(service2, {
    id: 'service-2',
    type: '@platformatic/service',
    version: '1.0.0',
    entrypoint: false
  })
})

test('should not set app instance state if it is already set', async (t) => {
  const generation = generateGeneration()
  const application = generateApplication('test-app-1')

  const applicationState = generateApplicationState(application.id)
  const deployment = generateDeployment(application.id, applicationState.id)
  const detectedPod = generateDetectedPod(
    application.id,
    deployment.id
  )

  const controlPlane = await startControlPlane(t, {
    generations: [generation],
    applications: [application],
    deployments: [deployment],
    detectedPods: [detectedPod],
    applicationStates: [applicationState]
  })

  const serviceMetadata1 = {
    id: 'entrypoint',
    type: '@platformatic/composer',
    version: '1.0.0',
    entrypoint: true
  }

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${detectedPod.podId}/instance/state`,
    headers: {
      'content-type': 'application/json'
    },
    body: {
      metadata: {
        platformaticVersion: '1.42.0'
      },
      services: [serviceMetadata1]
    }
  })

  assert.strictEqual(statusCode, 200, body)

  const { entities } = controlPlane.platformatic

  const applicationStates = await entities.applicationState.find()
  assert.strictEqual(applicationStates.length, 1)

  const foundApplicationState = applicationStates[0]

  assert.strictEqual(
    foundApplicationState.applicationId,
    applicationState.applicationId
  )
  assert.strictEqual(
    foundApplicationState.pltVersion,
    applicationState.pltVersion
  )
  assert.deepStrictEqual(
    foundApplicationState.state,
    JSON.parse(applicationState.state)
  )
})
