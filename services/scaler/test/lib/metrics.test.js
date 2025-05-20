'use strict'

const test = require('node:test')
const assert = require('node:assert')
const Fastify = require('fastify')
const Metrics = require('../../lib/metrics')

function createMockLogger () {
  return {
    info: () => {},
    error: () => {},
    debug: () => {},
    warn: () => {}
  }
}

async function setupMockPrometheusServer (responses = {}) {
  const server = Fastify()

  server.get('/api/v1/query_range', async (request, reply) => {
    const { query } = request.query
    let responseData = null

    if (query.includes('nodejs_heap_size_total_bytes') && query.includes('test-app')) {
      responseData = responses.heapSize
    } else if (query.includes('nodejs_eventloop_utilization') && query.includes('test-app')) {
      responseData = responses.eventLoop
    }

    if (responseData) {
      return responseData
    }

    return reply.status(404).send({ status: 'error', error: 'No data found for query' })
  })

  const address = await server.listen({ port: 0 })

  return {
    server,
    address,
    close: async () => {
      await server.close()
    }
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
