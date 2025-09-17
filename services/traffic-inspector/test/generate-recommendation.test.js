'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const { setTimeout: sleep } = require('node:timers/promises')
const {
  startTrafficInspector,
  generateRequests,
  generateRecommendationRoute
} = require('./helper')

const { startControlPlane } = require('../../control-plane/test/helper')

test('should generate cache recommendation (cold start)', async (t) => {
  const telemetryId = 'test-app-1-service-1'
  const domain = 'service-1.plt.local'

  const controlPlane = await startControlPlane(t)

  const { application } = await controlPlane.testApi.saveInstance(
    'test-app-1',
    'test-image-1',
    'test-pod-1'
  )

  await controlPlane.testApi.saveApplicationState('test-pod-1', {
    services: [{
      id: 'service-1',
      type: '@platformatic/service',
      version: '1.0.0',
      entrypoint: true
    }]
  })

  const applicationId = application.id

  const requestsHashes = generateRequests({
    applicationId,
    requests: [
      {
        url: `http://${domain}/apps/1/products/42`,
        bodyHash: 'test-1-hash-1',
        bodySize: 11,
        counter: 20,
        ttl: 100
      },
      {
        url: `http://${domain}/apps/1/products/42`,
        bodyHash: 'test-1-hash-2',
        bodySize: 32,
        counter: 30,
        ttl: 200
      },

      {
        url: `http://${domain}/apps/1/products/43`,
        bodyHash: 'test-1-hash-3',
        bodySize: 45,
        counter: 10,
        ttl: 300
      },
      {
        url: `http://${domain}/apps/1/products/43`,
        bodyHash: 'test-1-hash-4',
        bodySize: 3,
        counter: 20,
        ttl: 100
      },

      {
        url: `http://${domain}/books`,
        bodyHash: 'test-2-hash-1',
        bodySize: 5,
        counter: 50,
        ttl: 200
      },
      {
        url: `http://${domain}/books`,
        bodyHash: 'test-2-hash-2',
        bodySize: 48,
        counter: 60,
        ttl: 300
      }
    ]
  })

  const versions = [{ version: 42 }]

  const trafficInspector = await startTrafficInspector(t, {
    versions,
    requestsHashes,
    routes: [
      {
        applicationId,
        telemetryId,
        url: '/apps/1/products/42',
        route: '/apps/:app-id/products/:id'
      },
      {
        applicationId,
        telemetryId,
        url: '/apps/1/products/43',
        route: '/apps/:app-id/products/:id'
      },
      {
        applicationId,
        telemetryId,
        url: '/books',
        route: '/books'
      }
    ]
  })

  const { statusCode, body } = await trafficInspector.inject({
    method: 'POST',
    url: '/recommendations'
  })
  assert.strictEqual(statusCode, 200, body)

  const recommendations = await trafficInspector.platformatic.entities.recommendation.find({})
  assert.strictEqual(recommendations.length, 1)

  const foundRecommendation = recommendations[0]
  assert.strictEqual(foundRecommendation.version, 42)
  assert.strictEqual(foundRecommendation.status, 'new')
  assert.strictEqual(foundRecommendation.count, 1)
  assert.ok(foundRecommendation.createdAt)

  const recommendationsRoutes = await trafficInspector.platformatic.entities.recommendationsRoute.find({})
  assert.strictEqual(recommendationsRoutes.length, 2)

  const route1 = recommendationsRoutes.find((route) => route.route === '/apps/:app-id/products/:id')
  assert.strictEqual(route1.applicationId, applicationId)
  assert.strictEqual(route1.recommendationId, foundRecommendation.id)
  assert.strictEqual(route1.telemetryId, 'test-app-1-service-1')
  assert.strictEqual(route1.serviceName, 'service-1')
  assert.strictEqual(route1.route, '/apps/:app-id/products/:id')
  assert.strictEqual(route1.domain, domain)
  assert.strictEqual(route1.recommended, false)
  assert.strictEqual(route1.selected, false)
  assert.strictEqual(route1.score, 0.6)
  assert.strictEqual(route1.ttl, 36)
  assert.strictEqual(route1.cacheTag, '\'test-app-1-service-1-apps-\' + .params["app-id"] + \'-products-\' + .params["id"]')
  assert.strictEqual(route1.hits, 76)
  assert.strictEqual(route1.misses, 4)
  assert.strictEqual(route1.memory, 90)
  assert.deepStrictEqual(route1.varyHeaders, [])
  assert.ok(route1.scores)

  const route2 = recommendationsRoutes.find((route) => route.route === '/books')
  assert.strictEqual(route2.applicationId, applicationId)
  assert.strictEqual(route2.recommendationId, foundRecommendation.id)
  assert.strictEqual(route2.telemetryId, 'test-app-1-service-1')
  assert.strictEqual(route2.serviceName, 'service-1')
  assert.strictEqual(route2.route, '/books')
  assert.strictEqual(route2.recommended, true)
  assert.strictEqual(route2.selected, true)
  assert.strictEqual(route2.score, 0.72)
  assert.strictEqual(route2.ttl, 43)
  assert.strictEqual(route2.cacheTag, "'test-app-1-service-1-books'")
  assert.strictEqual(route2.hits, 108)
  assert.strictEqual(route2.misses, 2)
  assert.strictEqual(route2.memory, 48)
  assert.deepStrictEqual(route2.varyHeaders, [])
  assert.ok(route2.scores)

  const currentVersion = await trafficInspector.getCurrentVersion()
  assert.strictEqual(currentVersion, 43)

  // Wait for TrafficInspector to clean up the version metrics
  await sleep(1000)
  const keys = await trafficInspector.redis.keys('*')

  assert.ok(keys.includes('traffic-inspector:versions'))

  const routeKeys = keys.filter((key) => key.startsWith('traffic-inspector:url-routes:'))
  assert.strictEqual(routeKeys.length, 3)

  const interceptorConfigs = await trafficInspector.platformatic.entities.interceptorConfig.find({})
  assert.strictEqual(interceptorConfigs.length, 0)
})

test('should generate a second cache recommendation', async (t) => {
  const telemetryId = 'test-app-1-service-1'
  const domain = 'service-1.plt.local'

  const controlPlane = await startControlPlane(t)

  const { application } = await controlPlane.testApi.saveInstance(
    'test-app-1',
    'test-image-1',
    'test-pod-1'
  )

  await controlPlane.testApi.saveApplicationState('test-pod-1', {
    services: [{
      id: 'service-1',
      type: '@platformatic/service',
      version: '1.0.0',
      entrypoint: true
    }]
  })

  const applicationId = application.id

  const prevRecommendation = { id: randomUUID(), version: 1 }
  const prevRecommendationTimestamp = new Date().toISOString()
  const prevRecommendationRoutes = [
    generateRecommendationRoute({
      route: '/books',
      recommendationId: prevRecommendation.id,
      applicationId,
      telemetryId,
      serviceName: 'service-1',
      domain,
      score: 0.88,
      ttl: 55,
      cacheTag: null,
      hits: 598,
      misses: 22,
      memory: 42,
      varyHeaders: [],
      scores: {
        frequencyStats: { count: 1, mean: 100, m2: 0, stdDev: 100 },
        stabilityStats: { count: 1, mean: 0.5, m2: 0, stdDev: 0 },
        scoresHistory: [{
          score: 0.88,
          recommended: 1,
          frequency: 100,
          stability: 0.5,
          requestCount: 620,
          timestamp: prevRecommendationTimestamp
        }]
      }
    })
  ]

  const requestsHashes = generateRequests({
    applicationId,
    requests: [
      {
        url: `http://${domain}/apps/1/products/42`,
        bodyHash: 'test-1-hash-1',
        bodySize: 11,
        counter: 2000,
        ttl: 100
      },
      {
        url: `http://${domain}/books`,
        bodyHash: 'test-2-hash-1',
        bodySize: 5,
        counter: 5000,
        ttl: 200
      },
      {
        url: `http://${domain}/books`,
        bodyHash: 'test-2-hash-2',
        bodySize: 48,
        counter: 600,
        ttl: 300
      }
    ]
  })

  const versions = [{ version: 2 }]

  const trafficInspector = await startTrafficInspector(t, {
    versions,
    requestsHashes,
    routes: [
      {
        applicationId,
        telemetryId,
        url: '/apps/1/products/42',
        route: '/apps/:app-id/products/:id'
      },
      {
        applicationId,
        telemetryId,
        url: '/apps/1/products/43',
        route: '/apps/:app-id/products/:id'
      },
      {
        applicationId,
        telemetryId,
        url: '/books',
        route: '/books'
      }
    ],
    recommendations: [prevRecommendation],
    recommendationsRoutes: prevRecommendationRoutes
  })

  const { statusCode, body } = await trafficInspector.inject({
    method: 'POST',
    url: '/recommendations'
  })
  assert.strictEqual(statusCode, 200, body)

  const recommendations = await trafficInspector.platformatic.entities.recommendation.find({})
  assert.strictEqual(recommendations.length, 2)

  const foundPrevRecommendation = recommendations.find((rec) => rec.id === prevRecommendation.id)
  assert.strictEqual(foundPrevRecommendation.version, 1)
  assert.strictEqual(foundPrevRecommendation.status, 'expired')

  const foundRecommendation = recommendations.find((rec) => rec.id !== prevRecommendation.id)
  assert.strictEqual(foundRecommendation.version, 2)
  assert.strictEqual(foundRecommendation.status, 'new')

  const recommendationsRoutes = await trafficInspector.platformatic.entities.recommendationsRoute.find({})
  assert.strictEqual(recommendationsRoutes.length, 3)

  const newRoutes = recommendationsRoutes.filter(
    (route) => route.recommendationId === foundRecommendation.id
  )
  assert.strictEqual(newRoutes.length, 2)

  const route1 = newRoutes.find((route) => route.route === '/apps/:app-id/products/:id')
  assert.strictEqual(route1.applicationId, applicationId)
  assert.strictEqual(route1.recommendationId, foundRecommendation.id)
  assert.strictEqual(route1.telemetryId, 'test-app-1-service-1')
  assert.strictEqual(route1.serviceName, 'service-1')
  assert.strictEqual(route1.route, '/apps/:app-id/products/:id')
  assert.strictEqual(route1.domain, domain)
  assert.strictEqual(route1.recommended, true)
  assert.strictEqual(route1.selected, true)
  assert.strictEqual(route1.score, 0.8)
  assert.strictEqual(route1.ttl, 48)
  assert.strictEqual(route1.cacheTag, '\'test-app-1-service-1-apps-\' + .params["app-id"] + \'-products-\' + .params["id"]')
  assert.strictEqual(route1.hits, 1999)
  assert.strictEqual(route1.misses, 1)
  assert.strictEqual(route1.memory, 11)
  assert.deepStrictEqual(route1.varyHeaders, [])
  assert.ok(route1.scores)

  const route2 = newRoutes.find((route) => route.route === '/books')
  assert.strictEqual(route2.applicationId, applicationId)
  assert.strictEqual(route2.recommendationId, foundRecommendation.id)
  assert.strictEqual(route2.telemetryId, 'test-app-1-service-1')
  assert.strictEqual(route2.serviceName, 'service-1')
  assert.strictEqual(route2.route, '/books')
  assert.strictEqual(route2.domain, domain)
  assert.strictEqual(route2.recommended, true)
  assert.strictEqual(route1.selected, true)
  assert.strictEqual(route2.score, 0.86)
  assert.ok(route2.ttl > 200)
  assert.strictEqual(route2.cacheTag, "'test-app-1-service-1-books'")
  assert.strictEqual(route2.hits, 5598)
  assert.strictEqual(route2.misses, 2)
  assert.strictEqual(route2.memory, 48)
  assert.deepStrictEqual(route2.varyHeaders, [])
  assert.ok(route2.scores)

  const currentVersion = await trafficInspector.getCurrentVersion()
  assert.strictEqual(currentVersion, 3)

  // Wait for TrafficInspector to clean up the version metrics
  await sleep(1000)
  const keys = await trafficInspector.redis.keys('*')

  assert.ok(keys.includes('traffic-inspector:versions'))

  const routeKeys = keys.filter((key) => key.startsWith('traffic-inspector:url-routes:'))
  assert.strictEqual(routeKeys.length, 3)

  const interceptorConfigs = await trafficInspector.platformatic.entities.interceptorConfig.find({})
  assert.strictEqual(interceptorConfigs.length, 0)
})

test('should not recommend a route to cache if there is only one request', async (t) => {
  const telemetryId = 'test-app-1-service-1'
  const domain = 'service-1.plt.local'

  const controlPlane = await startControlPlane(t)

  const { application } = await controlPlane.testApi.saveInstance(
    'test-app-1',
    'test-image-1',
    'test-pod-1'
  )

  await controlPlane.testApi.saveApplicationState('test-pod-1', {
    services: [{
      id: 'service-1',
      type: '@platformatic/service',
      version: '1.0.0',
      entrypoint: true
    }]
  })

  const applicationId = application.id

  const requestsHashes = generateRequests({
    applicationId,
    requests: [{
      url: `http://${domain}/apps/1/products/42`,
      bodyHash: 'test-1-hash-1',
      bodySize: 11,
      counter: 1,
      ttl: 100
    }]
  })

  const versions = [{ version: 1 }]

  const trafficInspector = await startTrafficInspector(t, {
    versions,
    requestsHashes,
    routes: [
      {
        applicationId,
        telemetryId,
        url: '/apps/1/products/42',
        route: '/apps/:app-id/products/:id'
      }
    ]
  })

  const { statusCode, body } = await trafficInspector.inject({
    method: 'POST',
    url: '/recommendations'
  })
  assert.strictEqual(statusCode, 200, body)

  const recommendations = await trafficInspector.platformatic.entities.recommendation.find({})
  assert.strictEqual(recommendations.length, 0)

  const interceptorConfigs = await trafficInspector.platformatic.entities.interceptorConfig.find({})
  assert.strictEqual(interceptorConfigs.length, 0)
})
