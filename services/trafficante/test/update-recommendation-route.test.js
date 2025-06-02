'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const { startTrafficante, generateRecommendationRoute } = require('./helper')

test('should update a recommendation route', async (t) => {
  const recommendation = { id: randomUUID(), version: 1, count: 1 }
  const recommendationRoute = generateRecommendationRoute({
    recommendationId: recommendation.id,
    route: '/books/:id',
    ttl: 300,
    cacheTag: null,
    varyHeaders: []
  })

  const trafficante = await startTrafficante(t, {
    recommendations: [recommendation],
    recommendationsRoutes: [recommendationRoute]
  })

  const { statusCode, body } = await trafficante.inject({
    method: 'PATCH',
    url: `/recommendations/${recommendation.id}/routes/${recommendationRoute.id}`,
    body: {
      ttl: 42,
      varyHeaders: ['Accept'],
      cacheTag: 'product-id'
    }
  })
  assert.strictEqual(statusCode, 200, body)

  const { entities } = trafficante.platformatic

  const recommendations = await entities.recommendation.find()
  assert.strictEqual(recommendations.length, 1)

  const foundRecommendation = recommendations[0]
  assert.strictEqual(foundRecommendation.id, recommendation.id)
  assert.strictEqual(foundRecommendation.version, recommendation.version)
  assert.strictEqual(foundRecommendation.count, 1)

  const foundRecommendationRoutes = await entities.recommendationsRoute.find()
  assert.strictEqual(foundRecommendationRoutes.length, 1)

  const updatedRoute = foundRecommendationRoutes[0]
  assert.strictEqual(updatedRoute.id, recommendationRoute.id)
  assert.strictEqual(updatedRoute.route, recommendationRoute.route)
  assert.strictEqual(updatedRoute.selected, true)
  assert.strictEqual(updatedRoute.ttl, 42)
  assert.strictEqual(updatedRoute.cacheTag, 'product-id')
  assert.deepStrictEqual(updatedRoute.varyHeaders, ['Accept'])

  const interceptorConfigs = await entities.interceptorConfig.find()
  assert.strictEqual(interceptorConfigs.length, 0)
})

test('should unselect a recommendation route', async (t) => {
  const recommendation = { id: randomUUID(), version: 1, count: 1 }
  const recommendationRoute = generateRecommendationRoute({
    recommendationId: recommendation.id,
    route: '/books/:id',
    ttl: 300,
    cacheTag: null,
    varyHeaders: []
  })

  const trafficante = await startTrafficante(t, {
    recommendations: [recommendation],
    recommendationsRoutes: [recommendationRoute]
  })

  const { statusCode, body } = await trafficante.inject({
    method: 'PATCH',
    url: `/recommendations/${recommendation.id}/routes/${recommendationRoute.id}`,
    body: { selected: false }
  })
  assert.strictEqual(statusCode, 200, body)

  const { entities } = trafficante.platformatic

  const recommendations = await entities.recommendation.find()
  assert.strictEqual(recommendations.length, 1)

  const foundRecommendation = recommendations[0]
  assert.strictEqual(foundRecommendation.id, recommendation.id)
  assert.strictEqual(foundRecommendation.version, recommendation.version)
  assert.strictEqual(foundRecommendation.count, 0)

  const foundRecommendationRoutes = await entities.recommendationsRoute.find()
  assert.strictEqual(foundRecommendationRoutes.length, 1)

  const updatedRoute = foundRecommendationRoutes[0]
  assert.strictEqual(updatedRoute.id, recommendationRoute.id)
  assert.strictEqual(updatedRoute.route, recommendationRoute.route)
  assert.strictEqual(updatedRoute.selected, false)
  assert.strictEqual(updatedRoute.ttl, 300)
  assert.strictEqual(updatedRoute.cacheTag, null)
  assert.deepStrictEqual(updatedRoute.varyHeaders, [])

  const interceptorConfigs = await entities.interceptorConfig.find()
  assert.strictEqual(interceptorConfigs.length, 0)
})

test('should select a recommendation route', async (t) => {
  const recommendation = { id: randomUUID(), version: 1, count: 0 }
  const recommendationRoute = generateRecommendationRoute({
    recommendationId: recommendation.id,
    selected: false,
    route: '/books/:id',
    ttl: 300,
    cacheTag: null,
    varyHeaders: []
  })

  const trafficante = await startTrafficante(t, {
    recommendations: [recommendation],
    recommendationsRoutes: [recommendationRoute]
  })

  const { statusCode, body } = await trafficante.inject({
    method: 'PATCH',
    url: `/recommendations/${recommendation.id}/routes/${recommendationRoute.id}`,
    body: { selected: true }
  })
  assert.strictEqual(statusCode, 200, body)

  const { entities } = trafficante.platformatic

  const recommendations = await entities.recommendation.find()
  assert.strictEqual(recommendations.length, 1)

  const foundRecommendation = recommendations[0]
  assert.strictEqual(foundRecommendation.id, recommendation.id)
  assert.strictEqual(foundRecommendation.version, recommendation.version)
  assert.strictEqual(foundRecommendation.count, 1)

  const foundRecommendationRoutes = await entities.recommendationsRoute.find()
  assert.strictEqual(foundRecommendationRoutes.length, 1)

  const updatedRoute = foundRecommendationRoutes[0]
  assert.strictEqual(updatedRoute.id, recommendationRoute.id)
  assert.strictEqual(updatedRoute.route, recommendationRoute.route)
  assert.strictEqual(updatedRoute.selected, true)
  assert.strictEqual(updatedRoute.ttl, 300)
  assert.strictEqual(updatedRoute.cacheTag, null)
  assert.deepStrictEqual(updatedRoute.varyHeaders, [])

  const interceptorConfigs = await entities.interceptorConfig.find()
  assert.strictEqual(interceptorConfigs.length, 0)
})
