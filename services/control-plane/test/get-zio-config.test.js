'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { startControlPlane } = require('./helper')

test('should get zio config after application resources update', async (t) => {
  const controlPlane = await startControlPlane(t)

  const { application, detectedPod } = await controlPlane.testApi.saveDetectedPod(
    'test-app',
    'test-image',
    'test-pod'
  )

  {
    const { statusCode, body } = await controlPlane.inject({
      url: `/zio/pods/${detectedPod.podId}/config`
    })
    assert.strictEqual(statusCode, 200, body)

    const { version, resources } = JSON.parse(body)
    assert.strictEqual(version, 1)

    assert.strictEqual(resources.threads, 1)
    assert.strictEqual(resources.heap, 1024)
    assert.deepStrictEqual(resources.services, [])
  }

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
    const { statusCode, body } = await controlPlane.inject({
      url: `/zio/pods/${detectedPod.podId}/config`
    })
    assert.strictEqual(statusCode, 200, body)

    const { version, resources } = JSON.parse(body)
    assert.strictEqual(version, 2)

    assert.strictEqual(resources.threads, 12)
    assert.strictEqual(resources.heap, 123)
    assert.deepStrictEqual(resources.services, [
      { name: 'service-1', threads: 1, heap: 3322 },
      { name: 'service-42', threads: 42, heap: 1024 }
    ])
  }
})

test('should get only config version', async (t) => {
  const controlPlane = await startControlPlane(t)

  const { application, detectedPod } = await controlPlane.testApi.saveDetectedPod(
    'test-app',
    'test-image',
    'test-pod'
  )

  {
    const { statusCode, body } = await controlPlane.inject({
      url: `/zio/pods/${detectedPod.podId}/config`,
      query: { fields: JSON.stringify(['version']) }
    })
    assert.strictEqual(statusCode, 200, body)

    const data = JSON.parse(body)
    assert.deepStrictEqual(data, { version: 1 })
  }

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
    const { statusCode, body } = await controlPlane.inject({
      url: `/zio/pods/${detectedPod.podId}/config`
    })
    assert.strictEqual(statusCode, 200, body)

    const { version } = JSON.parse(body)
    assert.strictEqual(version, 2)
  }
})
