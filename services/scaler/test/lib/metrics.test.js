'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { setTimeout: wait } = require('node:timers/promises')
const { MockAgent, setGlobalDispatcher } = require('undici')
const Metrics = require('../../lib/metrics')

// Setup mock logger
function createMockLogger () {
  return {
    info: () => {},
    error: () => {},
    debug: () => {},
    warn: () => {}
  }
}

function setupMockAgent (host, responses = []) {
  const mockAgent = new MockAgent()
  mockAgent.disableNetConnect()

  const mockPool = mockAgent.get(host)

  // Add response mocks
  responses.forEach(({ path, statusCode, data }) => {
    mockPool.intercept({
      path,
      method: 'GET'
    }).reply(statusCode, data)
  })

  setGlobalDispatcher(mockAgent)
  return mockAgent
}

test('start and stop polling', async (t) => {
  const mockLogger = createMockLogger()
  const logEvents = []

  mockLogger.info = (obj, msg) => {
    msg = msg || obj
    logEvents.push({ type: 'info', msg, obj })
  }

  const metrics = new Metrics('http://prometheus:9090', '1000', '300', mockLogger)

  await metrics.start()
  assert.strictEqual(metrics.isPolling, true)
  assert.ok(logEvents.some(event => event.msg === 'Starting metrics polling'))

  metrics.stop()
  assert.strictEqual(metrics.isPolling, false)
  assert.ok(logEvents.some(event => event.msg === 'Stopped metrics polling'))
})

test('_collectMetrics - successful query and call processMetrics', async (t) => {
  const mockPromResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: { service: 'test-service' },
          values: [[1620000000, '0.1'], [1620000060, '0.2']]
        }
      ]
    }
  }

  const host = 'http://prometheus:9090'
  const mockAgent = setupMockAgent(new URL(host).origin, [
    {
      path: '/api/v1/query_range?query=sum(rate(process_cpu_seconds_total%5B5m%5D))%20by%20(service)&start=1619999700&end=1620000000&step=60',
      statusCode: 200,
      data: mockPromResponse
    },
    {
      path: '/api/v1/query_range?query=sum(process_resident_memory_bytes)%20by%20(service)&start=1619999700&end=1620000000&step=60',
      statusCode: 200,
      data: mockPromResponse
    },
    {
      path: '/api/v1/query_range?query=sum(rate(http_request_duration_seconds_count%5B5m%5D))%20by%20(service)&start=1619999700&end=1620000000&step=60',
      statusCode: 200,
      data: mockPromResponse
    }
  ])

  const originalDateNow = Date.now
  Date.now = () => 1620000000 * 1000 // Match the timestamp in the mockPromResponse

  const mockLogger = createMockLogger()

  const metrics = new Metrics(host, '60000', '300', mockLogger)

  let processedMetrics
  metrics.processMetrics = (metrics) => {
    processedMetrics = metrics
  }

  await metrics._collectMetrics()

  Date.now = originalDateNow
  await mockAgent.close()

  assert.strictEqual(Object.keys(processedMetrics).length, 3)
  assert.ok(processedMetrics.cpu_usage)
  assert.ok(processedMetrics.memory_usage)
  assert.ok(processedMetrics.http_requests)
})

test('_collectMetrics - failed query', async (t) => {
  const host = 'http://prometheus:9090'
  const mockAgent = setupMockAgent(new URL(host).origin, [
    {
      path: '/api/v1/query_range?query=sum(rate(process_cpu_seconds_total%5B5m%5D))%20by%20(service)&start=1619999700&end=1620000000&step=60',
      statusCode: 200,
      data: {
        status: 'success',
        data: {
          resultType: 'matrix',
          result: [{ metric: { service: 'test-service' }, values: [[1620000000, '0.1']] }]
        }
      }
    },
    {
      path: '/api/v1/query_range?query=sum(process_resident_memory_bytes)%20by%20(service)&start=1619999700&end=1620000000&step=60',
      statusCode: 500,
      data: 'Internal Server Error'
    },
    {
      path: '/api/v1/query_range?query=sum(rate(http_request_duration_seconds_count%5B5m%5D))%20by%20(service)&start=1619999700&end=1620000000&step=60',
      statusCode: 200,
      data: { status: 'error', errorType: 'bad_data', error: 'invalid query' }
    }
  ])

  const originalDateNow = Date.now
  Date.now = () => 1620000000 * 1000

  const mockLogger = createMockLogger()
  const loggedErrors = []
  const loggedWarnings = []

  mockLogger.error = (obj) => {
    loggedErrors.push(obj)
  }
  mockLogger.warn = (obj) => {
    loggedWarnings.push(obj)
  }

  const metrics = new Metrics(host, '60000', '300', mockLogger)
  const results = await metrics._collectMetrics()

  Date.now = originalDateNow
  await mockAgent.close()

  assert.strictEqual(Object.keys(results).length, 1)
  assert.ok(results.cpu_usage)
  assert.ok(!results.memory_usage)
  assert.ok(!results.http_requests)

  assert.strictEqual(loggedErrors.length, 2)
  assert.strictEqual(loggedWarnings.length, 1)
})

test('_poll - handles errors gracefully', async (t) => {
  const mockLogger = createMockLogger()
  const loggedEvents = []

  mockLogger.info = (obj, msg) => {
    msg = msg || obj
    loggedEvents.push({ type: 'info', msg, obj })
  }

  mockLogger.error = (obj, msg) => {
    msg = msg || obj
    loggedEvents.push({ type: 'error', msg, obj })
  }

  const metrics = new Metrics('http://prometheus:9090', '100', '300', mockLogger)
  metrics._collectMetrics = async () => {
    throw new Error('Test error in _collectMetrics')
  }

  await metrics.start()
  await wait(100)
  metrics.stop()

  const errorEvent = loggedEvents.find(event =>
    event.type === 'error' && event.msg === 'Error during metrics polling'
  )
  assert.ok(errorEvent, 'Error should be logged')
  assert.strictEqual(errorEvent.obj.err.message, 'Test error in _collectMetrics')

  const abortEvent = loggedEvents.find(event =>
    event.type === 'info' && event.msg === 'Stopped metrics polling'
  )
  assert.ok(abortEvent, 'Stop message should be logged')
})
