'use strict'

const test = require('node:test')
const assert = require('node:assert')
const {
  bootstrap,
  createResourceSpan,
  createHTTPSpan,
  createTraceId,
  createSpanId
} = require('../helper')

test('should get the cache path of server which calls another server', async (t) => {
  // X => A => B
  const riskService = await bootstrap(t)
  await riskService.redis.flushall()

  const { processResourceSpans } = riskService
  const { messages } = riskService
  const { SpanKind } = messages
  const traceId = createTraceId()
  const spanAServerSpanId = createSpanId()
  const spanAClientSpanId = createSpanId()
  const spanBServerSpanId = createSpanId()

  const cacheEntryId = 'test-cache-entry-id'

  const spanAServer = createHTTPSpan(traceId, spanAServerSpanId, null, 'serverA', SpanKind.SPAN_KIND_SERVER, 'GET', '/opA', null)
  const spanAClient = createHTTPSpan(traceId, spanAClientSpanId, spanAServerSpanId, 'clientA', SpanKind.SPAN_KIND_CLIENT, 'GET', '/opB', null)
  spanAClient.attributes.push(
    { key: 'http.cache.id', value: { stringValue: cacheEntryId } },
    { key: 'http.cache.hit', value: { stringValue: 'false' } }
  )
  const spanBServer = createHTTPSpan(traceId, spanBServerSpanId, spanAClientSpanId, 'serverB', SpanKind.SPAN_KIND_SERVER, 'GET', '/opB', null)

  const resourceSpanA = createResourceSpan('A', [spanAServer, spanAClient])
  const resourceSpanB = createResourceSpan('B', [spanBServer])

  await processResourceSpans([resourceSpanA])
  await processResourceSpans([resourceSpanB])

  const { statusCode, body } = await riskService.inject({
    method: 'GET',
    url: `/http-cache/${cacheEntryId}/traces`
  })
  assert.strictEqual(statusCode, 200)
  assert.deepStrictEqual(JSON.parse(body), {
    services: ['A', 'B'],
    requests: [
      {
        sourceTelemetryId: 'X',
        targetTelemetryId: 'A',
        method: 'GET',
        path: '/opA',
        httpCacheId: null
      },
      {
        sourceTelemetryId: 'A',
        targetTelemetryId: 'B',
        method: 'GET',
        path: '/opB',
        httpCacheId: cacheEntryId
      }
    ]
  })
})

test('should get the cache path of server which calls another server (cached request)', async (t) => {
  // X => A => (cached request to B)
  const riskService = await bootstrap(t)
  const { processResourceSpans } = riskService
  const { messages } = riskService
  const { SpanKind } = messages
  const traceId = createTraceId()
  const spanAServerSpanId = createSpanId()
  const spanAClientSpanId = createSpanId()

  const cacheEntryId = 'test-cache-entry-id'

  const spanAServer = createHTTPSpan(traceId, spanAServerSpanId, null, 'serverA', SpanKind.SPAN_KIND_SERVER, 'GET', '/opA', null)
  const spanAClient = createHTTPSpan(traceId, spanAClientSpanId, spanAServerSpanId, 'clientA', SpanKind.SPAN_KIND_CLIENT, 'GET', '/opB', null)
  spanAClient.attributes.push(
    { key: 'http.cache.id', value: { stringValue: cacheEntryId } },
    { key: 'http.cache.hit', value: { stringValue: 'true' } }
  )

  const resourceSpanA = createResourceSpan('A', [spanAServer, spanAClient])

  await processResourceSpans([resourceSpanA])

  const { statusCode, body } = await riskService.inject({
    method: 'GET',
    url: `/http-cache/${cacheEntryId}/traces`
  })
  assert.strictEqual(statusCode, 200)
  assert.deepStrictEqual(JSON.parse(body), {
    services: ['A'],
    requests: [
      {
        sourceTelemetryId: 'X',
        targetTelemetryId: 'A',
        method: 'GET',
        path: '/opA',
        httpCacheId: null
      }
    ]
  })
})

test('should get the same cache entry from two different traces', async (t) => {
  const riskService = await bootstrap(t)
  await riskService.redis.flushall()

  const { processResourceSpans } = riskService
  const { messages } = riskService
  const { SpanKind } = messages

  const cacheEntryId = 'test-cache-entry-id'

  {
    // X => A => B
    const traceId = createTraceId()
    const spanAServerSpanId = createSpanId()
    const spanAClientSpanId = createSpanId()
    const spanBServerSpanId = createSpanId()

    const spanAServer = createHTTPSpan(traceId, spanAServerSpanId, null, 'serverA', SpanKind.SPAN_KIND_SERVER, 'GET', '/opA', null)
    const spanAClient = createHTTPSpan(traceId, spanAClientSpanId, spanAServerSpanId, 'clientA', SpanKind.SPAN_KIND_CLIENT, 'GET', '/opB', null)
    spanAClient.attributes.push(
      { key: 'http.cache.id', value: { stringValue: cacheEntryId } },
      { key: 'http.cache.hit', value: { stringValue: 'false' } }
    )
    const spanBServer = createHTTPSpan(traceId, spanBServerSpanId, spanAClientSpanId, 'serverB', SpanKind.SPAN_KIND_SERVER, 'GET', '/opB', null)

    const resourceSpanA = createResourceSpan('A', [spanAServer, spanAClient])
    const resourceSpanB = createResourceSpan('B', [spanBServer])

    await processResourceSpans([resourceSpanA])
    await processResourceSpans([resourceSpanB])
  }

  {
    // X => C => B
    const traceId = createTraceId()
    const spanCServerSpanId = createSpanId()
    const spanCClientSpanId = createSpanId()
    const spanBServerSpanId = createSpanId()

    const cacheEntryId = 'test-cache-entry-id'
    const spanCServer = createHTTPSpan(traceId, spanCServerSpanId, null, 'serverC', SpanKind.SPAN_KIND_SERVER, 'GET', '/opC', null)
    const spanCClient = createHTTPSpan(traceId, spanCClientSpanId, spanCServerSpanId, 'clientC', SpanKind.SPAN_KIND_CLIENT, 'GET', '/opB', null)
    spanCClient.attributes.push(
      { key: 'http.cache.id', value: { stringValue: cacheEntryId } },
      { key: 'http.cache.hit', value: { stringValue: 'false' } }
    )
    const spanBServer = createHTTPSpan(traceId, spanBServerSpanId, spanCClientSpanId, 'serverB', SpanKind.SPAN_KIND_SERVER, 'GET', '/opB', null)

    const resourceSpanC = createResourceSpan('C', [spanCServer, spanCClient])
    const resourceSpanB = createResourceSpan('B', [spanBServer])

    await processResourceSpans([resourceSpanC])
    await processResourceSpans([resourceSpanB])
  }

  const { statusCode, body } = await riskService.inject({
    method: 'GET',
    url: `/http-cache/${cacheEntryId}/traces`
  })

  assert.strictEqual(statusCode, 200)
  const { services, requests } = JSON.parse(body)
  assert.deepStrictEqual(services.sort(), ['A', 'B', 'C'].sort())
  assert.deepStrictEqual(requests.sort(sortRequests), [
    {
      sourceTelemetryId: 'X',
      targetTelemetryId: 'A',
      method: 'GET',
      path: '/opA',
      httpCacheId: null
    },
    {
      sourceTelemetryId: 'A',
      targetTelemetryId: 'B',
      method: 'GET',
      path: '/opB',
      httpCacheId: cacheEntryId
    },
    {
      sourceTelemetryId: 'X',
      targetTelemetryId: 'C',
      method: 'GET',
      path: '/opC',
      httpCacheId: null
    },
    {
      sourceTelemetryId: 'C',
      targetTelemetryId: 'B',
      method: 'GET',
      path: '/opB',
      httpCacheId: cacheEntryId
    }
  ].sort(sortRequests))
})

test('should get the cache path of server which calls another server', async (t) => {
  // X => A => B => C
  const riskService = await bootstrap(t)
  await riskService.redis.flushall()

  const { processResourceSpans } = riskService
  const { messages } = riskService
  const { SpanKind } = messages
  const traceId = createTraceId()
  const spanAServerSpanId = createSpanId()
  const spanAClientSpanId = createSpanId()
  const spanBServerSpanId = createSpanId()
  const spanBClientSpanId = createSpanId()
  const spanCServerSpanId = createSpanId()

  const cacheEntryIdB = 'test-cache-entry-id-b'
  const cacheEntryIdC = 'test-cache-entry-id-c'

  const spanAServer = createHTTPSpan(traceId, spanAServerSpanId, null, 'serverA', SpanKind.SPAN_KIND_SERVER, 'GET', '/opA', null)
  const spanAClient = createHTTPSpan(traceId, spanAClientSpanId, spanAServerSpanId, 'clientA', SpanKind.SPAN_KIND_CLIENT, 'GET', '/opB', null)
  spanAClient.attributes.push(
    { key: 'http.cache.id', value: { stringValue: cacheEntryIdB } },
    { key: 'http.cache.hit', value: { stringValue: 'false' } }
  )

  const spanBServer = createHTTPSpan(traceId, spanBServerSpanId, spanAClientSpanId, 'serverB', SpanKind.SPAN_KIND_SERVER, 'GET', '/opB', null)
  const spanBClient = createHTTPSpan(traceId, spanBClientSpanId, spanBServerSpanId, 'clientB', SpanKind.SPAN_KIND_CLIENT, 'GET', '/opC', null)
  spanBClient.attributes.push(
    { key: 'http.cache.id', value: { stringValue: cacheEntryIdC } },
    { key: 'http.cache.hit', value: { stringValue: 'false' } }
  )

  const spanCServer = createHTTPSpan(traceId, spanCServerSpanId, spanBClientSpanId, 'serverC', SpanKind.SPAN_KIND_SERVER, 'GET', '/opC', null)

  const resourceSpanA = createResourceSpan('A', [spanAServer, spanAClient])
  const resourceSpanB = createResourceSpan('B', [spanBServer, spanBClient])
  const resourceSpanC = createResourceSpan('C', [spanCServer])

  await processResourceSpans([resourceSpanC])
  await processResourceSpans([resourceSpanA])
  await processResourceSpans([resourceSpanB])

  const { statusCode, body } = await riskService.inject({
    method: 'GET',
    url: `/http-cache/${cacheEntryIdB}/traces`
  })
  assert.strictEqual(statusCode, 200, body)
  assert.deepStrictEqual(JSON.parse(body), {
    services: ['A', 'B', 'C'],
    requests: [
      {
        sourceTelemetryId: 'X',
        targetTelemetryId: 'A',
        method: 'GET',
        path: '/opA',
        httpCacheId: null
      },
      {
        sourceTelemetryId: 'A',
        targetTelemetryId: 'B',
        method: 'GET',
        path: '/opB',
        httpCacheId: cacheEntryIdB
      },
      {
        sourceTelemetryId: 'B',
        targetTelemetryId: 'C',
        method: 'GET',
        path: '/opC',
        httpCacheId: cacheEntryIdC
      }
    ]
  })
})

function sortRequests (r1, r2) {
  const serializedReq1 = JSON.stringify(r1)
  const serializedReq2 = JSON.stringify(r2)
  return serializedReq1.localeCompare(serializedReq2)
}
