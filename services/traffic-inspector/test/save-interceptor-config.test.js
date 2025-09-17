'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const { startTrafficInspector, sortRules, generateRecommendationRoute } = require('./helper')

test('should save a recommendation route (merge with a prev config)', async (t) => {
  const applicationId1 = randomUUID()
  const applicationId2 = randomUUID()

  const prevRecommendation = { id: randomUUID(), version: 1 }
  const prevInterceptorConfig = {
    id: randomUUID(),
    applicationId: applicationId1,
    recommendationId: prevRecommendation.id,
    config: JSON.stringify({
      rules: [
        {
          routeToMatch: 'http://service-2.plt-local/posts/:id',
          headers: { 'cache-control': 'public, max-age=42' },
          cacheTags: { fgh: 'posts' }
        }
      ]
    })
  }

  const recommendation = { id: randomUUID(), version: 2 }
  const recommendationRoute1 = generateRecommendationRoute({
    route: '/books/:id',
    domain: 'service-1.plt-local',
    recommendationId: recommendation.id,
    applicationId: applicationId1,
    ttl: 300,
    cacheTag: 'books',
    varyHeaders: ['Accept']
  })

  const recommendationRoute2 = generateRecommendationRoute({
    route: '/products/:id',
    domain: 'service-2.plt-local',
    recommendationId: recommendation.id,
    applicationId: applicationId2,
    ttl: 300,
    cacheTag: null,
    varyHeaders: []
  })

  const trafficInspector = await startTrafficInspector(t, {
    recommendations: [prevRecommendation, recommendation],
    recommendationsRoutes: [recommendationRoute1, recommendationRoute2],
    interceptorConfigs: [prevInterceptorConfig]
  })

  const { statusCode, body } = await trafficInspector.inject({
    method: 'POST',
    url: `/recommendations/${recommendation.id}/interceptor-configs/${applicationId1}`
  })
  assert.strictEqual(statusCode, 200, body)

  const interceptorConfig = JSON.parse(body)
  assert.deepStrictEqual(interceptorConfig.rules.sort(sortRules), [
    {
      routeToMatch: 'http://service-1.plt-local/books/:id',
      headers: { 'cache-control': 'public, max-age=300', vary: 'Accept' },
      cacheTags: { fgh: 'books' }
    },
    {
      routeToMatch: 'http://service-2.plt-local/posts/:id',
      headers: { 'cache-control': 'public, max-age=42' },
      cacheTags: { fgh: 'posts' }
    }
  ])

  const { entities } = trafficInspector.platformatic

  const interceptorConfigs = await entities.interceptorConfig.find()
  assert.strictEqual(interceptorConfigs.length, 2)

  const savedInterceptorConfig = interceptorConfigs.find(
    (config) => config.id !== prevInterceptorConfig.id
  )
  assert.strictEqual(savedInterceptorConfig.applicationId, applicationId1)
  assert.strictEqual(savedInterceptorConfig.recommendationId, recommendation.id)
  assert.deepStrictEqual(savedInterceptorConfig.config.rules.sort(sortRules), [
    {
      routeToMatch: 'http://service-1.plt-local/books/:id',
      headers: { 'cache-control': 'public, max-age=300', vary: 'Accept' },
      cacheTags: { fgh: 'books' }
    },
    {
      routeToMatch: 'http://service-2.plt-local/posts/:id',
      headers: { 'cache-control': 'public, max-age=42' },
      cacheTags: { fgh: 'posts' }
    }
  ])
})
