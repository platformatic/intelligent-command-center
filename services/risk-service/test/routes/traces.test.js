'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { createResourceSpan, createHTTPSpan, createTraceId, createSpanId, bootstrap } = require('../helper')
const { request, Agent } = require('undici')

test('should post the traces of a simple server called with no propagation', async (t) => {
  const fastify = await bootstrap(t)

  const { messages } = fastify
  const { SpanKind, tracePackage } = messages

  // This is the simplest case, a server called with no propagation.
  const traceId = createTraceId()
  const spanId = createSpanId()
  const span = createHTTPSpan(traceId, spanId, null, 'test', SpanKind.SPAN_KIND_SERVER, 'GET', '/test', null)
  const resourceSpan = createResourceSpan('A', [span])
  const resourceSpans = {
    resourceSpans: [resourceSpan]
  }
  const buffer = tracePackage.encode(resourceSpans).finish()

  const res = await fastify.inject({
    method: 'POST',
    url: '/v1/traces',
    payload: buffer,
    headers: {
      accept: 'application/x-protobuf',
      'content-type': 'application/x-protobuf'
    }
  })

  assert.equal(res.statusCode, 200)
  const result = await fastify.store.scanAllPaths()
  assert.equal(result.length, 1)
  const path = result[0]
  assert.deepStrictEqual(path, 'A|http://GET/test')
})

test('should post the traces', async (t) => {
  const fastify = await bootstrap(t)

  const { messages } = fastify
  const { SpanKind, tracePackage } = messages

  // This is the simplest case, a server called with no propagation.
  const traceId = createTraceId()
  const spanId = createSpanId()
  const span = createHTTPSpan(traceId, spanId, null, 'test', SpanKind.SPAN_KIND_SERVER, 'GET', '/test', null)
  const resourceSpan = createResourceSpan('A', [span])
  const resourceSpans = {
    resourceSpans: [resourceSpan]
  }
  const buffer = tracePackage.encode(resourceSpans).finish()

  const url = fastify.url + '/v1/traces'
  const applicationId = 'aaabbbccc'
  const res = await request(url, {
    method: 'POST',
    body: buffer,
    headers: {
      accept: 'application/x-protobuf',
      'content-type': 'application/x-protobuf',
      'x-platformatic-application-id': applicationId
    },
    dispatcher: new Agent({
      connect: {
        rejectUnauthorized: false
      }
    })
  })

  assert.equal(res.statusCode, 200)
  const result = await fastify.store.scanAllPaths()
  assert.equal(result.length, 1)
  const path = result[0]
  assert.deepStrictEqual(path, 'A|http://GET/test')
})
