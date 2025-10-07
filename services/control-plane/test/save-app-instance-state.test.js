'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const {
  startControlPlane,
  generateGeneration,
  generateApplication,
  generateApplicationState,
  generateDeployment,
  generateInstance,
  generateK8sHeader
} = require('./helper')

test('should save a application instance state', async (t) => {
  const generation = generateGeneration()
  const application1 = generateApplication('test-app-1')
  const application2 = generateApplication('test-app-2')

  const deployment1 = generateDeployment(application1.id)
  const deployment2 = generateDeployment(application2.id)

  const instance1 = generateInstance(
    application1.id,
    deployment1.id
  )
  const instance2 = generateInstance(
    application2.id,
    deployment2.id
  )

  const controlPlane = await startControlPlane(t, {
    generations: [generation],
    applications: [application1, application2],
    deployments: [deployment1, deployment2],
    instances: [instance1, instance2]
  })

  const serviceMetadata1 = {
    id: 'entrypoint',
    type: '@platformatic/composer',
    version: '1.0.0',
    entrypoint: true,
    workers: 1,
    minWorkers: 1,
    maxWorkers: 2
  }

  const serviceMetadata2 = {
    id: 'service-2',
    type: '@platformatic/service',
    version: '1.0.0',
    entrypoint: false,
    workers: 4,
    minWorkers: 4,
    maxWorkers: 8
  }

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${instance1.podId}/instance/state`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(instance1.podId)
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
    entrypoint: true,
    workers: 1,
    minWorkers: 1,
    maxWorkers: 2
  })

  const service2 = services.find((s) => s.id === 'service-2')

  assert.deepStrictEqual(service2, {
    id: 'service-2',
    type: '@platformatic/service',
    version: '1.0.0',
    entrypoint: false,
    workers: 4,
    minWorkers: 4,
    maxWorkers: 8
  })
})

test('should not set app instance state if it is already set', async (t) => {
  const generation = generateGeneration()
  const application = generateApplication('test-app-1')

  const applicationState = generateApplicationState(application.id)
  const deployment = generateDeployment(application.id, applicationState.id)
  const instance = generateInstance(
    application.id,
    deployment.id
  )

  const controlPlane = await startControlPlane(t, {
    generations: [generation],
    applications: [application],
    deployments: [deployment],
    instances: [instance],
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
    url: `/pods/${instance.podId}/instance/state`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(instance.podId)
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

test('should throw 401 if x-k8s header is missing', async (t) => {
  const podId = randomUUID()

  const controlPlane = await startControlPlane(t)

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance/state`,
    headers: {
      'content-type': 'application/json'
    },
    body: {}
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
    url: `/pods/${podId}/instance/state`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(jwtPodId)
    },
    body: {}
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
