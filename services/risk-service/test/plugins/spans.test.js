'use strict'

const test = require('node:test')
const assert = require('node:assert')
const {
  createResourceSpan,
  createHTTPSpan,
  createTraceId,
  createSpanId,
  createGraphQLSpan,
  createDBSpan,
  createGenericSpan
} = require('../helper')
const store = require('../../plugins/store')
const spans = require('../../plugins/spans')
const messages = require('../../plugins/messages')
const env = require('../../plugins/env')
const routes = require('../../plugins/routes')
const Fastify = require('fastify')
const { setTimeout: sleep } = require('node:timers/promises')

const setupServer = async (t) => {
  process.env.PLT_ICC_VALKEY_CONNECTION_STRING = 'redis://localhost:6379'
  const fastify = Fastify()
  await fastify.register(env)
  await fastify.register(messages)
  await fastify.register(store)
  await fastify.register(routes)
  await fastify.register(spans)
  await fastify.ready()

  t.after(async () => {
    await fastify.store.flushAll()
    await fastify.close()
  })
  return fastify
}

test('should get the path of a simple server called with no propagation', async (t) => {
  const fastify = await setupServer(t)
  const { processResourceSpans } = fastify
  const { messages } = fastify
  const { SpanKind } = messages
  // This is the simplest case, a server called with no propagation.
  const traceId = createTraceId()
  const spanId = createSpanId()
  const span = createHTTPSpan(traceId, spanId, null, 'test', SpanKind.SPAN_KIND_SERVER, 'GET', '/test', null)
  const resourceSpan = createResourceSpan('A', [span])
  await processResourceSpans([resourceSpan])

  const result = await fastify.store.scanAllPaths()
  assert.equal(result.length, 1)
  const path = result[0]
  assert.deepStrictEqual(path, 'A|http://GET/test')

  assert.equal(await fastify.store.getPath(path), '1')
})

test('should get the path of server which calls another server', async (t) => {
  // X => A => B
  const fastify = await setupServer(t)
  const { processResourceSpans } = fastify
  const { messages } = fastify
  const { SpanKind } = messages
  const traceId = createTraceId()
  const spanAServerSpanId = createSpanId()
  const spanAClientSpanId = createSpanId()
  const spanBServerSpanId = createSpanId()

  const spanAServer = createHTTPSpan(traceId, spanAServerSpanId, null, 'serverA', SpanKind.SPAN_KIND_SERVER, 'GET', '/opA', null)
  const spanAClient = createHTTPSpan(traceId, spanAClientSpanId, spanAServerSpanId, 'clientA', SpanKind.SPAN_KIND_CLIENT, 'GET', '/opB', null)

  const spanBServer = createHTTPSpan(traceId, spanBServerSpanId, spanAClientSpanId, 'serverB', SpanKind.SPAN_KIND_SERVER, 'GET', '/test', null)

  const resourceSpanA = createResourceSpan('A', [spanAServer, spanAClient])
  const resourceSpanB = createResourceSpan('B', [spanBServer])

  await processResourceSpans([resourceSpanA])
  await processResourceSpans([resourceSpanB])

  const result = await fastify.store.scanAllPaths()
  assert.equal(result.length, 1)
  const path = result[0]
  assert.deepStrictEqual(path, 'A|http://GET/opA;B|http://GET/test')
  assert.equal(await fastify.store.getPath(path), '1')
})

test('should get the path of server which calls another server, with spans coming in reverse order', async (t) => {
  // X => A => B
  const fastify = await setupServer(t)
  const { processResourceSpans } = fastify
  const { messages } = fastify
  const { SpanKind } = messages
  const traceId = createTraceId()
  const spanAServerSpanId = createSpanId()
  const spanAClientSpanId = createSpanId()
  const spanBServerSpanId = createSpanId()

  const spanAServer = createHTTPSpan(traceId, spanAServerSpanId, null, 'serverA', SpanKind.SPAN_KIND_SERVER, 'GET', '/opA', null)
  const spanAClient = createHTTPSpan(traceId, spanAClientSpanId, spanAServerSpanId, 'clientA', SpanKind.SPAN_KIND_CLIENT, 'GET', '/opB', null)

  const spanBServer = createHTTPSpan(traceId, spanBServerSpanId, spanAClientSpanId, 'serverB', SpanKind.SPAN_KIND_SERVER, 'GET', '/test', null)

  const resourceSpanA = createResourceSpan('A', [spanAServer, spanAClient])
  const resourceSpanB = createResourceSpan('B', [spanBServer])

  await processResourceSpans([resourceSpanB])
  await processResourceSpans([resourceSpanA])

  const result = await fastify.store.scanAllPaths()
  assert.equal(result.length, 1)
  const path = result[0]
  assert.deepStrictEqual(path, 'A|http://GET/opA;B|http://GET/test')
  assert.equal(await fastify.store.getPath(path), '1')
})

test('should get the path of X => A => B and C', async (t) => {
  const fastify = await setupServer(t)
  const { processResourceSpans } = fastify
  const { messages } = fastify
  const { SpanKind } = messages
  const traceId = createTraceId()
  const spanAServerSpanId = createSpanId()
  const spanAClient1SpanId = createSpanId()
  const spanAClient2SpanId = createSpanId()
  const spanBServerSpanId = createSpanId()
  const spanCServerSpanId = createSpanId()

  const spanAServer = createHTTPSpan(traceId, spanAServerSpanId, null, 'serverA', SpanKind.SPAN_KIND_SERVER, 'GET', '/opA', null)
  const spanAClient1 = createHTTPSpan(traceId, spanAClient1SpanId, spanAServerSpanId, 'clientA1', SpanKind.SPAN_KIND_CLIENT, 'GET', '/opB', null)
  const spanAClient2 = createHTTPSpan(traceId, spanAClient2SpanId, spanAServerSpanId, 'clientA2', SpanKind.SPAN_KIND_CLIENT, 'GET', '/opC', null)
  const spanBServer = createHTTPSpan(traceId, spanBServerSpanId, spanAClient1SpanId, 'serverB', SpanKind.SPAN_KIND_SERVER, 'GET', '/testB', null)
  const spanCServer = createHTTPSpan(traceId, spanCServerSpanId, spanAClient2SpanId, 'serverC', SpanKind.SPAN_KIND_SERVER, 'GET', '/testC', null)

  const resourceSpanA = createResourceSpan('A', [spanAServer, spanAClient1, spanAClient2])
  const resourceSpanB = createResourceSpan('B', [spanBServer])
  const resourceSpanC = createResourceSpan('C', [spanCServer])

  await processResourceSpans([resourceSpanB])
  await processResourceSpans([resourceSpanA])
  await processResourceSpans([resourceSpanC])

  const result = await fastify.store.scanAllPaths()
  assert.equal(await fastify.store.getPath(result[0]), '1')
  assert.equal(result.length, 1)
  assert.equal(result[0], 'A|http://GET/opA;B|http://GET/testB,A|http://GET/opA;C|http://GET/testC')
})

test('missing parent, must not close the trace', async (t) => {
  const fastify = await setupServer(t)
  const { processResourceSpans } = fastify
  const { messages } = fastify
  const { SpanKind } = messages
  const traceId = createTraceId()
  const spanAServerSpanId = createSpanId()
  const spanAClientSpanId = createSpanId()
  const spanBServerSpanId = createSpanId()

  const spanAServer = createHTTPSpan(traceId, spanAServerSpanId, null, 'serverA', SpanKind.SPAN_KIND_SERVER, 'GET', '/opA', null)
  const spanAClient = createHTTPSpan(traceId, spanAClientSpanId, spanAServerSpanId, 'clientA1', SpanKind.SPAN_KIND_CLIENT, 'GET', '/opB', null)
  // spanBServer is missing the parent
  const spanBServer = createHTTPSpan(traceId, spanBServerSpanId, createSpanId(), 'serverB', SpanKind.SPAN_KIND_SERVER, 'GET', '/testB', null)

  const resourceSpanA = createResourceSpan('A', [spanAServer, spanAClient])
  const resourceSpanB = createResourceSpan('B', [spanBServer])

  await processResourceSpans([resourceSpanB])
  await processResourceSpans([resourceSpanA])
  const result = await fastify.store.scanAllPaths()
  assert.equal(result.length, 0)
})

test('should get the path of a simple server', async (t) => {
  const fastify = await setupServer(t)
  const { processResourceSpans } = fastify
  const { messages } = fastify
  const { SpanKind } = messages
  // This is the simplest case, a server called with no propagation.
  const traceId = createTraceId()
  const spanId = createSpanId()
  const span = createHTTPSpan(traceId, spanId, null, 'test', SpanKind.SPAN_KIND_SERVER, 'GET', '/test', null)
  const resourceSpan = createResourceSpan('A', [span])
  await processResourceSpans([resourceSpan])

  const result = await fastify.store.scanAllPaths()
  assert.equal(result.length, 1)
  const path = result[0]
  assert.deepStrictEqual(path, 'A|http://GET/test')

  assert.equal(await fastify.store.getPath(path), '1')
})

test('should get the path of a graphql span', async (t) => {
  const fastify = await setupServer(t)
  const { processResourceSpans } = fastify
  const { messages } = fastify
  const { SpanKind } = messages

  // We need TWO spans:
  // - the HTTP POST graphql span
  // - the internal graphql span

  const traceId = createTraceId()
  const serviceName = 'SERVICE_A'

  const httpPostSpanId = createSpanId()
  const httpPostSpan = createHTTPSpan(traceId, httpPostSpanId, null, 'test', SpanKind.SPAN_KIND_SERVER, 'POST', '/graphql')
  const httpPostResourceSpan = createResourceSpan(serviceName, [httpPostSpan])

  const graphqlInternalSpanId = createSpanId()
  const graphqlInternalSpan = createGraphQLSpan(traceId, graphqlInternalSpanId, httpPostSpanId, 'test', SpanKind.SPAN_KIND_INTERNAL, 'query', 'getMovies')
  const graphqlInternalResourceSpan = createResourceSpan(serviceName, [graphqlInternalSpan])

  await processResourceSpans([graphqlInternalResourceSpan])
  await processResourceSpans([httpPostResourceSpan])

  const result = await fastify.store.scanAllPaths()
  assert.equal(result.length, 1)
  const path = result[0]
  assert.deepStrictEqual(path, 'SERVICE_A|graphql://QUERY/getMovies')

  assert.equal(await fastify.store.getPath(path), '1')
})

test('should get the path of server which calls another server which uses graphQL', async (t) => {
  // X => A => B
  const fastify = await setupServer(t)
  const { processResourceSpans } = fastify
  const { messages } = fastify
  const { SpanKind } = messages
  const traceId = createTraceId()
  const spanAServerSpanId = createSpanId()
  const spanAClientSpanId = createSpanId()
  const spanBServerSpanId = createSpanId()

  const spanAServer = createHTTPSpan(traceId, spanAServerSpanId, null, 'serverA', SpanKind.SPAN_KIND_SERVER, 'GET', '/opA', null)
  const spanAClient = createHTTPSpan(traceId, spanAClientSpanId, spanAServerSpanId, 'clientA', SpanKind.SPAN_KIND_CLIENT, 'GET', '/opB', null)

  const spanBServer = createHTTPSpan(traceId, spanBServerSpanId, spanAClientSpanId, 'serverB', SpanKind.SPAN_KIND_SERVER, 'POST', '/graphql', null)
  const graphqlInternalSpanId = createSpanId()
  const graphqlInternalSpan = createGraphQLSpan(traceId, graphqlInternalSpanId, spanBServerSpanId, 'serverB', SpanKind.SPAN_KIND_INTERNAL, 'query', 'getMovies')

  const resourceSpanA = createResourceSpan('A', [spanAServer, spanAClient])
  const resourceSpanB = createResourceSpan('B', [graphqlInternalSpan, spanBServer])

  await processResourceSpans([resourceSpanA])
  await processResourceSpans([resourceSpanB])

  const result = await fastify.store.scanAllPaths()
  assert.equal(result.length, 1)
  const path = result[0]
  assert.deepStrictEqual(path, 'A|http://GET/opA;B|graphql://QUERY/getMovies')
  assert.equal(await fastify.store.getPath(path), '1')
})

test('should get the path and collect the DB changes from DB spans', async (t) => {
  // X => A => B
  const fastify = await setupServer(t)
  const { processResourceSpans } = fastify
  const { messages } = fastify
  const { SpanKind } = messages
  const traceId = createTraceId()
  const spanAServerSpanId = createSpanId()
  const spanAClientSpanId = createSpanId()
  const spanBServerSpanId = createSpanId()

  // DB span
  const dbSpanId = createSpanId()
  const dbSpanA = createDBSpan(
    traceId,
    dbSpanId,
    spanBServerSpanId,
    'serverAQuery',
    SpanKind.SPAN_KIND_CLIENT,
    'postgresql',
    'xxx',
    'INSERT INTO users (id, name) VALUES (1, \'Marco\')',
    'localhost',
    5432,
    'user')

  const spanAServer = createHTTPSpan(traceId, spanAServerSpanId, null, 'serverA', SpanKind.SPAN_KIND_SERVER, 'GET', '/opA', null)
  const spanAClient = createHTTPSpan(traceId, spanAClientSpanId, spanAServerSpanId, 'clientA', SpanKind.SPAN_KIND_CLIENT, 'GET', '/opB', null)

  const spanBServer = createHTTPSpan(traceId, spanBServerSpanId, spanAClientSpanId, 'serverB', SpanKind.SPAN_KIND_SERVER, 'GET', '/test', null)

  const resourceSpanA = createResourceSpan('A', [spanAServer, dbSpanA, spanAClient])
  const resourceSpanB = createResourceSpan('B', [spanBServer])

  await processResourceSpans([resourceSpanA])
  await processResourceSpans([resourceSpanB])

  const result = await fastify.store.scanAllPaths()
  assert.equal(result.length, 1)
  const path = result[0]
  assert.deepStrictEqual(path, 'A|http://GET/opA;B|http://GET/test')
  assert.equal(await fastify.store.getPath(path), '1')

  // Get the DB dump
  const dbDump = await fastify.store.getDBOperationsDump()
  const expected = [
    {
      id: 'dbns:[localhost:5432:xxx]',
      ops: [
        {
          host: 'localhost',
          port: 5432,
          tables: [
            'users'
          ],
          columns: [
            'users.id',
            'users.name'
          ],
          queryType: 'INSERT',
          dbSystem: 'postgresql',
          dbName: 'xxx',
          targetTable: 'users',
          paths: [
            'A|http://GET/opA,B|http://GET/test'
          ]
        }
      ]
    }
  ]

  assert.deepStrictEqual(dbDump, expected)
})

test('should ignore span which are not HTTP/GraphQL or DB', async (t) => {
  // X => A => B (ignored) => C
  const fastify = await setupServer(t)
  const { processResourceSpans } = fastify
  const { messages } = fastify
  const { SpanKind } = messages
  const traceId = createTraceId()
  const spanAServerSpanId = createSpanId()
  const spanAClientSpanId = createSpanId()
  const spanBSpanId = createSpanId()
  const spanCServerSpanId = createSpanId()

  const spanAServer = createHTTPSpan(traceId, spanAServerSpanId, null, 'serverA', SpanKind.SPAN_KIND_SERVER, 'GET', '/opA', null)
  const spanAClient = createHTTPSpan(traceId, spanAClientSpanId, spanAServerSpanId, 'clientA', SpanKind.SPAN_KIND_CLIENT, 'GET', '/opB', null)

  const spanB = createGenericSpan(traceId, spanBSpanId, spanAClientSpanId, 'ignoredB', SpanKind.SPAN_KIND_INTERNAL)

  const spanCServer = createHTTPSpan(traceId, spanCServerSpanId, spanBSpanId, 'serverC', SpanKind.SPAN_KIND_SERVER, 'GET', '/testC', null)

  const resourceSpanA = createResourceSpan('A', [spanAServer, spanAClient])
  const resourceSpanB = createResourceSpan('B', [spanB])
  const resourceSpanC = createResourceSpan('C', [spanCServer])

  await processResourceSpans([resourceSpanA])
  await processResourceSpans([resourceSpanC])
  await processResourceSpans([resourceSpanB])

  const result = await fastify.store.scanAllPaths()
  assert.equal(result.length, 1)
  const path = result[0]
  assert.deepStrictEqual(path, 'A|http://GET/opA;C|http://GET/testC')
  assert.equal(await fastify.store.getPath(path), '1')
})

test('should ignore span which are not HTTP/GraphQL or DB, even when first', async (t) => {
  // X => A (ignored) => B
  //                  => C
  const fastify = await setupServer(t)
  const { processResourceSpans } = fastify
  const { messages } = fastify
  const { SpanKind } = messages
  const traceId = createTraceId()
  const spanAServerSpanId = createSpanId()
  const spanAClientSpanId = createSpanId()
  const spanBServerSpanId = createSpanId()
  const spanCServerSpanId = createSpanId()

  const spanAServer = createHTTPSpan(traceId, spanAServerSpanId, null, 'serverA', SpanKind.SPAN_KIND_INTERNAL, 'GET', '/opA', null)
  const spanAClient = createHTTPSpan(traceId, spanAClientSpanId, spanAServerSpanId, 'clientA', SpanKind.SPAN_KIND_CLIENT, 'GET', '/opB', null)

  const spanBServer = createHTTPSpan(traceId, spanBServerSpanId, spanAClientSpanId, 'serverB', SpanKind.SPAN_KIND_SERVER, 'GET', '/testB', null)

  const spanCServer = createHTTPSpan(traceId, spanCServerSpanId, spanAClientSpanId, 'serverC', SpanKind.SPAN_KIND_SERVER, 'GET', '/testC', null)

  const resourceSpanA = createResourceSpan('A', [spanAServer, spanAClient])
  const resourceSpanB = createResourceSpan('B', [spanBServer])
  const resourceSpanC = createResourceSpan('C', [spanCServer])

  await processResourceSpans([resourceSpanC])
  await processResourceSpans([resourceSpanB])
  await processResourceSpans([resourceSpanA])

  const result = await fastify.store.scanAllPaths()
  assert.equal(result.length, 1)
  assert.equal(await fastify.store.getPath(result[0]), '1')
  assert.equal(result[0], 'B|http://GET/testB,C|http://GET/testC')
})

test('should ignore span which are not HTTP/GraphQL or DB, even when first, but with spans processed in different order', async (t) => {
  // X => A (ignored) => B
  //                  => C
  const fastify = await setupServer(t)
  const { processResourceSpans } = fastify
  const { messages } = fastify
  const { SpanKind } = messages
  const traceId = createTraceId()
  const spanAServerSpanId = createSpanId()
  const spanAClientSpanId = createSpanId()
  const spanBServerSpanId = createSpanId()
  const spanCServerSpanId = createSpanId()

  const spanAServer = createHTTPSpan(traceId, spanAServerSpanId, null, 'serverA', SpanKind.SPAN_KIND_INTERNAL, 'GET', '/opA', null)
  const spanAClient = createHTTPSpan(traceId, spanAClientSpanId, spanAServerSpanId, 'clientA', SpanKind.SPAN_KIND_CLIENT, 'GET', '/opB', null)

  const spanBServer = createHTTPSpan(traceId, spanBServerSpanId, spanAClientSpanId, 'serverB', SpanKind.SPAN_KIND_SERVER, 'GET', '/testB', null)

  const spanCServer = createHTTPSpan(traceId, spanCServerSpanId, spanAClientSpanId, 'serverC', SpanKind.SPAN_KIND_SERVER, 'GET', '/testC', null)

  const resourceSpanA = createResourceSpan('A', [spanAServer, spanAClient])
  const resourceSpanB = createResourceSpan('B', [spanBServer])
  const resourceSpanC = createResourceSpan('C', [spanCServer])

  // We receive the span, with some delay
  await processResourceSpans([resourceSpanC])
  await sleep(500)
  await processResourceSpans([resourceSpanB])
  await sleep(500)
  await processResourceSpans([resourceSpanA])

  const result = await fastify.store.scanAllPaths()
  assert.equal(result.length, 1)
  assert.equal(await fastify.store.getPath(result[0]), '1')
  assert.equal(result[0], 'B|http://GET/testB,C|http://GET/testC')
})

test('more complex case with ignored steps and then fork ', async (t) => {
  // X => A -> B -> C(i) -> D
  //                     -> E

  const fastify = await setupServer(t)
  const { processResourceSpans } = fastify
  const { messages } = fastify
  const { SpanKind } = messages
  const traceId = createTraceId()
  const spanAServerSpanId = createSpanId()
  const spanAClientSpanId = createSpanId()
  const spanBServerSpanId = createSpanId()
  const spanBClientSpanId = createSpanId()
  const spanCServerSpanId = createSpanId()
  const spanCClientSpanId = createSpanId()
  const spanDServerSpanId = createSpanId()
  const spanEServerSpanId = createSpanId()

  const spanAServer = createHTTPSpan(traceId, spanAServerSpanId, null, 'serverA', SpanKind.SPAN_KIND_SERVER, 'GET', '/opA', null)
  const spanAClient = createHTTPSpan(traceId, spanAClientSpanId, spanAServerSpanId, 'clientA', SpanKind.SPAN_KIND_CLIENT, 'GET', '/opB', null)

  const spanBServer = createHTTPSpan(traceId, spanBServerSpanId, spanAClientSpanId, 'serverB', SpanKind.SPAN_KIND_SERVER, 'GET', '/testBser', null)
  const spanBClient = createHTTPSpan(traceId, spanBClientSpanId, spanBServerSpanId, 'serverB', SpanKind.SPAN_KIND_CLIENT, 'GET', '/testBcli', null)

  // Internal, so ignored
  const spanCServer = createHTTPSpan(traceId, spanCServerSpanId, spanBClientSpanId, 'serverC', SpanKind.SPAN_KIND_INTERNAL, 'GET', '/testCser', null)
  const spanCClient = createHTTPSpan(traceId, spanCClientSpanId, spanCServerSpanId, 'serverC', SpanKind.SPAN_KIND_INTERNAL, 'GET', '/testCcli', null)

  const spanDServer = createHTTPSpan(traceId, spanDServerSpanId, spanCClientSpanId, 'serverD', SpanKind.SPAN_KIND_SERVER, 'GET', '/testD', null)
  const spanEServer = createHTTPSpan(traceId, spanEServerSpanId, spanCClientSpanId, 'serverE', SpanKind.SPAN_KIND_SERVER, 'GET', '/testE', null)

  const resourceSpanA = createResourceSpan('A', [spanAServer, spanAClient])
  const resourceSpanB = createResourceSpan('B', [spanBServer, spanBClient])
  const resourceSpanC = createResourceSpan('C', [spanCServer, spanCClient])

  const resourceSpanD = createResourceSpan('D', [spanDServer])
  const resourceSpanE = createResourceSpan('E', [spanEServer])

  // We receive the span, with some delay
  await processResourceSpans([resourceSpanB])
  await processResourceSpans([resourceSpanC])
  await processResourceSpans([resourceSpanD])
  await processResourceSpans([resourceSpanE])
  await processResourceSpans([resourceSpanA])

  const result = await fastify.store.scanAllPaths()
  assert.equal(result.length, 1)
  assert.equal(await fastify.store.getPath(result[0]), '1')
  assert.equal(result[0], 'A|http://GET/opA;B|http://GET/testBser;D|http://GET/testD,A|http://GET/opA;B|http://GET/testBser;E|http://GET/testE')
})

test('should get the latencies in the trace X => A => (B, C)', async (t) => {
  const fastify = await setupServer(t)
  const { processResourceSpans } = fastify
  const { messages } = fastify
  const { SpanKind } = messages
  const traceId = createTraceId()
  const spanAServerSpanId = createSpanId()
  const spanAClient1SpanId = createSpanId()
  const spanAClient2SpanId = createSpanId()
  const spanBServerSpanId = createSpanId()
  const spanCServerSpanId = createSpanId()

  const timeA = 100 * 10 ** 6 // 100ms
  const spanAServer = createHTTPSpan(traceId, spanAServerSpanId, null, 'serverA', SpanKind.SPAN_KIND_SERVER, 'GET', '/opA', null, null, timeA)

  const timeAB = 200 * 10 ** 6 // 200ms
  const spanAClient1 = createHTTPSpan(traceId, spanAClient1SpanId, spanAServerSpanId, 'clientA1', SpanKind.SPAN_KIND_CLIENT, 'GET', '/opB', null, null, timeAB)

  const timeAC = 300 * 10 ** 6 // 300ms
  const spanAClient2 = createHTTPSpan(traceId, spanAClient2SpanId, spanAServerSpanId, 'clientA2', SpanKind.SPAN_KIND_CLIENT, 'GET', '/opC', null, null, timeAC)

  const spanBServer = createHTTPSpan(traceId, spanBServerSpanId, spanAClient1SpanId, 'serverB', SpanKind.SPAN_KIND_SERVER, 'GET', '/testB', null, null)
  const spanCServer = createHTTPSpan(traceId, spanCServerSpanId, spanAClient2SpanId, 'serverC', SpanKind.SPAN_KIND_SERVER, 'GET', '/testC', null, null)

  const resourceSpanA = createResourceSpan('A', [spanAServer, spanAClient1, spanAClient2])
  const resourceSpanB = createResourceSpan('B', [spanBServer])
  const resourceSpanC = createResourceSpan('C', [spanCServer])

  const [app1, app2] = ['app1', 'app2']
  await processResourceSpans([resourceSpanB], app1)
  await processResourceSpans([resourceSpanA], app2)
  await processResourceSpans([resourceSpanC], app2)

  const result = await fastify.store.scanAllLatencies()
  const expected = {
    'app2__A:app1__B': ['200'],
    ':A': ['100'],
    'app2__A:app2__C': ['300']
  }
  assert.deepStrictEqual(result, expected)
})
