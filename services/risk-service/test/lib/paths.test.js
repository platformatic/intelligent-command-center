'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { extractPaths } = require('../../lib/paths')
const { createTraceId, createSpanId, createSpanData } = require('../helper')

const SpanKind = {
  SPAN_KIND_SERVER: 2,
  SPAN_KIND_CLIENT: 3
}

test('no trace must return no path', async (t) => {
  const res = extractPaths(null, null)
  assert.deepStrictEqual(res, [])
})

test('no root span in trace must return no path ', async (t) => {
  const spanData = createSpanData(createTraceId(), createSpanId(), createSpanId(), SpanKind.SPAN_KIND_SERVER, 'A|http://GET/test')
  const res = extractPaths([spanData], SpanKind)
  assert.deepStrictEqual(res, [])
})

test('single span', async (t) => {
  const traceId = createTraceId()
  const spanId = createSpanId()
  const spanA = createSpanData(traceId, spanId, null, SpanKind.SPAN_KIND_SERVER, 'A|http://GET/test')
  const res = extractPaths([spanA], SpanKind)
  assert.deepStrictEqual(res, [['A|http://GET/test']])
})

test('A -> B', async (t) => {
  const traceId = createTraceId()

  // A
  const spanIdAServer = createSpanId()
  const spanIdAClient = createSpanId()
  const spanAS = createSpanData(traceId, spanIdAServer, null, SpanKind.SPAN_KIND_SERVER, 'A|http://GET/test')
  const spanAC = createSpanData(traceId, spanIdAClient, spanIdAServer, SpanKind.SPAN_KIND_CLIENT, 'AClient|http://GET/test')

  // B
  const spanIdBServer = createSpanId()
  const spanBS = createSpanData(traceId, spanIdBServer, spanIdAClient, SpanKind.SPAN_KIND_SERVER, 'B|http://GET/test')

  const res = extractPaths([spanAS, spanAC, spanBS], SpanKind)
  assert.deepStrictEqual(res, [['A|http://GET/test', 'B|http://GET/test']])
})

test('A -> (B, C)', async (t) => {
  const traceId = createTraceId()

  // A
  const spanIdAServer = createSpanId()
  const spanIdAClient1 = createSpanId()
  const spanIdAClient2 = createSpanId()
  const spanAS = createSpanData(traceId, spanIdAServer, null, SpanKind.SPAN_KIND_SERVER, 'A|GET/test')
  const spanAC1 = createSpanData(traceId, spanIdAClient1, spanIdAServer, SpanKind.SPAN_KIND_CLIENT, 'AClient1|GET/test')
  const spanAC2 = createSpanData(traceId, spanIdAClient2, spanIdAServer, SpanKind.SPAN_KIND_CLIENT, 'ACLient2|GET/test')

  // B
  const spanIdBServer = createSpanId()
  const spanBS = createSpanData(traceId, spanIdBServer, spanIdAClient1, SpanKind.SPAN_KIND_SERVER, 'B|GET/test')

  // C
  const spanIdCServer = createSpanId()
  const spanCS = createSpanData(traceId, spanIdCServer, spanIdAClient2, SpanKind.SPAN_KIND_SERVER, 'C|GET/test')

  const res = extractPaths([spanAS, spanAC1, spanAC2, spanCS, spanBS], SpanKind)
  assert.deepStrictEqual(res, [['A|GET/test', 'B|GET/test'], ['A|GET/test', 'C|GET/test']])
})

test('A -> (B, C -> D)', async (t) => {
  const traceId = createTraceId()

  // A
  const spanIdAServer = createSpanId()
  const spanIdAClient1 = createSpanId()
  const spanIdAClient2 = createSpanId()
  const spanAS = createSpanData(traceId, spanIdAServer, null, SpanKind.SPAN_KIND_SERVER, 'A|GET/test')
  const spanAC1 = createSpanData(traceId, spanIdAClient1, spanIdAServer, SpanKind.SPAN_KIND_CLIENT, 'AClient1|GET/test')
  const spanAC2 = createSpanData(traceId, spanIdAClient2, spanIdAServer, SpanKind.SPAN_KIND_CLIENT, 'AClient2|GET/test')

  // B
  const spanIdBServer = createSpanId()
  const spanBS = createSpanData(traceId, spanIdBServer, spanIdAClient1, SpanKind.SPAN_KIND_SERVER, 'B|GET/test')

  // C
  const spanIdCServer = createSpanId()
  const spanIdCClient = createSpanId()
  const spanCS = createSpanData(traceId, spanIdCServer, spanIdAClient2, SpanKind.SPAN_KIND_SERVER, 'C|GET/test')
  const spanCC = createSpanData(traceId, spanIdCClient, spanIdCServer, SpanKind.SPAN_KIND_CLIENT, 'CClient|GET/test')

  // D
  const spanIdDServer = createSpanId()
  const spanDS = createSpanData(traceId, spanIdDServer, spanIdCClient, SpanKind.SPAN_KIND_SERVER, 'D|GET/test')

  const trace = [spanAS, spanAC1, spanAC2, spanCS, spanCC, spanBS, spanDS]
  const res = extractPaths(trace, SpanKind)
  assert.deepStrictEqual(res, [['A|GET/test', 'B|GET/test'], ['A|GET/test', 'C|GET/test', 'D|GET/test']])
})

test('A -> (B, C -> D -> (E, F))', async (t) => {
  const traceId = createTraceId()

  // A
  const spanIdAServer = createSpanId()
  const spanIdAClient1 = createSpanId()
  const spanIdAClient2 = createSpanId()
  const spanAS = createSpanData(traceId, spanIdAServer, null, SpanKind.SPAN_KIND_SERVER, 'A|GET/test')
  const spanAC1 = createSpanData(traceId, spanIdAClient1, spanIdAServer, SpanKind.SPAN_KIND_CLIENT, 'AClient1|GET/test')
  const spanAC2 = createSpanData(traceId, spanIdAClient2, spanIdAServer, SpanKind.SPAN_KIND_CLIENT, 'AClient2|GET/test')

  // B
  const spanIdBServer = createSpanId()
  const spanBS = createSpanData(traceId, spanIdBServer, spanIdAClient1, SpanKind.SPAN_KIND_SERVER, 'B|GET/test')

  // C
  const spanIdCServer = createSpanId()
  const spanIdCClient = createSpanId()
  const spanCS = createSpanData(traceId, spanIdCServer, spanIdAClient2, SpanKind.SPAN_KIND_SERVER, 'C|GET/test')
  const spanCC = createSpanData(traceId, spanIdCClient, spanIdCServer, SpanKind.SPAN_KIND_CLIENT, 'CClient|GET/test')

  // D
  const spanIdDServer = createSpanId()
  const spanIdDClient1 = createSpanId()
  const spanIdDClient2 = createSpanId()
  const spanDS = createSpanData(traceId, spanIdDServer, spanIdCClient, SpanKind.SPAN_KIND_SERVER, 'D|GET/test')
  const spanDC1 = createSpanData(traceId, spanIdDClient1, spanIdDServer, SpanKind.SPAN_KIND_CLIENT, 'DClient1|GET/test')
  const spanDC2 = createSpanData(traceId, spanIdDClient2, spanIdDServer, SpanKind.SPAN_KIND_CLIENT, 'DClient2|GET/test')

  // E
  const spanIdEServer = createSpanId()
  const spanES = createSpanData(traceId, spanIdEServer, spanIdDClient1, SpanKind.SPAN_KIND_SERVER, 'E|GET/test')

  // F
  const spanIdFServer = createSpanId()
  const spanFS = createSpanData(traceId, spanIdFServer, spanIdDClient2, SpanKind.SPAN_KIND_SERVER, 'F|GET/test')

  const trace = [spanAS, spanAC1, spanAC2, spanCS, spanCC, spanBS, spanDS, spanDC1, spanDC2, spanES, spanFS]
  const res = extractPaths(trace, SpanKind)
  assert.deepStrictEqual(res, [
    ['A|GET/test', 'B|GET/test'],
    ['A|GET/test', 'C|GET/test', 'D|GET/test', 'E|GET/test'],
    ['A|GET/test', 'C|GET/test', 'D|GET/test', 'F|GET/test']
  ])
})

test('A -> B -> C -> (B, E) - trace with loop', async (t) => {
  const traceId = createTraceId()

  // A
  const spanIdAServer = createSpanId()
  const spanIdAClient = createSpanId()
  const spanAS = createSpanData(traceId, spanIdAServer, null, SpanKind.SPAN_KIND_SERVER, 'A|GET/test')
  const spanAC = createSpanData(traceId, spanIdAClient, spanIdAServer, SpanKind.SPAN_KIND_CLIENT, 'AClient|GET/test')

  // B
  const spanIdBServer = createSpanId()
  const spanIdBClient = createSpanId()
  const spanBS = createSpanData(traceId, spanIdBServer, spanIdAClient, SpanKind.SPAN_KIND_SERVER, 'B|GET/test')
  const spanBC = createSpanData(traceId, spanIdBClient, spanIdBServer, SpanKind.SPAN_KIND_CLIENT, 'BClient|GET/test')

  // C
  const spanIdCServer = createSpanId()
  const spanIdCClient1 = createSpanId()
  const spanIdCClient2 = createSpanId()
  const spanCS = createSpanData(traceId, spanIdCServer, spanIdBClient, SpanKind.SPAN_KIND_SERVER, 'C|GET/test')
  const spanCC1 = createSpanData(traceId, spanIdCClient1, spanIdCServer, SpanKind.SPAN_KIND_CLIENT, 'CClient1|GET/test')
  const spanCC2 = createSpanData(traceId, spanIdCClient2, spanIdCServer, SpanKind.SPAN_KIND_CLIENT, 'CClient2|GET/test')

  // B2 (B again!)
  const spanIdB2Server = createSpanId()
  const spanB2S = createSpanData(traceId, spanIdB2Server, spanIdCClient1, SpanKind.SPAN_KIND_SERVER, 'B|GET/test2')

  // E
  const spanIdEServer = createSpanId()
  const spanES = createSpanData(traceId, spanIdEServer, spanIdCClient2, SpanKind.SPAN_KIND_SERVER, 'E|GET/test')

  const trace = [spanAS, spanAC, spanBS, spanBC, spanCS, spanCC1, spanCC2, spanB2S, spanES]
  const res = extractPaths(trace, SpanKind)
  assert.deepStrictEqual(res, [['A|GET/test', 'B|GET/test', 'C|GET/test', 'B|GET/test2'], ['A|GET/test', 'B|GET/test', 'C|GET/test', 'E|GET/test']])
})

test('A -> B(graphql)', async (t) => {
  const traceId = createTraceId()

  // A
  const spanIdAServer = createSpanId()
  const spanIdAClient = createSpanId()
  const spanAS = createSpanData(traceId, spanIdAServer, null, SpanKind.SPAN_KIND_SERVER, 'A|http://GET/test')
  const spanAC = createSpanData(traceId, spanIdAClient, spanIdAServer, SpanKind.SPAN_KIND_CLIENT, 'AClient|http://GET/test')

  // B is a graphql endpoint, so it has a server HTTP span and an internal graphql span
  const spanIdBServer = createSpanId()
  const spanBS = createSpanData(traceId, spanIdBServer, spanIdAClient, SpanKind.SPAN_KIND_SERVER, 'B|graphql://QUERY/getMovies')

  const res = extractPaths([spanAS, spanAC, spanBS], SpanKind)
  assert.deepStrictEqual(res, [['A|http://GET/test', 'B|graphql://QUERY/getMovies']])
})

test('skip spans marked for skipping', async (t) => {
  const traceId = createTraceId()

  // A
  const spanIdAServer = createSpanId()
  const spanIdAClient = createSpanId()
  const spanAS = createSpanData(traceId, spanIdAServer, null, SpanKind.SPAN_KIND_SERVER, 'A|http://GET/test')
  const spanAC = createSpanData(traceId, spanIdAClient, spanIdAServer, SpanKind.SPAN_KIND_CLIENT, 'AClient|http://GET/test')

  // B
  const spanIdBServer = createSpanId()
  const spanIdBClient = createSpanId()
  const spanBS = createSpanData(traceId, spanIdBServer, spanIdAClient, SpanKind.SPAN_KIND_SERVER, 'B|http://GET/test')
  spanBS.skipInPath = true
  const spanBC = createSpanData(traceId, spanIdBClient, spanIdBServer, SpanKind.SPAN_KIND_CLIENT, 'BClient|http://GET/test')

  // C
  const spanIdCServer = createSpanId()
  const spanCS = createSpanData(traceId, spanIdCServer, spanIdBClient, SpanKind.SPAN_KIND_SERVER, 'C|http://GET/test')

  const res = extractPaths([spanAS, spanAC, spanBS, spanBC, spanCS], SpanKind)

  // B is skippe, so we won't have it on the path
  assert.deepStrictEqual(res, [['A|http://GET/test', 'C|http://GET/test']])
})

test('Complex text with multiple spans, a lot of them skipped', async () => {
  const trace = [
    { traceId: '1234', spanId: '4d66bf536d3b457c', parentSpanId: '317c32f768fef77f', kind: 3, operation: 'test-watt-next|http://GET/' },
    { traceId: '1234', spanId: 'acfe1577e6382ee4', parentSpanId: '2fb934e0389b7442', kind: 1, operation: 'test-watt-next|SKIP', skipInPath: true },
    { traceId: '1234', spanId: 'f62b901e7aa185ca', parentSpanId: '908d0f9269ac7f23', kind: 1, operation: 'test-watt-next|SKIP', skipInPath: true },
    { traceId: '1234', spanId: '7aaa79ec9e62333c', parentSpanId: '908d0f9269ac7f23', kind: 1, operation: 'test-watt-next|SKIP', skipInPath: true },
    { traceId: '1234', spanId: '908d0f9269ac7f23', parentSpanId: '317c32f768fef77f', kind: 1, operation: 'test-watt-next|SKIP', skipInPath: true },
    { traceId: '1234', spanId: '317c32f768fef77f', parentSpanId: '2fb934e0389b7442', kind: 1, operation: 'test-watt-next|SKIP', skipInPath: true },
    { traceId: '1234', spanId: '79607f7798ff1662', parentSpanId: '317c32f768fef77f', kind: 1, operation: 'test-watt-next|SKIP', skipInPath: true },
    { traceId: '1234', spanId: '4b0d1755e342f661', parentSpanId: '69bea8d736455e4c', kind: 1, operation: 'test-watt-next|SKIP', skipInPath: true },
    { traceId: '1234', spanId: '2fb934e0389b7442', parentSpanId: '69bea8d736455e4c', kind: 2, operation: 'test-watt-next|SKIP', skipInPath: true },
    { traceId: '1234', spanId: '88ace351ddf65070', parentSpanId: '4d66bf536d3b457c', kind: 3, operation: 'test-watt-next|http://GET/' },
    { traceId: '1234', spanId: '69bea8d736455e4c', parentSpanId: 'c1e100408903e023', kind: 2, operation: 'test-watt-next|http://GET/test-watt/next' },
    { traceId: '1234', spanId: '523b848a9b359c44', parentSpanId: '88ace351ddf65070', kind: 2, operation: 'test-watt-fastify|http://GET/' },
    { traceId: '1234', spanId: 'c1e100408903e023', parentSpanId: 'a92ad6fb5ad7158f', kind: 3, operation: 'test-watt-composer|http://GET/next' },
    { traceId: '1234', spanId: 'a92ad6fb5ad7158f', parentSpanId: null, kind: 2, operation: 'test-watt-composer|http://GET/next' }
  ]
  const res = extractPaths(trace, SpanKind)
  assert.deepStrictEqual(res, [
    [
      'test-watt-composer|http://GET/next',
      'test-watt-next|http://GET/test-watt/next',
      'test-watt-fastify|http://GET/'
    ]
  ])
  assert.ok(res)
})
