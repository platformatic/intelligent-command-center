'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { startControlPlane, startMetrics } = require('./helper')

test('should get application resources', async (t) => {
  await startMetrics(t)

  const controlPlane = await startControlPlane(t)

  const { application } = await controlPlane.testApi.saveInstance(
    'test-app',
    'test-image',
    'test-pod'
  )

  {
    const { statusCode, body } = await controlPlane.inject({
      url: `/applications/${application.id}/resources`
    })
    assert.strictEqual(statusCode, 200, body)

    const resources = JSON.parse(body)
    assert.strictEqual(resources.threads, 1)
    assert.strictEqual(resources.heap, 1024)
    assert.deepStrictEqual(resources.services, [])
  }

  {
    // Update resources
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
      url: `/applications/${application.id}/resources`
    })
    assert.strictEqual(statusCode, 200, body)

    const resources = JSON.parse(body)
    assert.strictEqual(resources.threads, 12)
    assert.strictEqual(resources.heap, 123)
    assert.deepStrictEqual(resources.services, [
      { name: 'service-1', threads: 1, heap: 3322 },
      { name: 'service-42', threads: 42, heap: 1024 }
    ])
  }
})
