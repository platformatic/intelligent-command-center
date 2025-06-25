'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const store = require('../../plugins/store')
const dump = require('../../routes/dump')
const latencies = require('../../routes/latencies')
const env = require('../../plugins/env')
const Fastify = require('fastify')
const fp = require('fastify-plugin')

const compare = (a, b) => a.mean - b.mean

const setupServer = async (t, plugins = []) => {
  process.env.PLT_ICC_VALKEY_CONNECTION_STRING = 'redis://localhost:6343'
  const fastify = Fastify()
  await fastify.register(env)
  await fastify.register(store)
  await fastify.register(dump)
  await fastify.register(latencies)
  await Promise.all(plugins.map((plugin) => fastify.register(plugin)))
  await fastify.ready()

  t.after(async () => {
    await fastify.store.flushAll()
    await fastify.close()
  })
  return fastify
}

test('no latencies if no data', async (t) => {
  let postDumpCall = null
  const coldStorageMock = fp(async function (fastify, opts) {
    fastify.addHook('onRequest', function (req, reply, done) {
      req.coldStorage = {
        getStatus: async () => {
          return {
            isImporter: false,
            isExporter: true
          }
        },
        postPathsDump: async (_dump) => {
          postDumpCall = _dump
          return { ok: true }
        }
      }
      done()
    })
  })

  const fastify = await setupServer(t, [coldStorageMock])
  const res = await fastify.inject({
    method: 'GET',
    url: '/dump'
  })

  assert.equal(res.statusCode, 200)
  assert.deepStrictEqual(postDumpCall, { dump: [] })
})

test('dump paths', async (t) => {
  const postDumpCalls = []
  const coldStorageMock = fp(async function (fastify, opts) {
    fastify.addHook('onRequest', function (req, reply, done) {
      req.coldStorage = {
        getStatus: async () => {
          return {
            isImporter: false,
            isExporter: true
          }
        },
        postPathsDump: async (_dump) => {
          postDumpCalls.push(_dump)
          return { ok: true }
        },
        postLatenciesDump: async (_dump) => {}
      }
      done()
    })
  })

  const fastify = await setupServer(t, [coldStorageMock])

  // Insert some data
  await fastify.store.storePathCounter('PATH1', 10)
  await fastify.store.storePathCounter('PATH2', 20)

  const res = await fastify.inject({
    method: 'GET',
    url: '/dump'
  })

  assert.equal(res.statusCode, 200)
  assert.equal(postDumpCalls.length, 1)
  assert.deepStrictEqual(postDumpCalls, [
    {
      dump: [
        {
          path: 'PATH1',
          counter: 10
        },
        {
          path: 'PATH2',
          counter: 20
        }
      ]
    }
  ])
})

test('dump no db operations if none are available', async (t) => {
  let postDumpDBCall = null
  const coldStorageMock = fp(async function (fastify, opts) {
    fastify.addHook('onRequest', function (req, reply, done) {
      req.coldStorage = {
        getStatus: async () => {
          return {
            isImporter: false,
            isExporter: true
          }
        },
        postPathsDump: async (_dump) => {},
        postDbDump: async (_dump) => {
          postDumpDBCall = 'POST DB OPERATIONS DUMP'
        },
        postLatenciesDump: async (_dump) => {
          return { ok: true }
        }
      }
      done()
    })
  })

  const fastify = await setupServer(t, [coldStorageMock])
  const res = await fastify.inject({
    method: 'GET',
    url: '/dump'
  })

  assert.equal(res.statusCode, 200)
  assert.deepStrictEqual(postDumpDBCall, null)
})

test('dump db operations', async (t) => {
  const postDumpDBCalls = []
  const coldStorageMock = fp(async function (fastify, opts) {
    fastify.addHook('onRequest', function (req, reply, done) {
      req.coldStorage = {
        getStatus: async () => {
          return {
            isImporter: false,
            isExporter: true
          }
        },
        postPathsDump: async (_dump) => {
          return { ok: true }
        },
        postDbDump: async (_dump) => {
          postDumpDBCalls.push(_dump)
          return { ok: true }
        },
        postLatenciesDump: async (_dump) => {
          return { ok: true }
        }
      }
      done()
    })
  })

  const fastify = await setupServer(t, [coldStorageMock])

  // Insert some data
  const paths = ['path1', 'path2']

  await fastify.store.storeDBOperations([{
    tables: ['mytable'],
    columns: ['mycolumn'],
    queryType: 'SELECT',
    targetTable: null,
    host: 'localhost',
    port: 5432,
    dbSystem: 'postgresql',
    dbName: 'mydb'
  }], paths)

  await fastify.store.storeDBOperations([{
    tables: ['mytable2'],
    columns: ['mycolumn2'],
    queryType: 'INSERT',
    targetTable: 'mytable2',
    dbName: 'mydb',
    host: 'localhost',
    port: 5432,
    dbSystem: 'postgresql'
  }], paths)

  const res = await fastify.inject({
    method: 'GET',
    url: '/dump'
  })

  assert.equal(res.statusCode, 200)
  assert.equal(postDumpDBCalls.length, 1)
  assert.deepStrictEqual(postDumpDBCalls[0],
    {
      dump: [
        {
          dbId: 'dbns:[localhost:5432:mydb]',
          host: 'localhost',
          port: 5432,
          dbSystem: 'postgresql',
          dbName: 'mydb',
          tables: [
            'mytable'
          ],
          columns: [
            'mycolumn'
          ],
          queryType: 'SELECT',
          targetTable: null,

          paths: [
            'path1',
            'path2'
          ]
        },
        {
          dbId: 'dbns:[localhost:5432:mydb]',
          host: 'localhost',
          port: 5432,
          dbName: 'mydb',
          dbSystem: 'postgresql',
          tables: [
            'mytable2'
          ],
          columns: [
            'mycolumn2'
          ],
          queryType: 'INSERT',
          targetTable: 'mytable2',
          paths: [
            'path1',
            'path2'
          ]
        }
      ]
    }
  )
})

test('dump no latencies if none are available', async (t) => {
  let postDumpLatencies = null
  const coldStorageMock = fp(async function (fastify, opts) {
    fastify.addHook('onRequest', function (req, reply, done) {
      req.coldStorage = {
        getStatus: async () => {
          return {
            isImporter: false,
            isExporter: true
          }
        },
        postPathsDump: async (_dump) => {},
        postDbDump: async (_dump) => {},
        postLatenciesDump: async (_dump) => {
          postDumpLatencies = 'POST LATENCIES DUMP'
        }
      }
      done()
    })
  })

  const fastify = await setupServer(t, [coldStorageMock])
  const res = await fastify.inject({
    method: 'GET',
    url: '/dump'
  })

  assert.equal(res.statusCode, 200)
  assert.deepStrictEqual(postDumpLatencies, null)
})

test('dump returns 503 when isImporter is true', async (t) => {
  const coldStorageMock = fp(async function (fastify, opts) {
    fastify.addHook('onRequest', function (req, reply, done) {
      req.coldStorage = {
        getStatus: async () => ({ isImporter: true, isExporter: false })
      }
      done()
    })
  })

  const fastify = await setupServer(t, [coldStorageMock])
  const res = await fastify.inject({ method: 'GET', url: '/dump' })

  assert.equal(res.statusCode, 503)
  assert.deepStrictEqual(res.json(), {
    error: 'Service Unavailable',
    message: 'Dump operation is disabled when risk-cold-storage is configured as an importer'
  })
})

test('dump latencies', async (t) => {
  const postDumpCalls = []
  const coldStorageMock = fp(async function (fastify, opts) {
    fastify.addHook('onRequest', function (req, reply, done) {
      req.coldStorage = {
        getStatus: async () => {
          return {
            isImporter: false,
            isExporter: true
          }
        },
        postPathsDump: async (_dump) => {},
        postLatenciesDump: async (_dump) => {
          postDumpCalls.push(_dump)
          return { ok: true }
        }
      }
      done()
    })
  })

  const fastify = await setupServer(t, [coldStorageMock])

  // Insert some data
  const latencies = {
    '||A': [100, 200],
    'A||B': [200, 300, 400]
  }

  await fastify.store.storeLatencies(latencies)

  const res = await fastify.inject({
    method: 'GET',
    url: '/dump'
  })

  assert.equal(res.statusCode, 200)
  assert.equal(postDumpCalls.length, 1)
  assert.deepStrictEqual(postDumpCalls[0].dump.sort(compare), [
    {
      from: '',
      to: 'A',
      mean: 150,
      count: 2
    }, {
      from: 'A',
      to: 'B',
      mean: 300,
      count: 3
    }].sort(compare)
  )
})
