'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const { startTrafficInspector, generateRecommendationRoute } = require('./helper')
const { startControlPlane } = require('../../control-plane/test/helper')

test('should apply the recommendation', async (t) => {
  const controlPlane = await startControlPlane(t)

  const { application: application1 } = await controlPlane.testApi.saveInstance(
    'test-app-1',
    'test-image-1',
    'test-pod-1'
  )

  const { application: application2 } = await controlPlane.testApi.saveInstance(
    'test-app-2',
    'test-image-2',
    'test-pod-2'
  )

  const applicationId1 = application1.id
  const applicationId2 = application2.id

  const recommendation = {
    id: randomUUID(),
    status: 'in_progress',
    version: 1
  }

  const recommendationRoute1 = generateRecommendationRoute({
    recommendationId: recommendation.id,
    applicationId: applicationId1,
    route: '/books/:id',
    recommended: true,
    selected: true
  })

  const recommendationRoute2 = generateRecommendationRoute({
    recommendationId: recommendation.id,
    applicationId: applicationId2,
    route: '/products/:id',
    recommended: true,
    selected: true
  })

  const trafficInspector = await startTrafficInspector(t, {
    recommendations: [recommendation],
    recommendationsRoutes: [
      recommendationRoute1,
      recommendationRoute2
    ]
  })

  const { statusCode, body } = await trafficInspector.inject({
    method: 'POST',
    url: '/recommendations/apply',
    query: {
      applicationId: applicationId1,
      saveInterceptorConfig: true
    }
  })
  assert.strictEqual(statusCode, 200, body)

  const { entities } = trafficInspector.platformatic

  const foundRecommendations = await entities.recommendation.find()
  assert.strictEqual(foundRecommendations.length, 1)

  const foundRoutes = await entities.recommendationsRoute.find()
  assert.strictEqual(foundRoutes.length, 2)

  const foundRoute1 = foundRoutes.find((route) => route.id === recommendationRoute1.id)
  assert.strictEqual(foundRoute1.applied, true)

  const foundRoute2 = foundRoutes.find((route) => route.id === recommendationRoute2.id)
  assert.strictEqual(foundRoute2.applied, false)

  const interceptorConfigs = await entities.interceptorConfig.find()
  assert.strictEqual(interceptorConfigs.length, 1)
  assert.strictEqual(interceptorConfigs[0].applied, true)
})

test('should apply the recommendation without saving a config', async (t) => {
  const applicationId1 = randomUUID()
  const applicationId2 = randomUUID()

  const recommendation = {
    id: randomUUID(),
    status: 'in_progress',
    version: 1
  }

  const recommendationRoute1 = generateRecommendationRoute({
    recommendationId: recommendation.id,
    applicationId: applicationId1,
    route: '/books/:id',
    recommended: true,
    selected: true
  })

  const recommendationRoute2 = generateRecommendationRoute({
    recommendationId: recommendation.id,
    applicationId: applicationId2,
    route: '/products/:id',
    recommended: true,
    selected: true
  })

  const trafficInspector = await startTrafficInspector(t, {
    recommendations: [recommendation],
    recommendationsRoutes: [
      recommendationRoute1,
      recommendationRoute2
    ]
  })

  const { statusCode, body } = await trafficInspector.inject({
    method: 'POST',
    url: '/recommendations/apply',
    query: {
      applicationId: applicationId1,
      saveInterceptorConfig: false
    }
  })
  assert.strictEqual(statusCode, 200, body)

  const { entities } = trafficInspector.platformatic

  const foundRecommendations = await entities.recommendation.find()
  assert.strictEqual(foundRecommendations.length, 1)

  const foundRoutes = await entities.recommendationsRoute.find()
  assert.strictEqual(foundRoutes.length, 2)

  const foundRoute1 = foundRoutes.find((route) => route.id === recommendationRoute1.id)
  assert.strictEqual(foundRoute1.applied, true)

  const foundRoute2 = foundRoutes.find((route) => route.id === recommendationRoute2.id)
  assert.strictEqual(foundRoute2.applied, false)

  const interceptorConfigs = await entities.interceptorConfig.find()
  assert.strictEqual(interceptorConfigs.length, 0)
})
