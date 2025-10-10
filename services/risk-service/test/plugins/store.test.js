'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { createTraceId, createSpanId } = require('../helper')
const Fastify = require('fastify')
const { flushall } = require('../../../../lib/redis-utils')
const store = require('../../plugins/store')
const env = require('../../plugins/env')

const compare = (a, b) => a.mean - b.mean

const setupServer = async (t, options) => {
  process.env.PLT_ICC_VALKEY_CONNECTION_STRING = 'redis://localhost:6343'
  const fastify = Fastify()
  await fastify.register(env)
  await fastify.register(store, options)
  await fastify.ready()
  t.after(async () => {
    await flushall(fastify.redis)
    await fastify.close()
  })
  return fastify
}

test('connect using the connection string ', async (t) => {
  const fastify = await setupServer(t)
  const { loadTrace, storeSpan } = fastify.store

  // This is the simplest case, a server called with no propagation.
  const traceId = createTraceId()
  const spanId = createSpanId()
  const span = {
    operation: 'GET/test;A',
    server: true,
    spanId,
    parentspanId: null,
    calls: 1
  }

  await storeSpan(traceId, span)
  const result = await loadTrace(traceId)
  assert.deepStrictEqual(result, [span])

  const span2 = {
    operation: 'GET/test;B',
    server: true,
    spanId: createSpanId(),
    parentspanId: spanId,
    calls: 1
  }

  await storeSpan(traceId, span2)
  const result2 = await loadTrace(traceId)
  assert.deepStrictEqual(result2, [span, span2])
})

test('saves and append the traces correctly for a given traceId', async (t) => {
  const fastify = await setupServer(t)
  const { loadTrace, storeSpan } = fastify.store

  // This is the simplest case, a server called with no propagation.
  const traceId = createTraceId()
  const spanId = createSpanId()
  const span = {
    operation: 'GET/test;A',
    server: true,
    spanId,
    parentspanId: null,
    calls: 1
  }

  await storeSpan(traceId, span)
  const result = await loadTrace(traceId)
  assert.deepStrictEqual(result, [span])

  const span2 = {
    operation: 'GET/test;B',
    server: true,
    spanId: createSpanId(),
    parentspanId: spanId,
    calls: 1
  }

  await storeSpan(traceId, span2)
  const result2 = await loadTrace(traceId)
  assert.deepStrictEqual(result2, [span, span2])
})

test('increment a path', async (t) => {
  const fastify = await setupServer(t)
  const { incrPath, getPath, storeSpan, scanAllPaths } = fastify.store
  const path1 = 'GET/test;A'

  await incrPath(path1)
  const result = await getPath(path1)
  assert.equal(result, '1')

  await incrPath(path1)
  await incrPath(path1)

  {
    const result = await getPath(path1)
    assert.equal(result, '3')
  }
  const path2 = 'GET/test;B'
  await incrPath(path2)
  // We shouldn't see this because in a different namespace
  await storeSpan('traceId', 'span')
  const allPaths = await scanAllPaths()
  assert.equal(allPaths.length, 2)
  const p1 = allPaths.find(path => path === path1)
  const p2 = allPaths.find(path => path === path2)
  assert.equal(p1, 'GET/test;A')
  assert.equal(p2, 'GET/test;B')
})

test('scan all paths', async (t) => {
  const fastify = await setupServer(t)
  const { incrPath, scanAllPaths } = fastify.store
  const paths = []
  for (let i = 0; i < 100; i++) {
    const path = `GET/test;${i}`
    paths.push(path)
    await incrPath(path)
  }
  const allPaths = await scanAllPaths()
  assert.equal(allPaths.length, 100)
  assert.deepStrictEqual(allPaths.sort(), paths.sort())
})

test('get all paths with complete keys and flush redis', async (t) => {
  const fastify = await setupServer(t)
  const { getDump, parseDump, storePathCounter, deleteKeys } = fastify.store

  await storePathCounter('PATH0', 100)
  await storePathCounter('PATH11', 101)
  await storePathCounter('PATH12', 102)
  await storePathCounter('PATH21', 103)

  const allPaths = await getDump()
  const parsedAllPaths = parseDump(allPaths)

  const expected = [{
    path: 'PATH0',
    counter: 100
  }, {
    path: 'PATH11',
    counter: 101
  }, {
    path: 'PATH12',
    counter: 102
  }, {
    path: 'PATH21',
    counter: 103
  }]

  assert.equal(parsedAllPaths.length, 4)

  const path0 = parsedAllPaths.find(path => path.path === 'PATH0')
  const path11 = parsedAllPaths.find(path => path.path === 'PATH11')
  const path12 = parsedAllPaths.find(path => path.path === 'PATH12')
  const path21 = parsedAllPaths.find(path => path.path === 'PATH21')

  assert.deepStrictEqual(path0, expected[0])
  assert.deepStrictEqual(path11, expected[1])
  assert.deepStrictEqual(path12, expected[2])
  assert.deepStrictEqual(path21, expected[3])

  const allKeys = Object.keys(allPaths)
  await deleteKeys(allKeys)
  const allPathsAfter = await getDump()
  assert.deepStrictEqual(allPathsAfter, {})
})

test('saves and append the DB spans correctly for a given traceId', async (t) => {
  const fastify = await setupServer(t)
  const { loadDBSpans, storeDBSpan } = fastify.store

  // This is the simplest case, a server called with no propagation.
  const traceId = createTraceId()
  const spanId = createSpanId()
  const parentSpanId = createSpanId()
  const span = {
    spanId,
    parentSpanId
  }

  await storeDBSpan(traceId, span)
  const result = await loadDBSpans(traceId)
  assert.deepStrictEqual(result, [span])

  const span2 = {
    spanId: createSpanId(),
    parentSpanId
  }

  await storeDBSpan(traceId, span2)
  const result2 = await loadDBSpans(traceId)
  assert.deepStrictEqual(result2, [span, span2])
})

test('save impacted db tables and columns for a set of paths', async (t) => {
  const path1 = 'A|http://GET/test'
  const path2 = 'B|http://GET/test2'
  const paths = [path1, path2]
  const fastify = await setupServer(t)
  const { storeDBOperations, getDBOperationsDump } = fastify.store

  await storeDBOperations([{
    tables: ['mytable'],
    columns: ['mycolumn'],
    queryType: 'SELECT',
    targetTable: null,
    host: 'localhost',
    dbSystem: 'postgresql',
    dbName: 'post',
    port: 5432
  }], paths)

  await storeDBOperations([{
    tables: ['mytable2'],
    columns: ['mycolumn2'],
    queryType: 'INSERT',
    targetTable: 'mytable2',
    dbSystem: 'postgresql',
    dbName: 'post',
    host: 'localhost',
    port: 5432
  }], paths)

  const dump = await getDBOperationsDump()

  const expected = [
    {
      id: 'dbns:[localhost:5432]',
      ops: [
        {
          queryType: 'INSERT',
          tables: ['mytable2'],
          columns: ['mycolumn2'],
          targetTable: 'mytable2',
          host: 'localhost',
          port: 5432,
          dbSystem: 'postgresql',
          dbName: 'post',
          paths
        },
        {
          queryType: 'SELECT',
          tables: ['mytable'],
          columns: ['mycolumn'],
          targetTable: null,
          host: 'localhost',
          port: 5432,
          dbSystem: 'postgresql',
          dbName: 'post',
          paths
        }]
    }
  ]

  assert.deepStrictEqual(dump.id, expected.id)
  const insertOp = dump[0].ops.find(op => op.queryType === 'INSERT')
  const selectOp = dump[0].ops.find(op => op.queryType === 'SELECT')
  assert.deepStrictEqual(insertOp, expected[0].ops[0])
  assert.deepStrictEqual(selectOp, expected[0].ops[1])
})

test('save impacted db tables and columns for db with no host/port (sqlite)', async (t) => {
  const path1 = 'A|http://GET/test'
  const path2 = 'B|http://GET/test2'
  const paths = [path1, path2]
  const fastify = await setupServer(t)
  const { storeDBOperations, getDBOperationsDump } = fastify.store

  await storeDBOperations([{
    tables: ['mytable'],
    columns: ['mycolumn'],
    queryType: 'SELECT',
    targetTable: null,
    dbName: 'mydb.sqlite',
    dbSystem: 'sqlite'
  }], paths)

  await storeDBOperations([{
    tables: ['mytable2'],
    columns: ['mycolumn2'],
    queryType: 'INSERT',
    targetTable: 'mytable2',
    dbSystem: 'sqlite',
    dbName: 'mydb.sqlite'
  }], paths)

  const dump = await getDBOperationsDump()

  const expected = [
    {
      id: 'db:[localhost:5432]',
      ops: [
        {
          queryType: 'INSERT',
          tables: ['mytable2'],
          columns: ['mycolumn2'],
          targetTable: 'mytable2',
          host: '',
          port: 0,
          dbSystem: 'sqlite',
          dbName: 'mydb.sqlite',
          paths
        },
        {
          queryType: 'SELECT',
          tables: ['mytable'],
          columns: ['mycolumn'],
          targetTable: null,
          host: '',
          port: 0,
          dbSystem: 'sqlite',
          dbName: 'mydb.sqlite',
          paths
        }]
    }
  ]

  assert.deepStrictEqual(dump.id, expected.id)
  const insertOp = dump[0].ops.find(op => op.queryType === 'INSERT')
  const selectOp = dump[0].ops.find(op => op.queryType === 'SELECT')
  assert.deepStrictEqual(insertOp, expected[0].ops[0])
  assert.deepStrictEqual(selectOp, expected[0].ops[1])
})

test('save latencies', async (t) => {
  // Insert some data
  const latencies = {
    '||A': [100, 200],
    'A||B': [200, 300, 400]
  }

  const fastify = await setupServer(t)
  const { storeLatencies, getLatenciesDump } = fastify.store

  await storeLatencies(latencies)

  const dump = await getLatenciesDump()

  const expected = [
    {
      id: 'latencies:A:B',
      from: 'A',
      to: 'B',
      mean: 300,
      count: 3
    },
    {
      id: 'latencies::A',
      from: '',
      to: 'A',
      mean: 150,
      count: 2
    }
  ]

  assert.deepStrictEqual(dump.sort(compare), expected.sort(compare))
})

test('get all latentcy values', async (t) => {
  // Insert some data
  const latencies = {
    '||A': [100, 200],
    'A||B': [200, 300, 400]
  }

  const fastify = await setupServer(t)
  const { storeLatencies, getAllLatencyValues } = fastify.store

  await storeLatencies(latencies)

  const dump = await getAllLatencyValues()

  const expected = [
    {
      from: 'A',
      to: 'B',
      mean: 300,
      count: 3
    },
    {
      from: '',
      to: 'A',
      mean: 150,
      count: 2
    }
  ]

  assert.deepStrictEqual(dump.sort(compare), expected.sort(compare))
})
