'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const { startTrafficante } = require('./helper')

test('should save url routes', async (t) => {
  const applicationId = randomUUID()
  const telemetryId = 'test-app-1-service-1'

  const trafficante = await startTrafficante(t)

  const { statusCode, body } = await trafficante.inject({
    method: 'POST',
    url: '/routes',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      routes: [
        {
          applicationId,
          serviceId: telemetryId,
          url: '/products/42',
          route: '/products/:id'
        }
      ]
    })
  })

  assert.strictEqual(statusCode, 200, body)

  const routeExamples = await trafficante.platformatic.entities.routeExample.find({})
  assert.strictEqual(routeExamples.length, 0)

  const routesKeys = await trafficante.redis.keys('trafficante:url-routes:*')
  assert.strictEqual(routesKeys.length, 1)

  const routeKey = routesKeys[0]
  const route = await trafficante.redis.get(routeKey)
  assert.strictEqual(route, '/products/:id')

  const examplesKeys = await trafficante.redis.keys('trafficante:examples:*')
  assert.strictEqual(examplesKeys.length, 0)

  const cachedRequestsKeys = await trafficante.redis.keys('trafficante:requests:*')
  assert.strictEqual(cachedRequestsKeys.length, 0)
})

test('should overwrite a route if it exists', async (t) => {
  const applicationId = randomUUID()
  const telemetryId = 'test-app-1-service-1'

  const trafficante = await startTrafficante(t, {
    routes: [
      {
        applicationId,
        telemetryId,
        url: '/products/42',
        route: '/products/:id'
      }
    ]
  })

  const { statusCode, body } = await trafficante.inject({
    method: 'POST',
    url: '/routes',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      routes: [
        {
          applicationId,
          serviceId: telemetryId,
          url: '/products/42',
          route: '/products/*'
        }
      ]
    })
  })

  assert.strictEqual(statusCode, 200, body)

  const routeExamples = await trafficante.platformatic.entities.routeExample.find({})
  assert.strictEqual(routeExamples.length, 0)

  const routesKeys = await trafficante.redis.keys('trafficante:url-routes:*')
  assert.strictEqual(routesKeys.length, 1)

  const routeKey = routesKeys[0]
  const route = await trafficante.redis.get(routeKey)
  assert.strictEqual(route, '/products/*')

  const examplesKeys = await trafficante.redis.keys('trafficante:examples:*')
  assert.strictEqual(examplesKeys.length, 0)

  const cachedRequestsKeys = await trafficante.redis.keys('trafficante:requests:*')
  assert.strictEqual(cachedRequestsKeys.length, 0)
})

test('should save url routes (creates a route example)', async (t) => {
  const applicationId = randomUUID()
  const telemetryId = 'test-app-1-service-1'
  const domain = 'service-1.plt.local'

  const request = {
    url: `http://${domain}/products/42?foo=bar`,
    params: { id: '42' },
    querystring: { foo: 'bar' },
    headers: {
      'x-request-foo': 'bar',
      'x-request-bar': 'foo'
    }
  }
  const response = {
    headers: {
      'x-response-foo': 'bar',
      'x-response-bar': 'foo'
    },
    body: { foo: 'bar' }
  }

  const trafficante = await startTrafficante(t, {
    requests: [{ applicationId, request, response }],
    domains: {
      domains: {
        [applicationId]: {
          [domain]: {
            telemetryId,
            serviceName: 'service-1',
            applicationName: 'test-app-1'
          }
        }
      }
    }
  })

  const { statusCode, body } = await trafficante.inject({
    method: 'POST',
    url: '/routes',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      routes: [
        {
          applicationId,
          serviceId: telemetryId,
          url: '/products/42',
          route: '/products/:id'
        }
      ]
    })
  })

  assert.strictEqual(statusCode, 200, body)

  const routeExamples = await trafficante.platformatic.entities.routeExample.find({})
  assert.strictEqual(routeExamples.length, 1)

  const routeExample = routeExamples[0]
  assert.strictEqual(routeExample.applicationId, applicationId)
  assert.strictEqual(routeExample.telemetryId, telemetryId)
  assert.strictEqual(routeExample.route, '/products/:id')
  assert.deepStrictEqual(routeExample.request, request)
  assert.deepStrictEqual(routeExample.response, response)

  const routesKeys = await trafficante.redis.keys('trafficante:url-routes:*')
  assert.strictEqual(routesKeys.length, 1)

  const routeKey = routesKeys[0]
  const route = await trafficante.redis.get(routeKey)
  assert.strictEqual(route, '/products/:id')

  const examplesKeys = await trafficante.redis.keys('trafficante:examples:*')
  assert.strictEqual(examplesKeys.length, 1)

  const cachedRequestsKeys = await trafficante.redis.keys('trafficante:requests:*')
  assert.strictEqual(cachedRequestsKeys.length, 0)
})
