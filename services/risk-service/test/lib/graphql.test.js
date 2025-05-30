'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { fixGraphQLTrace } = require('../../lib/graphql')
const { createTraceId, createSpanId } = require('../helper')

test('do not touch the trace if there are no internal GraphQL spans', async (t) => {
  const traceId = createTraceId()
  const httpPostSpanId = createSpanId()
  const graphqlSpanId = createSpanId()
  const serviceName = 'SERVICE_A'

  const trace = [{
    traceId,
    parentSpanId: httpPostSpanId,
    spanId: graphqlSpanId,
    serviceName,
    kind: 3,
    attributes: {},
    operation: 'SERVICE_A|://GET/movies',
    isGraphQL: false,
    isGraphQLHTTPPost: false
  }, {
    traceId,
    parentSpanId: null,
    spanId: httpPostSpanId,
    serviceName,
    kind: 2,
    attributes: {
      'http.request.method': 'POST',
      'url.path': '/graphql',
      'url.scheme': 'http'
    },
    operation: 'SERVICE_B|http://GET/movies',
    isGraphQL: false,
    isGraphQLHTTPPost: false
  }]
  const traceCopy = trace.map(t => ({ ...t }))

  const filteredTrace = fixGraphQLTrace(trace)
  assert.deepStrictEqual(filteredTrace, traceCopy)
})

test('replaces a graphql post span with the internal one', async (t) => {
  const traceId = createTraceId()
  const httpPostSpanId = createSpanId()
  const graphqlSpanId = createSpanId()
  const serviceName = 'SERVICE_A'

  const trace = [{
    traceId,
    parentSpanId: httpPostSpanId,
    spanId: graphqlSpanId,
    serviceName,
    kind: 1,
    attributes: {
      'graphql.operation.name': 'getMovies',
      'graphql.operation.type': 'query'
    },
    operation: 'SERVICE_A|graphql://QUERY/getMovies',
    isGraphQL: true,
    isGraphQLHTTPPost: false
  }, {
    traceId,
    parentSpanId: null,
    spanId: httpPostSpanId,
    serviceName,
    kind: 2,
    attributes: {
      'http.request.method': 'POST',
      'url.path': '/graphql',
      'url.scheme': 'http'
    },
    operation: 'SERVICE_A|http://POST/graphql',
    isGraphQL: false,
    isGraphQLHTTPPost: true
  }]
  const traceCopy = trace.map(t => ({ ...t }))

  const filteredTrace = fixGraphQLTrace(trace)
  const expectedTrace = traceCopy[0]
  expectedTrace.parentSpanId = null
  expectedTrace.kind = 2
  assert.deepStrictEqual(filteredTrace, [expectedTrace])
})

test('removes all the internal spans if are not direct children of a GraphqlHTTPPost', async (t) => {
  const traceId = createTraceId()
  const httpPostSpanId = createSpanId()
  const graphqlSpanId = createSpanId()
  const serviceName = 'SERVICE_A'
  const trace = [{
    traceId,
    parentSpanId: createSpanId(),
    spanId: graphqlSpanId,
    serviceName,
    kind: 1,
    attributes: {
      'graphql.operation.name': 'getMovies',
      'graphql.operation.type': 'query'
    },
    operation: 'SERVICE_A|graphql://QUERY/getMovies',
    isGraphQL: true,
    isGraphQLHTTPPost: false
  }, {
    traceId,
    parentSpanId: null,
    spanId: httpPostSpanId,
    serviceName,
    kind: 2,
    attributes: {
      'http.request.method': 'POST',
      'url.path': '/graphql',
      'url.scheme': 'http'
    },
    operation: 'SERVICE_A|http://POST/graphql',
    isGraphQL: false,
    isGraphQLHTTPPost: true
  }]
  const filteredTrace = fixGraphQLTrace(trace)
  assert.deepStrictEqual(filteredTrace, [trace[1]])
})

test('manages multiple grapql spans', async (t) => {
  const traceId = createTraceId()
  const httpPostSpanId = createSpanId()
  const graphqlSpanId = createSpanId()
  const graphqlSpanId2 = createSpanId()
  const serviceName = 'SERVICE_A'

  const trace = [{
    traceId,
    parentSpanId: httpPostSpanId,
    spanId: graphqlSpanId,
    serviceName,
    kind: 1,
    attributes: {
      'graphql.operation.name': 'getMovies',
      'graphql.operation.type': 'query'
    },
    operation: 'SERVICE_A|graphql://QUERY/getMovies',
    isGraphQL: true,
    isGraphQLHTTPPost: false
  }, {
    traceId,
    parentSpanId: httpPostSpanId,
    spanId: graphqlSpanId2,
    serviceName,
    kind: 1,
    attributes: {
      'graphql.operation.name': 'movies',
      'graphql.operation.type': 'query'
    },
    operation: 'SERVICE_A|graphql://QUERY/movies',
    isGraphQL: true,
    isGraphQLHTTPPost: false
  }, {
    traceId,
    parentSpanId: null,
    spanId: httpPostSpanId,
    serviceName,
    kind: 2,
    attributes: {
      'http.request.method': 'POST',
      'url.path': '/graphql',
      'url.scheme': 'http'
    },
    operation: 'SERVICE_A|http://POST/graphql',
    isGraphQL: false,
    isGraphQLHTTPPost: true
  }]
  const traceCopy = trace.map(t => ({ ...t }))

  const filteredTrace = fixGraphQLTrace(trace)
  const expectedTrace1 = traceCopy[0]
  expectedTrace1.parentSpanId = null
  expectedTrace1.kind = 2
  const expectedTrace2 = traceCopy[1]
  expectedTrace2.parentSpanId = null
  expectedTrace2.kind = 2
  assert.deepStrictEqual(filteredTrace, [expectedTrace1, expectedTrace2])
})
