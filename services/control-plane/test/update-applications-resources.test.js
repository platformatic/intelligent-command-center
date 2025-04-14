'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { startControlPlane } = require('./helper')

test('should update application resources', async (t) => {
  const controlPlane = await startControlPlane(t)

  const { application } = await controlPlane.testApi.saveDetectedPod(
    'test-app',
    'test-image',
    'test-pod'
  )

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/applications/${application.id}/resources`,
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      threads: 12,
      heap: 123,
      services: [
        { name: 'service-1', heap: 3322 },
        { name: 'service-42', threads: 42 }
      ]
    })
  })
  assert.strictEqual(statusCode, 200, body)

  const { entities } = controlPlane.platformatic

  const generations = await entities.generation.find()
  assert.strictEqual(generations.length, 2)

  const generation2 = generations.find(g => g.version === 2)
  assert.ok(generation2, 'Generation 2 not found')

  const generationsAppConfigs = await controlPlane.getGenerationApplicationsConfigs(
    generation2.id
  )
  assert.strictEqual(generationsAppConfigs.length, 1)

  const generation2Config = generationsAppConfigs[0]
  assert.strictEqual(generation2Config.version, 2)
  assert.strictEqual(generation2Config.applicationId, application.id)
  assert.deepStrictEqual(generation2Config.resources, {
    threads: 12,
    heap: 123,
    services: [
      { name: 'service-1', threads: 1, heap: 3322 },
      { name: 'service-42', threads: 42, heap: 1024 }
    ]
  })
})

test('should detect a new pod after updating application resources', async (t) => {
  const controlPlane = await startControlPlane(t)

  const {
    application,
    deployment,
    detectedPod
  } = await controlPlane.testApi.saveDetectedPod(
    'test-app',
    'test-image',
    'test-pod'
  )

  {
    const { statusCode, body } = await controlPlane.inject({
      method: 'POST',
      url: `/applications/${application.id}/resources`,
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        threads: 12,
        heap: 123,
        services: [
          { name: 'service-1', heap: 3322 },
          { name: 'service-42', threads: 42 }
        ]
      })
    })
    assert.strictEqual(statusCode, 200, body)
  }

  {
    const applicationName = application.name
    const imageId = deployment.imageId
    const podId = detectedPod.podId

    const { statusCode, body } = await controlPlane.inject({
      method: 'POST',
      url: '/zio/pods',
      headers: {
        'content-type': 'application/json'
      },
      body: { applicationName, imageId, podId }
    })
    assert.strictEqual(statusCode, 200, body)

    const { config } = JSON.parse(body)
    const { version, resources } = config
    assert.strictEqual(version, 2)
    assert.strictEqual(resources.threads, 12)
    assert.strictEqual(resources.heap, 123)
    assert.deepStrictEqual(resources.services, [
      { name: 'service-1', threads: 1, heap: 3322 },
      { name: 'service-42', threads: 42, heap: 1024 }
    ])
  }
})
