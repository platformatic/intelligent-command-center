'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const {
  startControlPlane,
  startMainService,
  startTrafficante
} = require('./helper')

test('should emit application config change', async (t) => {
  const applicationsUpdates = []
  await startMainService(t, {
    saveApplicationUpdate: (applicationId, update) => {
      applicationsUpdates.push({ applicationId, update })
    }
  })

  const controlPlane = await startControlPlane(t)

  const { application } = await controlPlane.testApi.saveInstance(
    'test-app',
    'test-image',
    'test-pod'
  )

  const interceptorConfig = {
    applicationId: application.id,
    applied: true,
    config: {
      rules: [{
        routeToMatch: 'http://testcom/products/:id',
        headers: {
          'cache-control': 'public, max-age=60'
        }
      }]
    }
  }

  await startTrafficante(t, {
    getInterceptorConfigs: () => {
      const configs = []
      if (interceptorConfig) {
        configs.push(interceptorConfig)
      }
      return configs
    }
  })

  const { statusCode, body } = await controlPlane.inject({
    method: 'PATCH',
    url: `/applications/${application.id}/config`
  })
  assert.strictEqual(statusCode, 200, body)

  const { entities } = controlPlane.platformatic

  const generations = await entities.generation.find()
  assert.strictEqual(generations.length, 1)

  assert.strictEqual(applicationsUpdates.length, 1)

  const applicationUpdate = applicationsUpdates[0]
  assert.strictEqual(applicationUpdate.applicationId, application.id)
  assert.deepStrictEqual(applicationUpdate.update, {
    topic: 'config',
    type: 'config-updated',
    data: {
      resources: { heap: 1024, threads: 1, services: [] },
      httpCacheConfig: interceptorConfig.config
    }
  })
})
