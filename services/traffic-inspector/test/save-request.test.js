'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const { startTrafficInspector } = require('./helper')

test('should save an example of the request (route info is already cached)', async (t) => {
  const applicationId = randomUUID()
  const telemetryId = 'test-app-1-service-1'
  const domain = 'example.com'

  const trafficInspector = await startTrafficInspector(t, {
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
    },
    routes: [{
      applicationId,
      telemetryId,
      url: '/products/33',
      route: '/products/:id'
    }]
  })

  const reqUrl = `http://${domain}/products/33?foo=bar`
  const reqHeaders = {
    'x-request-foo': 'bar',
    'x-request-bar': 'foo'
  }
  const resHeaders = {
    'x-response-foo': 'bar',
    'x-response-bar': 'foo'
  }
  const resBody = { foo: 'bar' }

  const { statusCode, body } = await trafficInspector.inject({
    method: 'POST',
    url: '/requests',
    headers: {
      'content-type': 'application/json',
      'x-labels': JSON.stringify({ applicationId }),
      'x-request-data': JSON.stringify({ url: reqUrl, headers: reqHeaders }),
      'x-response-data': JSON.stringify({ headers: resHeaders })
    },
    body: JSON.stringify(resBody)
  })

  const expectedRequest = {
    url: reqUrl,
    params: { id: '33' },
    querystring: { foo: 'bar' },
    headers: reqHeaders
  }
  const expectedResponse = { headers: resHeaders, body: resBody }

  assert.strictEqual(statusCode, 200, body)

  const routeExamples = await trafficInspector.platformatic.entities.routeExample.find({})
  assert.strictEqual(routeExamples.length, 1)

  const routeExample = routeExamples[0]
  assert.strictEqual(routeExample.applicationId, applicationId)
  assert.strictEqual(routeExample.telemetryId, telemetryId)
  assert.strictEqual(routeExample.route, '/products/:id')
  assert.deepStrictEqual(routeExample.request, expectedRequest)
  assert.deepStrictEqual(routeExample.response, expectedResponse)

  const cachedRequestsKeys = await trafficInspector.redis.keys('traffic-inspector:requests:*')
  assert.strictEqual(cachedRequestsKeys.length, 0)

  const cachedRouteExamplesKeys = await trafficInspector.redis.keys('traffic-inspector:examples:*')
  assert.strictEqual(cachedRouteExamplesKeys.length, 1)
})

test('should save an example of the request (route info is not in the cache)', async (t) => {
  const applicationId = randomUUID()
  const telemetryId = 'test-app-1-service-1'
  const domain = 'example.com'

  const trafficInspector = await startTrafficInspector(t, {
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

  const reqUrl = `http://${domain}/test?foo=bar`
  const reqHeaders = {
    'x-request-foo': 'bar',
    'x-request-bar': 'foo'
  }
  const resHeaders = {
    'x-response-foo': 'bar',
    'x-response-bar': 'foo'
  }
  const resBody = { foo: 'bar' }

  {
    const { statusCode, body } = await trafficInspector.inject({
      method: 'POST',
      url: '/requests',
      headers: {
        'content-type': 'application/json',
        'x-labels': JSON.stringify({ applicationId }),
        'x-request-data': JSON.stringify({ url: reqUrl, headers: reqHeaders }),
        'x-response-data': JSON.stringify({ headers: resHeaders })
      },
      body: JSON.stringify(resBody)
    })
    assert.strictEqual(statusCode, 200, body)
  }

  const expectedCachedRequest = {
    url: reqUrl,
    querystring: { foo: 'bar' },
    headers: reqHeaders
  }

  const expectedRequest = {
    url: reqUrl,
    params: {},
    querystring: { foo: 'bar' },
    headers: reqHeaders
  }
  const expectedResponse = { headers: resHeaders, body: resBody }

  {
    const routeExamples = await trafficInspector.platformatic.entities.routeExample.find({})
    assert.strictEqual(routeExamples.length, 0)

    const cachedRequestsKeys = await trafficInspector.redis.keys('traffic-inspector:requests:*')
    assert.strictEqual(cachedRequestsKeys.length, 1)

    const cachedRequest = await trafficInspector.redis.hgetall(cachedRequestsKeys[0])
    assert.deepStrictEqual(JSON.parse(cachedRequest.request), expectedCachedRequest)
    assert.deepStrictEqual(JSON.parse(cachedRequest.response), expectedResponse)

    const cachedRouteExamplesKeys = await trafficInspector.redis.keys('traffic-inspector:examples:*')
    assert.strictEqual(cachedRouteExamplesKeys.length, 0)
  }

  {
    const { statusCode, body } = await trafficInspector.inject({
      method: 'POST',
      url: '/routes',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        routes: [{
          applicationId,
          serviceId: telemetryId,
          url: '/test',
          route: '/test'
        }]
      })
    })
    assert.strictEqual(statusCode, 200, body)
  }

  {
    const routeExamples = await trafficInspector.platformatic.entities.routeExample.find({})
    assert.strictEqual(routeExamples.length, 1)

    const routeExample = routeExamples[0]
    assert.strictEqual(routeExample.applicationId, applicationId)
    assert.strictEqual(routeExample.telemetryId, telemetryId)
    assert.strictEqual(routeExample.route, '/test')
    assert.deepStrictEqual(routeExample.request, expectedRequest)
    assert.deepStrictEqual(routeExample.response, expectedResponse)

    const cachedRequestsKeys = await trafficInspector.redis.keys('traffic-inspector:requests:*')
    assert.strictEqual(cachedRequestsKeys.length, 0)

    const cachedRouteExamplesKeys = await trafficInspector.redis.keys('traffic-inspector:examples:*')
    assert.strictEqual(cachedRouteExamplesKeys.length, 1)
  }
})

test('should update an existing route example', async (t) => {
  const applicationId = randomUUID()
  const telemetryId = 'test-app-1-service-1'
  const domain = 'example.com'

  const reqUrl = `http://${domain}/test?foo=bar`
  const reqHeaders = {
    'x-request-foo': 'bar',
    'x-request-bar': 'foo'
  }
  const resHeaders = {
    'x-response-foo': 'bar',
    'x-response-bar': 'foo'
  }
  const resBody = { foo: 'bar' }

  const prevRequest = {
    url: reqUrl,
    params: {},
    querystring: { foo: 'bar' },
    headers: reqHeaders
  }
  const prevResponse = { headers: resHeaders, body: resBody }

  const trafficInspector = await startTrafficInspector(t, {
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
    },
    routes: [{
      applicationId,
      telemetryId,
      url: '/test',
      route: '/test'
    }],
    routeExamples: [{
      applicationId,
      telemetryId,
      route: '/test',
      request: JSON.stringify(prevRequest),
      response: JSON.stringify(prevResponse)
    }]
  })

  const newResBody = { bar: 'new-foo' }

  const { statusCode, body } = await trafficInspector.inject({
    method: 'POST',
    url: '/requests',
    headers: {
      'content-type': 'application/json',
      'x-labels': JSON.stringify({ applicationId }),
      'x-request-data': JSON.stringify({ url: reqUrl, headers: reqHeaders }),
      'x-response-data': JSON.stringify({ headers: resHeaders })
    },
    body: JSON.stringify(newResBody)
  })

  const newResponse = { headers: resHeaders, body: newResBody }

  assert.strictEqual(statusCode, 200, body)

  const routeExamples = await trafficInspector.platformatic.entities.routeExample.find({})
  assert.strictEqual(routeExamples.length, 1)

  const routeExample = routeExamples[0]
  assert.strictEqual(routeExample.applicationId, applicationId)
  assert.strictEqual(routeExample.telemetryId, telemetryId)
  assert.strictEqual(routeExample.route, '/test')
  assert.deepStrictEqual(routeExample.request, prevRequest)
  assert.deepStrictEqual(routeExample.response, newResponse)

  const cachedRequestsKeys = await trafficInspector.redis.keys('traffic-inspector:requests:*')
  assert.strictEqual(cachedRequestsKeys.length, 0)

  const cachedRouteExamplesKeys = await trafficInspector.redis.keys('traffic-inspector:examples:*')
  assert.strictEqual(cachedRouteExamplesKeys.length, 1)
})

test('should not update an existing request if it is cached by redis', async (t) => {
  const applicationId = randomUUID()
  const telemetryId = 'test-app-1-service-1'
  const domain = 'example.com'

  const reqUrl = `http://${domain}/test?foo=bar`
  const reqHeaders = {
    'x-request-foo': 'bar',
    'x-request-bar': 'foo'
  }
  const resHeaders = {
    'x-response-foo': 'bar',
    'x-response-bar': 'foo'
  }
  const resBody = { foo: 'bar' }

  const prevRequest = { url: reqUrl, headers: reqHeaders }
  const prevResponse = { headers: resHeaders, body: resBody }

  const trafficInspector = await startTrafficInspector(t, {
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
    },
    routeExamples: [{
      applicationId,
      telemetryId,
      route: '/test',
      request: JSON.stringify(prevRequest),
      response: JSON.stringify(prevResponse)
    }]
  })

  const requestKey = trafficInspector.generateRequestKey(
    applicationId,
    telemetryId,
    '/test'
  )
  await trafficInspector.redis.hset(requestKey, {
    request: JSON.stringify(prevRequest),
    response: JSON.stringify(prevResponse)
  })

  const newResBody = { bar: 'new-foo' }

  const { statusCode, body } = await trafficInspector.inject({
    method: 'POST',
    url: '/requests',
    headers: {
      'content-type': 'application/json',
      'x-labels': JSON.stringify({ applicationId }),
      'x-request-data': JSON.stringify({ url: reqUrl, headers: reqHeaders }),
      'x-response-data': JSON.stringify({ headers: resHeaders })
    },
    body: JSON.stringify(newResBody)
  })

  assert.strictEqual(statusCode, 200, body)

  const routeExamples = await trafficInspector.platformatic.entities.routeExample.find({})
  assert.strictEqual(routeExamples.length, 1)

  const routeExample = routeExamples[0]
  assert.strictEqual(routeExample.applicationId, applicationId)
  assert.strictEqual(routeExample.telemetryId, telemetryId)
  assert.strictEqual(routeExample.route, '/test')
  assert.deepStrictEqual(routeExample.request, prevRequest)
  assert.deepStrictEqual(routeExample.response, prevResponse)

  const cachedRequestsKeys = await trafficInspector.redis.keys('traffic-inspector:requests:*')
  assert.strictEqual(cachedRequestsKeys.length, 1)

  const cachedRequest = await trafficInspector.redis.hgetall(cachedRequestsKeys[0])
  assert.deepStrictEqual(JSON.parse(cachedRequest.request), prevRequest)
  assert.deepStrictEqual(JSON.parse(cachedRequest.response), prevResponse)
})

test('should not update an existing route example if it is cached by redis', async (t) => {
  const applicationId = randomUUID()
  const telemetryId = 'test-app-1-service-1'
  const domain = 'example.com'

  const reqUrl = `http://${domain}/products/42?foo=bar`
  const reqHeaders = {
    'x-request-foo': 'bar',
    'x-request-bar': 'foo'
  }
  const resHeaders = {
    'x-response-foo': 'bar',
    'x-response-bar': 'foo'
  }
  const resBody = { foo: 'bar' }

  const prevRequest = { url: reqUrl, headers: reqHeaders }
  const prevResponse = { headers: resHeaders, body: resBody }

  const trafficInspector = await startTrafficInspector(t, {
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
    },
    routes: [
      {
        applicationId,
        telemetryId,
        url: '/products/42',
        route: '/products/:id'
      },
      {
        applicationId,
        telemetryId,
        url: '/products/43',
        route: '/products/:id'
      }
    ],
    routeExamples: [{
      applicationId,
      telemetryId,
      route: '/products/:id',
      request: JSON.stringify(prevRequest),
      response: JSON.stringify(prevResponse)
    }]
  })

  const routeExampleKey = trafficInspector.generateRouteExampleKey(
    applicationId,
    telemetryId,
    '/products/:id'
  )
  await trafficInspector.redis.set(routeExampleKey, 1)

  const newUrl = `http://${domain}/products/43?foo=bar`
  const newResBody = { bar: 'new-foo' }

  const newRequest = {
    url: newUrl,
    querystring: { foo: 'bar' },
    headers: reqHeaders
  }
  const newResponse = { headers: resHeaders, body: newResBody }

  const { statusCode, body } = await trafficInspector.inject({
    method: 'POST',
    url: '/requests',
    headers: {
      'content-type': 'application/json',
      'x-labels': JSON.stringify({ applicationId }),
      'x-request-data': JSON.stringify({ url: newUrl, headers: reqHeaders }),
      'x-response-data': JSON.stringify({ headers: resHeaders })
    },
    body: JSON.stringify(newResBody)
  })

  assert.strictEqual(statusCode, 200, body)

  const routeExamples = await trafficInspector.platformatic.entities.routeExample.find({})
  assert.strictEqual(routeExamples.length, 1)

  const routeExample = routeExamples[0]
  assert.strictEqual(routeExample.applicationId, applicationId)
  assert.strictEqual(routeExample.telemetryId, telemetryId)
  assert.strictEqual(routeExample.route, '/products/:id')
  assert.deepStrictEqual(routeExample.request, prevRequest)
  assert.deepStrictEqual(routeExample.response, prevResponse)

  const cachedRequestsKeys = await trafficInspector.redis.keys('traffic-inspector:requests:*')
  assert.strictEqual(cachedRequestsKeys.length, 1)

  const cachedRequest = await trafficInspector.redis.hgetall(cachedRequestsKeys[0])
  assert.deepStrictEqual(JSON.parse(cachedRequest.request), newRequest)
  assert.deepStrictEqual(JSON.parse(cachedRequest.response), newResponse)
})
