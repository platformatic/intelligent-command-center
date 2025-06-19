'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const Fastify = require('fastify')
const Metrics = require('../../lib/metrics')
const { setupMockPrometheusServer } = require('../helper')

function createMockLogger () {
  return {
    info: () => {},
    error: () => {},
    debug: () => {},
    warn: () => {}
  }
}

function createCapturingMockLogger () {
  const logs = []
  return {
    info: (data, msg) => logs.push({ level: 'info', data, msg }),
    error: (data, msg) => logs.push({ level: 'error', data, msg }),
    debug: (data, msg) => logs.push({ level: 'debug', data, msg }),
    warn: (data, msg) => logs.push({ level: 'warn', data, msg }),
    getLogs: () => logs
  }
}

test('query heap size and event loop utilization metrics', async (t) => {
  const mockHeapSizeResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: { applicationId: 'test-app', podId: 'pod-1' },
          values: [[1620000000, '100000000'], [1620000001, '110000000']]
        },
        {
          metric: { applicationId: 'test-app', podId: 'pod-2' },
          values: [[1620000000, '120000000'], [1620000001, '130000000']]
        }
      ]
    }
  }

  const mockEventLoopResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: { applicationId: 'test-app', podId: 'pod-1' },
          values: [[1620000000, '0.6'], [1620000001, '0.7']]
        },
        {
          metric: { applicationId: 'test-app', podId: 'pod-2' },
          values: [[1620000000, '0.8'], [1620000001, '0.9']]
        }
      ]
    }
  }

  const mockResponses = {
    heapSize: mockHeapSizeResponse,
    eventLoop: mockEventLoopResponse
  }
  const originalDateNow = Date.now
  Date.now = () => 1620000000 * 1000

  const mockServer = await setupMockPrometheusServer(mockResponses)
  t.after(async () => {
    await mockServer.close()
    Date.now = originalDateNow
  })
  const prometheusUrl = mockServer.address

  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger)

  const heapSizeResult = await metrics.queryNodeJsHeapSize('test-app')
  const eventLoopResult = await metrics.queryEventLoopUtilization('test-app')
  const applicationMetrics = await metrics.getApplicationMetrics('test-app')

  assert.ok(heapSizeResult['pod-1'])
  assert.ok(heapSizeResult['pod-2'])
  assert.strictEqual(heapSizeResult['pod-1'][0].metric.applicationId, 'test-app')
  assert.strictEqual(heapSizeResult['pod-1'][0].metric.podId, 'pod-1')
  assert.deepStrictEqual(heapSizeResult['pod-1'][0].values, [[1620000000, '100000000'], [1620000001, '110000000']])

  assert.ok(eventLoopResult['pod-1'])
  assert.ok(eventLoopResult['pod-2'])
  assert.strictEqual(eventLoopResult['pod-1'][0].metric.applicationId, 'test-app')
  assert.strictEqual(eventLoopResult['pod-1'][0].metric.podId, 'pod-1')
  assert.deepStrictEqual(eventLoopResult['pod-1'][0].values, [[1620000000, '0.6'], [1620000001, '0.7']])

  assert.ok(applicationMetrics['pod-1'])
  assert.ok(applicationMetrics['pod-2'])
  assert.ok(applicationMetrics['pod-1'].heapSize)
  assert.ok(applicationMetrics['pod-1'].eventLoopUtilization)
  assert.strictEqual(applicationMetrics['pod-1'].heapSize[0].metric.podId, 'pod-1')
  assert.strictEqual(applicationMetrics['pod-2'].heapSize[0].metric.podId, 'pod-2')
})

test('handle error when Prometheus returns non-200 response', async (t) => {
  const server = Fastify()
  server.get('/api/v1/query_range', async (request, reply) => {
    return reply.status(500).send({ status: 'error', error: 'Internal server error' })
  })

  const address = await server.listen({ port: 0 })
  t.after(async () => {
    await server.close()
  })

  const prometheusUrl = address
  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger)

  await assert.rejects(
    async () => {
      await metrics.queryNodeJsHeapSize('test-app')
    },
    (err) => {
      assert.ok(err instanceof Error)
      assert.ok(err.message.includes('Prometheus API error'))
      return true
    }
  )
})

test('handle invalid response format from Prometheus', async (t) => {
  const invalidResponse = {
    status: 'success',
    data: {
      resultType: 'matrix'
    }
  }

  const mockServer = await setupMockPrometheusServer({
    heapSize: invalidResponse
  })
  t.after(async () => {
    await mockServer.close()
  })

  const prometheusUrl = mockServer.address
  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger)

  await assert.rejects(
    async () => {
      await metrics.queryNodeJsHeapSize('test-app')
    },
    (err) => {
      assert.ok(err instanceof Error)
      assert.ok(err.message.includes('Invalid response for metric'))
      return true
    }
  )
})

test('handle empty results from Prometheus', async (t) => {
  const emptyResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: []
    }
  }

  const mockServer = await setupMockPrometheusServer({
    heapSize: emptyResponse,
    eventLoop: emptyResponse
  })
  t.after(async () => {
    await mockServer.close()
  })

  const prometheusUrl = mockServer.address
  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger)

  const heapSizeResult = await metrics.queryNodeJsHeapSize('test-app')
  assert.deepStrictEqual(heapSizeResult, {})

  const applicationMetrics = await metrics.getApplicationMetrics('test-app')
  assert.deepStrictEqual(applicationMetrics, {})
})

test('use custom time range for queries', async (t) => {
  const mockHeapSizeResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: { applicationId: 'test-app', podId: 'pod-1' },
          values: [[1620000000, '100000000'], [1620000060, '110000000']]
        }
      ]
    }
  }

  const originalDateNow = Date.now
  Date.now = () => 1620000120 * 1000
  t.after(() => {
    Date.now = originalDateNow
  })

  let capturedQuery = null
  const server = Fastify()
  server.get('/api/v1/query_range', async (request, reply) => {
    capturedQuery = request.query
    return mockHeapSizeResponse
  })

  const address = await server.listen({ port: 0 })
  t.after(async () => {
    await server.close()
  })

  const prometheusUrl = address
  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger)

  await metrics.queryNodeJsHeapSize('test-app', 30)

  assert.strictEqual(capturedQuery.start, (1620000120 - 30).toString())
  assert.strictEqual(capturedQuery.end, '1620000120')
})

test('use timeRange from constructor', async (t) => {
  const mockHeapSizeResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: { applicationId: 'test-app', podId: 'pod-1' },
          values: [[1620000000, '100000000'], [1620000060, '110000000']]
        }
      ]
    }
  }

  const originalDateNow = Date.now
  Date.now = () => 1620000120 * 1000
  t.after(() => {
    Date.now = originalDateNow
  })

  const capturedQueries = []
  const server = Fastify()
  server.get('/api/v1/query_range', async (request, reply) => {
    capturedQueries.push({ ...request.query })
    return mockHeapSizeResponse
  })

  const address = await server.listen({ port: 0 })
  t.after(async () => {
    await server.close()
  })

  const prometheusUrl = address
  const mockLogger = createMockLogger()

  const metrics = new Metrics(prometheusUrl, mockLogger, { timeRange: 90 })

  await metrics.queryNodeJsHeapSize('test-app')
  await metrics.getApplicationMetrics('test-app')

  assert.strictEqual(capturedQueries[0].start, (1620000120 - 90).toString())
  assert.strictEqual(capturedQueries[0].end, '1620000120')

  assert.strictEqual(capturedQueries[1].start, (1620000120 - 90).toString())
  assert.strictEqual(capturedQueries[2].start, (1620000120 - 90).toString())
})

test('query metrics for all applications', async (t) => {
  const mockAllHeapSizeResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: { applicationId: 'app-1', podId: 'pod-1' },
          values: [[1620000000, '100000000'], [1620000001, '110000000']]
        },
        {
          metric: { applicationId: 'app-1', podId: 'pod-2' },
          values: [[1620000000, '120000000'], [1620000001, '130000000']]
        },
        {
          metric: { applicationId: 'app-2', podId: 'pod-3' },
          values: [[1620000000, '140000000'], [1620000001, '150000000']]
        },
        {
          metric: { applicationId: 'app-2', podId: 'pod-4' },
          values: [[1620000000, '160000000'], [1620000001, '170000000']]
        }
      ]
    }
  }

  const mockAllEventLoopResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: { applicationId: 'app-1', podId: 'pod-1' },
          values: [[1620000000, '0.6'], [1620000001, '0.7']]
        },
        {
          metric: { applicationId: 'app-1', podId: 'pod-2' },
          values: [[1620000000, '0.8'], [1620000001, '0.9']]
        },
        {
          metric: { applicationId: 'app-2', podId: 'pod-3' },
          values: [[1620000000, '0.5'], [1620000001, '0.6']]
        },
        {
          metric: { applicationId: 'app-2', podId: 'pod-4' },
          values: [[1620000000, '0.7'], [1620000001, '0.8']]
        }
      ]
    }
  }

  const mockResponses = {
    allHeapSize: mockAllHeapSizeResponse,
    allEventLoop: mockAllEventLoopResponse
  }

  const originalDateNow = Date.now
  Date.now = () => 1620000000 * 1000

  const mockServer = await setupMockPrometheusServer(mockResponses)
  t.after(async () => {
    await mockServer.close()
    Date.now = originalDateNow
  })

  const prometheusUrl = mockServer.address
  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger)

  const allAppsMetrics = await metrics.getAllApplicationsMetrics()

  assert.ok(allAppsMetrics['app-1'])
  assert.ok(allAppsMetrics['app-2'])

  assert.ok(allAppsMetrics['app-1']['pod-1'])
  assert.ok(allAppsMetrics['app-1']['pod-2'])

  assert.ok(allAppsMetrics['app-2']['pod-3'])
  assert.ok(allAppsMetrics['app-2']['pod-4'])

  assert.ok(allAppsMetrics['app-1']['pod-1'].heapSize)
  assert.ok(allAppsMetrics['app-1']['pod-1'].eventLoopUtilization)

  assert.strictEqual(allAppsMetrics['app-1']['pod-1'].heapSize[0].metric.applicationId, 'app-1')
  assert.strictEqual(allAppsMetrics['app-1']['pod-1'].heapSize[0].metric.podId, 'pod-1')
  assert.deepStrictEqual(allAppsMetrics['app-1']['pod-1'].heapSize[0].values, [[1620000000, '100000000'], [1620000001, '110000000']])

  assert.strictEqual(allAppsMetrics['app-1']['pod-1'].eventLoopUtilization[0].metric.applicationId, 'app-1')
  assert.strictEqual(allAppsMetrics['app-1']['pod-1'].eventLoopUtilization[0].metric.podId, 'pod-1')
  assert.deepStrictEqual(allAppsMetrics['app-1']['pod-1'].eventLoopUtilization[0].values, [[1620000000, '0.6'], [1620000001, '0.7']])

  assert.strictEqual(allAppsMetrics['app-2']['pod-3'].heapSize[0].metric.applicationId, 'app-2')
  assert.strictEqual(allAppsMetrics['app-2']['pod-3'].heapSize[0].metric.podId, 'pod-3')
  assert.deepStrictEqual(allAppsMetrics['app-2']['pod-3'].heapSize[0].values, [[1620000000, '140000000'], [1620000001, '150000000']])
})

test('handle empty results from all applications query', async (t) => {
  const emptyResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: []
    }
  }

  const mockServer = await setupMockPrometheusServer({
    allHeapSize: emptyResponse,
    allEventLoop: emptyResponse
  })

  t.after(async () => {
    await mockServer.close()
  })

  const prometheusUrl = mockServer.address
  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger)

  const allAppsMetrics = await metrics.getAllApplicationsMetrics()
  assert.deepStrictEqual(allAppsMetrics, {})
})

test('verify time range for all applications query', async (t) => {
  const mockResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: []
    }
  }

  const originalDateNow = Date.now
  Date.now = () => 1620000120 * 1000
  t.after(() => {
    Date.now = originalDateNow
  })

  const capturedQueries = []
  const server = Fastify()
  server.get('/api/v1/query_range', async (request, reply) => {
    capturedQueries.push({ ...request.query })
    return mockResponse
  })

  const address = await server.listen({ port: 0 })
  t.after(async () => {
    await server.close()
  })

  const prometheusUrl = address
  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger, { timeRange: 90 })

  await metrics.getAllApplicationsMetrics()

  assert.strictEqual(capturedQueries.length, 2)
  assert.strictEqual(capturedQueries[0].start, (1620000120 - 90).toString())
  assert.strictEqual(capturedQueries[0].end, '1620000120')
  assert.strictEqual(capturedQueries[1].start, (1620000120 - 90).toString())
  assert.strictEqual(capturedQueries[1].end, '1620000120')
})

test('handle metrics with instanceId instead of podId', async (t) => {
  const mockHeapSizeResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: { applicationId: 'test-app', instanceId: 'instance-1' },
          values: [[1620000000, '100000000'], [1620000001, '110000000']]
        },
        {
          metric: { applicationId: 'test-app', podId: 'pod-2' },
          values: [[1620000000, '120000000'], [1620000001, '130000000']]
        }
      ]
    }
  }

  const mockEventLoopResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: { applicationId: 'test-app', instanceId: 'instance-1' },
          values: [[1620000000, '0.6'], [1620000001, '0.7']]
        }
      ]
    }
  }

  const mockResponses = {
    heapSize: mockHeapSizeResponse,
    eventLoop: mockEventLoopResponse
  }
  const originalDateNow = Date.now
  Date.now = () => 1620000000 * 1000

  const mockServer = await setupMockPrometheusServer(mockResponses)
  t.after(async () => {
    await mockServer.close()
    Date.now = originalDateNow
  })
  const prometheusUrl = mockServer.address

  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger)

  const heapSizeResult = await metrics.queryNodeJsHeapSize('test-app')
  const applicationMetrics = await metrics.getApplicationMetrics('test-app')

  assert.ok(heapSizeResult['instance-1'])
  assert.ok(heapSizeResult['pod-2'])
  assert.strictEqual(heapSizeResult['instance-1'][0].metric.instanceId, 'instance-1')
  assert.strictEqual(heapSizeResult['pod-2'][0].metric.podId, 'pod-2')

  assert.ok(applicationMetrics['instance-1'])
  assert.ok(applicationMetrics['pod-2'])
  assert.ok(applicationMetrics['instance-1'].heapSize)
  assert.ok(applicationMetrics['instance-1'].eventLoopUtilization)
  assert.ok(applicationMetrics['pod-2'].heapSize)
  assert.strictEqual(applicationMetrics['pod-2'].eventLoopUtilization.length, 0)
})

test('handle metrics with missing podId and instanceId (fallback to unknown)', async (t) => {
  const mockHeapSizeResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: { applicationId: 'test-app' },
          values: [[1620000000, '100000000']]
        }
      ]
    }
  }

  const mockEventLoopResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: []
    }
  }

  const mockResponses = {
    heapSize: mockHeapSizeResponse,
    eventLoop: mockEventLoopResponse
  }
  const originalDateNow = Date.now
  Date.now = () => 1620000000 * 1000

  const mockServer = await setupMockPrometheusServer(mockResponses)
  t.after(async () => {
    await mockServer.close()
    Date.now = originalDateNow
  })
  const prometheusUrl = mockServer.address

  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger)

  const heapSizeResult = await metrics.queryNodeJsHeapSize('test-app')
  const applicationMetrics = await metrics.getApplicationMetrics('test-app')

  assert.ok(heapSizeResult.unknown)
  assert.strictEqual(heapSizeResult.unknown[0].metric.applicationId, 'test-app')
  assert.strictEqual(heapSizeResult.unknown[0].values[0][1], '100000000')

  assert.ok(applicationMetrics.unknown)
  assert.ok(applicationMetrics.unknown.heapSize)
  assert.strictEqual(applicationMetrics.unknown.eventLoopUtilization.length, 0)
})

test('handle all applications metrics with instanceId instead of podId', async (t) => {
  const mockAllHeapSizeResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: { applicationId: 'app-1', instanceId: 'instance-1' },
          values: [[1620000000, '100000000']]
        },
        {
          metric: { applicationId: 'app-1', podId: 'pod-2' },
          values: [[1620000000, '120000000']]
        },
        {
          metric: { applicationId: 'app-2' },
          values: [[1620000000, '140000000']]
        }
      ]
    }
  }

  const mockAllEventLoopResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: { applicationId: 'app-1', instanceId: 'instance-1' },
          values: [[1620000000, '0.6']]
        }
      ]
    }
  }

  const mockResponses = {
    allHeapSize: mockAllHeapSizeResponse,
    allEventLoop: mockAllEventLoopResponse
  }

  const originalDateNow = Date.now
  Date.now = () => 1620000000 * 1000

  const mockServer = await setupMockPrometheusServer(mockResponses)
  t.after(async () => {
    await mockServer.close()
    Date.now = originalDateNow
  })

  const prometheusUrl = mockServer.address
  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger)

  const allAppsMetrics = await metrics.getAllApplicationsMetrics()

  assert.ok(allAppsMetrics['app-1'])
  assert.ok(allAppsMetrics['app-2'])

  assert.ok(allAppsMetrics['app-1']['instance-1'])
  assert.ok(allAppsMetrics['app-1']['pod-2'])
  assert.ok(allAppsMetrics['app-2'].unknown)

  assert.ok(allAppsMetrics['app-1']['instance-1'].heapSize)
  assert.ok(allAppsMetrics['app-1']['instance-1'].eventLoopUtilization)
  assert.ok(allAppsMetrics['app-1']['pod-2'].heapSize)
  assert.strictEqual(allAppsMetrics['app-1']['pod-2'].eventLoopUtilization.length, 0)
  assert.ok(allAppsMetrics['app-2'].unknown.heapSize)
  assert.strictEqual(allAppsMetrics['app-2'].unknown.eventLoopUtilization.length, 0)
})

test('handle all applications metrics with missing applicationId (fallback to unknown)', async (t) => {
  const mockAllHeapSizeResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: { podId: 'pod-1' },
          values: [[1620000000, '100000000']]
        }
      ]
    }
  }

  const mockAllEventLoopResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: []
    }
  }

  const mockResponses = {
    allHeapSize: mockAllHeapSizeResponse,
    allEventLoop: mockAllEventLoopResponse
  }

  const originalDateNow = Date.now
  Date.now = () => 1620000000 * 1000

  const mockServer = await setupMockPrometheusServer(mockResponses)
  t.after(async () => {
    await mockServer.close()
    Date.now = originalDateNow
  })

  const prometheusUrl = mockServer.address
  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger)

  const allAppsMetrics = await metrics.getAllApplicationsMetrics()

  assert.ok(allAppsMetrics.unknown)
  assert.ok(allAppsMetrics.unknown['pod-1'])
  assert.ok(allAppsMetrics.unknown['pod-1'].heapSize)
  assert.strictEqual(allAppsMetrics.unknown['pod-1'].eventLoopUtilization.length, 0)
})

test('handle invalid status in Prometheus response', async (t) => {
  const invalidStatusResponse = {
    status: 'error',
    data: {
      resultType: 'matrix',
      result: []
    }
  }

  const mockServer = await setupMockPrometheusServer({
    heapSize: invalidStatusResponse
  })
  t.after(async () => {
    await mockServer.close()
  })

  const prometheusUrl = mockServer.address
  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger)

  await assert.rejects(
    async () => {
      await metrics.queryNodeJsHeapSize('test-app')
    },
    (err) => {
      assert.ok(err instanceof Error)
      assert.ok(err.message.includes('Invalid response for metric'))
      return true
    }
  )
})

test('handle missing data field in Prometheus response', async (t) => {
  const missingDataResponse = {
    status: 'success'
  }

  const mockServer = await setupMockPrometheusServer({
    heapSize: missingDataResponse
  })
  t.after(async () => {
    await mockServer.close()
  })

  const prometheusUrl = mockServer.address
  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger)

  await assert.rejects(
    async () => {
      await metrics.queryNodeJsHeapSize('test-app')
    },
    (err) => {
      assert.ok(err instanceof Error)
      assert.ok(err.message.includes('Invalid response for metric'))
      return true
    }
  )
})

test('handle error in getApplicationMetrics', async (t) => {
  const server = Fastify()
  server.get('/api/v1/query_range', async (request, reply) => {
    return reply.status(500).send({ status: 'error', error: 'Internal server error' })
  })

  const address = await server.listen({ port: 0 })
  t.after(async () => {
    await server.close()
  })

  const prometheusUrl = address
  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger)

  await assert.rejects(
    async () => {
      await metrics.getApplicationMetrics('test-app')
    },
    (err) => {
      assert.ok(err instanceof Error)
      assert.ok(err.message.includes('Prometheus API error'))
      return true
    }
  )
})

test('handle error in getAllApplicationsMetrics', async (t) => {
  const server = Fastify()
  server.get('/api/v1/query_range', async (request, reply) => {
    return reply.status(500).send({ status: 'error', error: 'Internal server error' })
  })

  const address = await server.listen({ port: 0 })
  t.after(async () => {
    await server.close()
  })

  const prometheusUrl = address
  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger)

  await assert.rejects(
    async () => {
      await metrics.getAllApplicationsMetrics()
    },
    (err) => {
      assert.ok(err instanceof Error)
      assert.ok(err.message.includes('Prometheus API error'))
      return true
    }
  )
})

test('handle invalid status in all applications Prometheus response', async (t) => {
  const invalidStatusResponse = {
    status: 'error',
    data: {
      resultType: 'matrix',
      result: []
    }
  }

  const mockServer = await setupMockPrometheusServer({
    allHeapSize: invalidStatusResponse,
    allEventLoop: invalidStatusResponse
  })
  t.after(async () => {
    await mockServer.close()
  })

  const prometheusUrl = mockServer.address
  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger)

  await assert.rejects(
    async () => {
      await metrics.getAllApplicationsMetrics()
    },
    (err) => {
      assert.ok(err instanceof Error)
      assert.ok(err.message.includes('Invalid response for metric'))
      return true
    }
  )
})

test('use custom timeRange parameter in getApplicationMetrics', async (t) => {
  const mockHeapSizeResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: []
    }
  }

  const originalDateNow = Date.now
  Date.now = () => 1620000120 * 1000
  t.after(() => {
    Date.now = originalDateNow
  })

  const capturedQueries = []
  const server = Fastify()
  server.get('/api/v1/query_range', async (request, reply) => {
    capturedQueries.push({ ...request.query })
    return mockHeapSizeResponse
  })

  const address = await server.listen({ port: 0 })
  t.after(async () => {
    await server.close()
  })

  const prometheusUrl = address
  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger, { timeRange: 60 })

  // Use custom timeRange that's different from constructor
  await metrics.getApplicationMetrics('test-app', 45)

  assert.strictEqual(capturedQueries.length, 2)
  assert.strictEqual(capturedQueries[0].start, (1620000120 - 45).toString())
  assert.strictEqual(capturedQueries[1].start, (1620000120 - 45).toString())
})

test('use custom timeRange parameter in getAllApplicationsMetrics', async (t) => {
  const mockResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: []
    }
  }

  const originalDateNow = Date.now
  Date.now = () => 1620000120 * 1000
  t.after(() => {
    Date.now = originalDateNow
  })

  const capturedQueries = []
  const server = Fastify()
  server.get('/api/v1/query_range', async (request, reply) => {
    capturedQueries.push({ ...request.query })
    return mockResponse
  })

  const address = await server.listen({ port: 0 })
  t.after(async () => {
    await server.close()
  })

  const prometheusUrl = address
  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger, { timeRange: 60 })

  // Use custom timeRange that's different from constructor
  await metrics.getAllApplicationsMetrics(75)

  assert.strictEqual(capturedQueries.length, 2)
  assert.strictEqual(capturedQueries[0].start, (1620000120 - 75).toString())
  assert.strictEqual(capturedQueries[1].start, (1620000120 - 75).toString())
})

test('verify debug logging is called', async (t) => {
  const mockHeapSizeResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: { applicationId: 'test-app', podId: 'pod-1' },
          values: [[1620000000, '100000000']]
        }
      ]
    }
  }

  const originalDateNow = Date.now
  Date.now = () => 1620000000 * 1000

  const mockServer = await setupMockPrometheusServer({
    heapSize: mockHeapSizeResponse
  })
  t.after(async () => {
    await mockServer.close()
    Date.now = originalDateNow
  })
  const prometheusUrl = mockServer.address

  const mockLogger = createCapturingMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger)

  await metrics.queryNodeJsHeapSize('test-app')

  const logs = mockLogger.getLogs()
  const debugLogs = logs.filter(log => log.level === 'debug')
  assert.ok(debugLogs.length > 0, 'Should have debug logs')
  assert.ok(debugLogs[0].msg === 'Querying Prometheus')
  assert.ok(debugLogs[0].data.url.includes('/api/v1/query_range'))
})

test('verify warn logging for invalid response', async (t) => {
  const invalidResponse = {
    status: 'success',
    data: {
      resultType: 'matrix'
    }
  }

  const mockServer = await setupMockPrometheusServer({
    heapSize: invalidResponse
  })
  t.after(async () => {
    await mockServer.close()
  })

  const prometheusUrl = mockServer.address
  const mockLogger = createCapturingMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger)

  await assert.rejects(
    async () => {
      await metrics.queryNodeJsHeapSize('test-app')
    },
    (err) => {
      assert.ok(err instanceof Error)
      return true
    }
  )

  const logs = mockLogger.getLogs()
  const warnLogs = logs.filter(log => log.level === 'warn')
  assert.ok(warnLogs.length > 0, 'Should have warn logs')
  assert.ok(warnLogs[0].msg.includes('Invalid response for metric'))
})

test('verify error logging for Prometheus errors', async (t) => {
  const server = Fastify()
  server.get('/api/v1/query_range', async (request, reply) => {
    return reply.status(500).send({ status: 'error', error: 'Internal server error' })
  })

  const address = await server.listen({ port: 0 })
  t.after(async () => {
    await server.close()
  })

  const prometheusUrl = address
  const mockLogger = createCapturingMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger)

  await assert.rejects(
    async () => {
      await metrics.queryNodeJsHeapSize('test-app')
    },
    (err) => {
      assert.ok(err instanceof Error)
      return true
    }
  )

  const logs = mockLogger.getLogs()
  const errorLogs = logs.filter(log => log.level === 'error')
  assert.ok(errorLogs.length > 0, 'Should have error logs')
  assert.ok(errorLogs[0].msg === 'Error querying Prometheus')
  assert.ok(errorLogs[0].data.metricName)
  assert.ok(errorLogs[0].data.applicationId)
})

test('verify debug logging for all applications queries', async (t) => {
  const mockResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: { applicationId: 'app-1', podId: 'pod-1' },
          values: [[1620000000, '100000000']]
        }
      ]
    }
  }

  const originalDateNow = Date.now
  Date.now = () => 1620000000 * 1000

  const mockServer = await setupMockPrometheusServer({
    allHeapSize: mockResponse,
    allEventLoop: mockResponse
  })
  t.after(async () => {
    await mockServer.close()
    Date.now = originalDateNow
  })
  const prometheusUrl = mockServer.address

  const mockLogger = createCapturingMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger)

  await metrics.getAllApplicationsMetrics()

  const logs = mockLogger.getLogs()
  const debugLogs = logs.filter(log => log.level === 'debug')
  assert.ok(debugLogs.length >= 2)
  assert.ok(debugLogs.some(log => log.msg === 'Querying Prometheus for all applications'))
  assert.ok(debugLogs.every(log => log.data.url.includes('/api/v1/query_range')))
})

test('verify error logging for all applications metrics errors', async (t) => {
  const server = Fastify()
  server.get('/api/v1/query_range', async (request, reply) => {
    return reply.status(500).send({ status: 'error', error: 'Internal server error' })
  })

  const address = await server.listen({ port: 0 })
  t.after(async () => {
    await server.close()
  })

  const prometheusUrl = address
  const mockLogger = createCapturingMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger)

  await assert.rejects(
    async () => {
      await metrics.getAllApplicationsMetrics()
    },
    (err) => {
      assert.ok(err instanceof Error)
      return true
    }
  )

  const logs = mockLogger.getLogs()
  const errorLogs = logs.filter(log => log.level === 'error')
  assert.ok(errorLogs.length > 0)
  assert.ok(
    errorLogs.some(log => log.msg === 'Error querying Prometheus for all applications') ||
    errorLogs.some(log => log.msg === 'Error getting metrics for all applications')
  )
})

test('constructor uses default timeRange when not provided', async (t) => {
  const mockLogger = createMockLogger()
  const metrics = new Metrics('http://localhost:9090', mockLogger)

  assert.strictEqual(metrics.timeRange, 60)
})

test('constructor uses custom timeRange when provided', async (t) => {
  const mockLogger = createMockLogger()
  const metrics = new Metrics('http://localhost:9090', mockLogger, { timeRange: 120 })

  assert.strictEqual(metrics.timeRange, 120)
})

test('queryEventLoopUtilization with custom timeRange', async (t) => {
  const mockEventLoopResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: { applicationId: 'test-app', podId: 'pod-1' },
          values: [[1620000000, '0.6']]
        }
      ]
    }
  }

  const originalDateNow = Date.now
  Date.now = () => 1620000120 * 1000
  t.after(() => {
    Date.now = originalDateNow
  })

  let capturedQuery = null
  const server = Fastify()
  server.get('/api/v1/query_range', async (request, reply) => {
    capturedQuery = request.query
    return mockEventLoopResponse
  })

  const address = await server.listen({ port: 0 })
  t.after(async () => {
    await server.close()
  })

  const prometheusUrl = address
  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger)

  await metrics.queryEventLoopUtilization('test-app', 45)

  assert.strictEqual(capturedQuery.start, (1620000120 - 45).toString())
  assert.strictEqual(capturedQuery.end, '1620000120')
  assert.strictEqual(capturedQuery.query, 'nodejs_eventloop_utilization{applicationId="test-app"}')
})

test('test fallback branches for missing pod data in getApplicationMetrics', async (t) => {
  const mockHeapSizeResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: { applicationId: 'test-app', podId: 'pod-1' },
          values: [[1620000000, '100000000']]
        }
      ]
    }
  }

  const mockEventLoopResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: { applicationId: 'test-app', podId: 'pod-2' },
          values: [[1620000000, '0.6']]
        }
      ]
    }
  }

  const mockResponses = {
    heapSize: mockHeapSizeResponse,
    eventLoop: mockEventLoopResponse
  }
  const originalDateNow = Date.now
  Date.now = () => 1620000000 * 1000

  const mockServer = await setupMockPrometheusServer(mockResponses)
  t.after(async () => {
    await mockServer.close()
    Date.now = originalDateNow
  })
  const prometheusUrl = mockServer.address

  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger)

  const applicationMetrics = await metrics.getApplicationMetrics('test-app')

  assert.ok(applicationMetrics['pod-1'])
  assert.ok(applicationMetrics['pod-1'].heapSize.length > 0)
  assert.strictEqual(applicationMetrics['pod-1'].eventLoopUtilization.length, 0)

  assert.ok(applicationMetrics['pod-2'])
  assert.strictEqual(applicationMetrics['pod-2'].heapSize.length, 0)
  assert.ok(applicationMetrics['pod-2'].eventLoopUtilization.length > 0)
})

test('test fallback branches for missing app data in getAllApplicationsMetrics', async (t) => {
  const mockAllHeapSizeResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: { applicationId: 'app-1', podId: 'pod-1' },
          values: [[1620000000, '100000000']]
        }
      ]
    }
  }

  const mockAllEventLoopResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: { applicationId: 'app-2', podId: 'pod-2' },
          values: [[1620000000, '0.6']]
        }
      ]
    }
  }

  const mockResponses = {
    allHeapSize: mockAllHeapSizeResponse,
    allEventLoop: mockAllEventLoopResponse
  }

  const originalDateNow = Date.now
  Date.now = () => 1620000000 * 1000

  const mockServer = await setupMockPrometheusServer(mockResponses)
  t.after(async () => {
    await mockServer.close()
    Date.now = originalDateNow
  })

  const prometheusUrl = mockServer.address
  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger)

  const allAppsMetrics = await metrics.getAllApplicationsMetrics()

  assert.ok(allAppsMetrics['app-1'])
  assert.ok(allAppsMetrics['app-1']['pod-1'])
  assert.ok(allAppsMetrics['app-1']['pod-1'].heapSize.length > 0)
  assert.strictEqual(allAppsMetrics['app-1']['pod-1'].eventLoopUtilization.length, 0)

  assert.ok(allAppsMetrics['app-2'])
  assert.ok(allAppsMetrics['app-2']['pod-2'])
  assert.strictEqual(allAppsMetrics['app-2']['pod-2'].heapSize.length, 0)
  assert.ok(allAppsMetrics['app-2']['pod-2'].eventLoopUtilization.length > 0)
})

test('test null timeRange parameter in getAllApplicationsMetrics', async (t) => {
  const mockResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: []
    }
  }

  const originalDateNow = Date.now
  Date.now = () => 1620000120 * 1000
  t.after(() => {
    Date.now = originalDateNow
  })

  const capturedQueries = []
  const server = Fastify()
  server.get('/api/v1/query_range', async (request, reply) => {
    capturedQueries.push({ ...request.query })
    return mockResponse
  })

  const address = await server.listen({ port: 0 })
  t.after(async () => {
    await server.close()
  })

  const prometheusUrl = address
  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger, { timeRange: 90 })

  await metrics.getAllApplicationsMetrics(null)

  assert.strictEqual(capturedQueries.length, 2)
  assert.strictEqual(capturedQueries[0].start, (1620000120 - 90).toString())
  assert.strictEqual(capturedQueries[1].start, (1620000120 - 90).toString())
})

test('test undefined timeRange parameter in getAllApplicationsMetrics', async (t) => {
  const mockResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: []
    }
  }

  const originalDateNow = Date.now
  Date.now = () => 1620000120 * 1000
  t.after(() => {
    Date.now = originalDateNow
  })

  const capturedQueries = []
  const server = Fastify()
  server.get('/api/v1/query_range', async (request, reply) => {
    capturedQueries.push({ ...request.query })
    return mockResponse
  })

  const address = await server.listen({ port: 0 })
  t.after(async () => {
    await server.close()
  })

  const prometheusUrl = address
  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger, { timeRange: 75 })

  await metrics.getAllApplicationsMetrics(undefined)

  assert.strictEqual(capturedQueries.length, 2)
  assert.strictEqual(capturedQueries[0].start, (1620000120 - 75).toString())
  assert.strictEqual(capturedQueries[1].start, (1620000120 - 75).toString())
})

test('test no timeRange parameter in getAllApplicationsMetrics (use default)', async (t) => {
  const mockResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: []
    }
  }

  const originalDateNow = Date.now
  Date.now = () => 1620000120 * 1000
  t.after(() => {
    Date.now = originalDateNow
  })

  const capturedQueries = []
  const server = Fastify()
  server.get('/api/v1/query_range', async (request, reply) => {
    capturedQueries.push({ ...request.query })
    return mockResponse
  })

  const address = await server.listen({ port: 0 })
  t.after(async () => {
    await server.close()
  })

  const prometheusUrl = address
  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger, { timeRange: 50 })

  await metrics.getAllApplicationsMetrics()

  assert.strictEqual(capturedQueries.length, 2)
  assert.strictEqual(capturedQueries[0].start, (1620000120 - 50).toString())
  assert.strictEqual(capturedQueries[1].start, (1620000120 - 50).toString())
})

test('test zero timeRange parameter in getAllApplicationsMetrics', async (t) => {
  const mockResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: []
    }
  }

  const originalDateNow = Date.now
  Date.now = () => 1620000120 * 1000
  t.after(() => {
    Date.now = originalDateNow
  })

  const capturedQueries = []
  const server = Fastify()
  server.get('/api/v1/query_range', async (request, reply) => {
    capturedQueries.push({ ...request.query })
    return mockResponse
  })

  const address = await server.listen({ port: 0 })
  t.after(async () => {
    await server.close()
  })

  const prometheusUrl = address
  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger, { timeRange: 40 })

  await metrics.getAllApplicationsMetrics(0)

  assert.strictEqual(capturedQueries.length, 2)
  assert.strictEqual(capturedQueries[0].start, (1620000120 - 0).toString())
  assert.strictEqual(capturedQueries[1].start, (1620000120 - 0).toString())
})

test('test null timeRange in queryNodeJsHeapSize', async (t) => {
  const mockResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: []
    }
  }

  const originalDateNow = Date.now
  Date.now = () => 1620000120 * 1000
  t.after(() => {
    Date.now = originalDateNow
  })

  let capturedQuery = null
  const server = Fastify()
  server.get('/api/v1/query_range', async (request, reply) => {
    capturedQuery = request.query
    return mockResponse
  })

  const address = await server.listen({ port: 0 })
  t.after(async () => {
    await server.close()
  })

  const prometheusUrl = address
  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger, { timeRange: 35 })

  await metrics.queryNodeJsHeapSize('test-app', null)

  assert.strictEqual(capturedQuery.start, (1620000120 - 35).toString())
  assert.strictEqual(capturedQuery.end, '1620000120')
})

test('test undefined timeRange in queryEventLoopUtilization', async (t) => {
  const mockResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: []
    }
  }

  const originalDateNow = Date.now
  Date.now = () => 1620000120 * 1000
  t.after(() => {
    Date.now = originalDateNow
  })

  let capturedQuery = null
  const server = Fastify()
  server.get('/api/v1/query_range', async (request, reply) => {
    capturedQuery = request.query
    return mockResponse
  })

  const address = await server.listen({ port: 0 })
  t.after(async () => {
    await server.close()
  })

  const prometheusUrl = address
  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger, { timeRange: 25 })

  await metrics.queryEventLoopUtilization('test-app', undefined)

  assert.strictEqual(capturedQuery.start, (1620000120 - 25).toString())
  assert.strictEqual(capturedQuery.end, '1620000120')
})

test('test null timeRange in getApplicationMetrics', async (t) => {
  const mockResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: []
    }
  }

  const originalDateNow = Date.now
  Date.now = () => 1620000120 * 1000
  t.after(() => {
    Date.now = originalDateNow
  })

  const capturedQueries = []
  const server = Fastify()
  server.get('/api/v1/query_range', async (request, reply) => {
    capturedQueries.push({ ...request.query })
    return mockResponse
  })

  const address = await server.listen({ port: 0 })
  t.after(async () => {
    await server.close()
  })

  const prometheusUrl = address
  const mockLogger = createMockLogger()
  const metrics = new Metrics(prometheusUrl, mockLogger, { timeRange: 15 })

  await metrics.getApplicationMetrics('test-app', null)

  assert.strictEqual(capturedQueries.length, 2)
  assert.strictEqual(capturedQueries[0].start, (1620000120 - 15).toString())
  assert.strictEqual(capturedQueries[1].start, (1620000120 - 15).toString())
})
