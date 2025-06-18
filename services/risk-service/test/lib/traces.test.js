'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { checkTrace } = require('../../lib/traces')
const { createTraceId, createSpanId, createSpanData } = require('../helper')

const SpanKind = {
  SPAN_KIND_SERVER: 2,
  SPAN_KIND_CLIENT: 3
}

test('no trace must return false', async (t) => {
  const { isDone, calls, rootSpanId } = checkTrace(null, null)
  assert.ok(!isDone)
  assert.strictEqual(calls, undefined)
  assert.strictEqual(rootSpanId, undefined)
})

test('no root span in trace must false', async (t) => {
  const span = createSpanData(createTraceId(), createSpanId(), createSpanId(), SpanKind.SPAN_KIND_SERVER, 'GET/test;A')
  const trace = [span]
  const { isDone, calls, rootSpanId } = checkTrace(trace, SpanKind)
  assert.ok(!isDone)
  assert.deepEqual(calls, {})
  assert.strictEqual(rootSpanId, null)
})

test('server span with no client span', async (t) => {
  const traceId = createTraceId()

  // A
  const spanIdAServer = createSpanId()
  const spanAS = createSpanData(traceId, spanIdAServer, null, SpanKind.SPAN_KIND_SERVER, 'GET/test;A')

  // B
  const spanIdBServer = createSpanId()
  const clientSpan = createSpanId()
  const spanBS = createSpanData(traceId, spanIdBServer, clientSpan, SpanKind.SPAN_KIND_SERVER, 'GET/test;B')

  const trace = [spanAS, spanBS]
  const { isDone, calls, rootSpanId } = checkTrace(trace, SpanKind)
  assert.ok(!isDone)
  assert.deepEqual(calls, {
    [clientSpan]: spanIdBServer
  })
  assert.strictEqual(rootSpanId, spanIdAServer)
})

test('client span with no server span', async (t) => {
  // Here A -> C but C is calling a non existing server span
  const traceId = createTraceId()

  // A
  const spanIdAServer = createSpanId()
  const spanAS = createSpanData(traceId, spanIdAServer, null, SpanKind.SPAN_KIND_SERVER, 'GET/test;A')

  const spanIdAClient = createSpanId()
  const spanAC = createSpanData(traceId, spanIdAClient, spanIdAServer, SpanKind.SPAN_KIND_CLIENT, 'GET/test;AClient')

  const trace = [spanAS, spanAC]

  const { isDone, calls, rootSpanId } = checkTrace(trace, SpanKind)
  assert.ok(!isDone)
  assert.deepStrictEqual(calls, {})
  assert.strictEqual(rootSpanId, spanIdAServer)
})

test('A -> B, complete trace', async (t) => {
  const traceId = createTraceId()

  // A
  const spanIdAServer = createSpanId()
  const spanIdAClient = createSpanId()
  const spanAS = createSpanData(traceId, spanIdAServer, null, SpanKind.SPAN_KIND_SERVER, 'GET/test;A')
  const spanAC = createSpanData(traceId, spanIdAClient, spanIdAServer, SpanKind.SPAN_KIND_CLIENT, 'GET/test;AClient')

  // B
  const spanIdBServer = createSpanId()
  const spanBS = createSpanData(traceId, spanIdBServer, spanIdAClient, SpanKind.SPAN_KIND_SERVER, 'GET/test;B')

  const trace = [spanAS, spanAC, spanBS]
  const { isDone } = checkTrace(trace, SpanKind)
  assert.ok(isDone)
})

test('A -> (B, C -> D -> (E, F)), complete trace', async (t) => {
  const traceId = createTraceId()

  // A
  const spanIdAServer = createSpanId()
  const spanIdAClient1 = createSpanId()
  const spanIdAClient2 = createSpanId()
  const spanAS = createSpanData(traceId, spanIdAServer, null, SpanKind.SPAN_KIND_SERVER, 'GET/test;A')
  const spanAC1 = createSpanData(traceId, spanIdAClient1, spanIdAServer, SpanKind.SPAN_KIND_CLIENT, 'GET/test;AClient1')
  const spanAC2 = createSpanData(traceId, spanIdAClient2, spanIdAServer, SpanKind.SPAN_KIND_CLIENT, 'GET/test;AClient2')

  // B
  const spanIdBServer = createSpanId()
  const spanBS = createSpanData(traceId, spanIdBServer, spanIdAClient1, SpanKind.SPAN_KIND_SERVER, 'GET/test;B')

  // C
  const spanIdCServer = createSpanId()
  const spanIdCClient = createSpanId()
  const spanCS = createSpanData(traceId, spanIdCServer, spanIdAClient2, SpanKind.SPAN_KIND_SERVER, 'GET/test;C')
  const spanCC = createSpanData(traceId, spanIdCClient, spanIdCServer, SpanKind.SPAN_KIND_CLIENT, 'GET/test;CClient')

  // D
  const spanIdDServer = createSpanId()
  const spanIdDClient1 = createSpanId()
  const spanIdDClient2 = createSpanId()
  const spanDS = createSpanData(traceId, spanIdDServer, spanIdCClient, SpanKind.SPAN_KIND_SERVER, 'GET/test;D')
  const spanDC1 = createSpanData(traceId, spanIdDClient1, spanIdDServer, SpanKind.SPAN_KIND_CLIENT, 'GET/test;DClient1')
  const spanDC2 = createSpanData(traceId, spanIdDClient2, spanIdDServer, SpanKind.SPAN_KIND_CLIENT, 'GET/test;DClient2')

  // E
  const spanIdEServer = createSpanId()
  const spanES = createSpanData(traceId, spanIdEServer, spanIdDClient1, SpanKind.SPAN_KIND_SERVER, 'GET/test;E')

  // F
  const spanIdFServer = createSpanId()
  const spanFS = createSpanData(traceId, spanIdFServer, spanIdDClient2, SpanKind.SPAN_KIND_SERVER, 'GET/test;F')

  const trace = [spanAS, spanAC1, spanAC2, spanCS, spanCC, spanBS, spanDS, spanDC1, spanDC2, spanES, spanFS]

  const { isDone, calls, rootSpanId } = checkTrace(trace, SpanKind)
  assert.ok(isDone)
  const expectedCalls = {
    [spanIdAClient1]: spanIdBServer,
    [spanIdAClient2]: spanIdCServer,
    [spanIdCClient]: spanIdDServer,
    [spanIdDClient1]: spanIdEServer,
    [spanIdDClient2]: spanIdFServer
  }
  assert.deepStrictEqual(calls, expectedCalls)
  assert.strictEqual(rootSpanId, spanIdAServer)
})

test('A -> (B, C -> D -> (E, F)), missing F span', async (t) => {
  const traceId = createTraceId()

  // A
  const spanIdAServer = createSpanId()
  const spanIdAClient1 = createSpanId()
  const spanIdAClient2 = createSpanId()
  const spanAS = createSpanData(traceId, spanIdAServer, null, SpanKind.SPAN_KIND_SERVER, 'GET/test;A')
  const spanAC1 = createSpanData(traceId, spanIdAClient1, spanIdAServer, SpanKind.SPAN_KIND_CLIENT, 'GET/test;AClient1')
  const spanAC2 = createSpanData(traceId, spanIdAClient2, spanIdAServer, SpanKind.SPAN_KIND_CLIENT, 'GET/test;AClient2')

  // B
  const spanIdBServer = createSpanId()
  const spanBS = createSpanData(traceId, spanIdBServer, spanIdAClient1, SpanKind.SPAN_KIND_SERVER, 'GET/test;B')

  // C
  const spanIdCServer = createSpanId()
  const spanIdCClient = createSpanId()
  const spanCS = createSpanData(traceId, spanIdCServer, spanIdAClient2, SpanKind.SPAN_KIND_SERVER, 'GET/test;C')
  const spanCC = createSpanData(traceId, spanIdCClient, spanIdCServer, SpanKind.SPAN_KIND_CLIENT, 'GET/test;CClient')

  // D
  const spanIdDServer = createSpanId()
  const spanIdDClient1 = createSpanId()
  const spanIdDClient2 = createSpanId()
  const spanDS = createSpanData(traceId, spanIdDServer, spanIdCClient, SpanKind.SPAN_KIND_SERVER, 'GET/test;D')
  const spanDC1 = createSpanData(traceId, spanIdDClient1, spanIdDServer, SpanKind.SPAN_KIND_CLIENT, 'GET/test;DClient1')
  const spanDC2 = createSpanData(traceId, spanIdDClient2, spanIdDServer, SpanKind.SPAN_KIND_CLIENT, 'GET/test;DClient2')

  // E
  const spanIdEServer = createSpanId()
  const spanES = createSpanData(traceId, spanIdEServer, spanIdDClient1, SpanKind.SPAN_KIND_SERVER, 'GET/test;E')

  const trace = [spanAS, spanAC1, spanAC2, spanCS, spanCC, spanBS, spanDS, spanDC1, spanDC2, spanES]

  const { isDone, calls, rootSpanId } = checkTrace(trace, SpanKind)
  assert.ok(!isDone)
  const expectedCalls = {
    [spanIdAClient1]: spanIdBServer,
    [spanIdAClient2]: spanIdCServer,
    [spanIdCClient]: spanIdDServer,
    [spanIdDClient1]: spanIdEServer
  }
  assert.deepStrictEqual(calls, expectedCalls)
  assert.strictEqual(rootSpanId, spanIdAServer)
})

test('A -> (B, C -> D -> (E, F)), missing one D client span', async (t) => {
  const traceId = createTraceId()

  // A
  const spanIdAServer = createSpanId()
  const spanIdAClient1 = createSpanId()
  const spanIdAClient2 = createSpanId()
  const spanAS = createSpanData(traceId, spanIdAServer, null, SpanKind.SPAN_KIND_SERVER, 'GET/test;A')
  const spanAC1 = createSpanData(traceId, spanIdAClient1, spanIdAServer, SpanKind.SPAN_KIND_CLIENT, 'GET/test;AClient1')
  const spanAC2 = createSpanData(traceId, spanIdAClient2, spanIdAServer, SpanKind.SPAN_KIND_CLIENT, 'GET/test;AClient2')

  // B
  const spanIdBServer = createSpanId()
  const spanBS = createSpanData(traceId, spanIdBServer, spanIdAClient1, SpanKind.SPAN_KIND_SERVER, 'GET/test;B')

  // C
  const spanIdCServer = createSpanId()
  const spanIdCClient = createSpanId()
  const spanCS = createSpanData(traceId, spanIdCServer, spanIdAClient2, SpanKind.SPAN_KIND_SERVER, 'GET/test;C')
  const spanCC = createSpanData(traceId, spanIdCClient, spanIdCServer, SpanKind.SPAN_KIND_CLIENT, 'GET/test;CClient')

  // D
  const spanIdDServer = createSpanId()
  const spanIdDClient1 = createSpanId()
  const spanIdDClient2 = createSpanId()
  const spanDS = createSpanData(traceId, spanIdDServer, spanIdCClient, SpanKind.SPAN_KIND_SERVER, 'GET/test;D')
  const spanDC1 = createSpanData(traceId, spanIdDClient1, spanIdDServer, SpanKind.SPAN_KIND_CLIENT, 'GET/test;DClient1')

  // E
  const spanIdEServer = createSpanId()
  const spanES = createSpanData(traceId, spanIdEServer, spanIdDClient1, SpanKind.SPAN_KIND_SERVER, 'GET/test;E')

  // F
  const spanIdFServer = createSpanId()
  const spanFS = createSpanData(traceId, spanIdFServer, spanIdDClient2, SpanKind.SPAN_KIND_SERVER, 'GET/test;F')

  const trace = [spanAS, spanAC1, spanAC2, spanCS, spanCC, spanBS, spanDS, spanDC1, spanES, spanFS]

  const { isDone, calls, rootSpanId } = checkTrace(trace, SpanKind)
  assert.ok(!isDone)
  const expectedCalls = {
    [spanIdAClient1]: spanIdBServer,
    [spanIdAClient2]: spanIdCServer,
    [spanIdCClient]: spanIdDServer,
    [spanIdDClient1]: spanIdEServer,
    [spanIdDClient2]: spanIdFServer
  }
  assert.deepStrictEqual(calls, expectedCalls)
  assert.strictEqual(rootSpanId, spanIdAServer)
})

test('A -> B -> C -> (B, E) - complete trace with loop', async (t) => {
  const traceId = createTraceId()

  // A
  const spanIdAServer = createSpanId()
  const spanIdAClient = createSpanId()
  const spanAS = createSpanData(traceId, spanIdAServer, null, SpanKind.SPAN_KIND_SERVER, 'GET/test;A')
  const spanAC = createSpanData(traceId, spanIdAClient, spanIdAServer, SpanKind.SPAN_KIND_CLIENT, 'GET/test;AClient')

  // B
  const spanIdBServer = createSpanId()
  const spanIdBClient = createSpanId()
  const spanBS = createSpanData(traceId, spanIdBServer, spanIdAClient, SpanKind.SPAN_KIND_SERVER, 'GET/test;B')
  const spanBC = createSpanData(traceId, spanIdBClient, spanIdBServer, SpanKind.SPAN_KIND_CLIENT, 'GET/test;BClient')

  // C
  const spanIdCServer = createSpanId()
  const spanIdCClient1 = createSpanId()
  const spanIdCClient2 = createSpanId()
  const spanCS = createSpanData(traceId, spanIdCServer, spanIdBClient, SpanKind.SPAN_KIND_SERVER, 'GET/test;C')
  const spanCC1 = createSpanData(traceId, spanIdCClient1, spanIdCServer, SpanKind.SPAN_KIND_CLIENT, 'GET/test;CClient1')
  const spanCC2 = createSpanData(traceId, spanIdCClient2, spanIdCServer, SpanKind.SPAN_KIND_CLIENT, 'GET/test;CClient2')

  // B2 (B again!)
  const spanIdB2Server = createSpanId()
  const spanB2S = createSpanData(traceId, spanIdB2Server, spanIdCClient1, SpanKind.SPAN_KIND_SERVER, 'GET/test2;B')

  // E
  const spanIdEServer = createSpanId()
  const spanES = createSpanData(traceId, spanIdEServer, spanIdCClient2, SpanKind.SPAN_KIND_SERVER, 'GET/test;E')

  const trace = [spanAS, spanAC, spanBS, spanBC, spanCS, spanCC1, spanCC2, spanB2S, spanES]

  const { isDone, calls, rootSpanId } = checkTrace(trace, SpanKind)
  assert.ok(isDone)
  const expectedCalls = {
    [spanIdAClient]: spanIdBServer,
    [spanIdBClient]: spanIdCServer,
    [spanIdCClient1]: spanIdB2Server,
    [spanIdCClient2]: spanIdEServer
  }
  assert.deepStrictEqual(calls, expectedCalls)
  assert.strictEqual(rootSpanId, spanIdAServer)
})

test('A -> B -> C -> (B, E) - complete trace with loop, missing second B span', async (t) => {
  const traceId = createTraceId()

  // A
  const spanIdAServer = createSpanId()
  const spanIdAClient = createSpanId()
  const spanAS = createSpanData(traceId, spanIdAServer, null, SpanKind.SPAN_KIND_SERVER, 'GET/test;A')
  const spanAC = createSpanData(traceId, spanIdAClient, spanIdAServer, SpanKind.SPAN_KIND_CLIENT, 'GET/test;AClient')

  // B
  const spanIdBServer = createSpanId()
  const spanIdBClient = createSpanId()
  const spanBS = createSpanData(traceId, spanIdBServer, spanIdAClient, SpanKind.SPAN_KIND_SERVER, 'GET/test;B')
  const spanBC = createSpanData(traceId, spanIdBClient, spanIdBServer, SpanKind.SPAN_KIND_CLIENT, 'GET/test;BClient')

  // C
  const spanIdCServer = createSpanId()
  const spanIdCClient1 = createSpanId()
  const spanIdCClient2 = createSpanId()
  const spanCS = createSpanData(traceId, spanIdCServer, spanIdBClient, SpanKind.SPAN_KIND_SERVER, 'GET/test;C')
  const spanCC1 = createSpanData(traceId, spanIdCClient1, spanIdCServer, SpanKind.SPAN_KIND_CLIENT, 'GET/test;CClient1')
  const spanCC2 = createSpanData(traceId, spanIdCClient2, spanIdCServer, SpanKind.SPAN_KIND_CLIENT, 'GET/test;CClient2')

  // E
  const spanIdEServer = createSpanId()
  const spanES = createSpanData(traceId, spanIdEServer, spanIdCClient2, SpanKind.SPAN_KIND_SERVER, 'GET/test;E')

  const trace = [spanAS, spanAC, spanBS, spanBC, spanCS, spanCC1, spanCC2, spanES]

  const { isDone, calls, rootSpanId } = checkTrace(trace, SpanKind)
  assert.ok(!isDone)
  const expectedCalls = {
    [spanIdAClient]: spanIdBServer,
    [spanIdBClient]: spanIdCServer,
    [spanIdCClient2]: spanIdEServer
  }
  assert.deepStrictEqual(calls, expectedCalls)
  assert.strictEqual(rootSpanId, spanIdAServer)
})

test('Complex text with multiple spans, a lot of them skipped', async (t) => {
  const trace = [
    { traceId: '1234', spanId: '4d66bf536d3b457c', parentSpanId: '317c32f768fef77f', kind: 3, operation: 'test-watt-next|http://GET/' },
    { traceId: '1234', spanId: 'acfe1577e6382ee4', parentSpanId: '2fb934e0389b7442', kind: 1, operation: 'test-watt-next|SKIP' },
    { traceId: '1234', spanId: 'f62b901e7aa185ca', parentSpanId: '908d0f9269ac7f23', kind: 1, operation: 'test-watt-next|SKIP' },
    { traceId: '1234', spanId: '7aaa79ec9e62333c', parentSpanId: '908d0f9269ac7f23', kind: 1, operation: 'test-watt-next|SKIP' },
    { traceId: '1234', spanId: '908d0f9269ac7f23', parentSpanId: '317c32f768fef77f', kind: 1, operation: 'test-watt-next|SKIP' },
    { traceId: '1234', spanId: '317c32f768fef77f', parentSpanId: '2fb934e0389b7442', kind: 1, operation: 'test-watt-next|SKIP' },
    { traceId: '1234', spanId: '79607f7798ff1662', parentSpanId: '317c32f768fef77f', kind: 1, operation: 'test-watt-next|SKIP' },
    { traceId: '1234', spanId: '4b0d1755e342f661', parentSpanId: '69bea8d736455e4c', kind: 1, operation: 'test-watt-next|SKIP' },
    { traceId: '1234', spanId: '2fb934e0389b7442', parentSpanId: '69bea8d736455e4c', kind: 2, operation: 'test-watt-next|SKIP' },
    { traceId: '1234', spanId: '88ace351ddf65070', parentSpanId: '4d66bf536d3b457c', kind: 3, operation: 'test-watt-next|http://GET/' },
    { traceId: '1234', spanId: '69bea8d736455e4c', parentSpanId: 'c1e100408903e023', kind: 2, operation: 'test-watt-next|http://GET/test-watt/next' },
    { traceId: '1234', spanId: '523b848a9b359c44', parentSpanId: '88ace351ddf65070', kind: 2, operation: 'test-watt-fastify|http://GET/' },
    { traceId: '1234', spanId: 'c1e100408903e023', parentSpanId: 'a92ad6fb5ad7158f', kind: 3, operation: 'test-watt-composer|http://GET/next' },
    { traceId: '1234', spanId: 'a92ad6fb5ad7158f', parentSpanId: null, kind: 2, operation: 'test-watt-composer|http://GET/next' }
  ]

  const { isDone, calls, rootSpanId } = checkTrace(trace, SpanKind)
  assert.ok(isDone)
  const expectedCalls = {
    '69bea8d736455e4c': '2fb934e0389b7442',
    '88ace351ddf65070': '523b848a9b359c44',
    c1e100408903e023: '69bea8d736455e4c'
  }
  assert.deepStrictEqual(calls, expectedCalls)
  assert.strictEqual(rootSpanId, 'a92ad6fb5ad7158f')
})
