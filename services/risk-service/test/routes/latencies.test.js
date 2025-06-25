'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const store = require('../../plugins/store')
const env = require('../../plugins/env')
const latencies = require('../../routes/latencies')
const Fastify = require('fastify')
const fp = require('fastify-plugin')

const setupServer = async (t, plugins = []) => {
  process.env.PLT_ICC_VALKEY_CONNECTION_STRING = 'redis://localhost:6343'
  const fastify = Fastify()
  await fastify.register(env)
  await fastify.register(store)
  await fastify.register(latencies)
  await Promise.all(plugins.map((plugin) => fastify.register(plugin)))
  await fastify.ready()

  t.after(async () => {
    await fastify.store.flushAll()
    await fastify.close()
  })
  return fastify
}

const compare = (a, b) => a.from - b.from

test('get no latencies if none are available', async (t) => {
  const coldStorageMock = fp(async function (fastify, opts) {
    fastify.addHook('onRequest', function (req, reply, done) {
      req.coldStorage = {
        getStatus: async () => {
          return {
            isImporter: false,
            isExporter: true
          }
        },
        getLatenciesWindow: async () => {
          return []
        }
      }
      done()
    })
  })

  const fastify = await setupServer(t, [coldStorageMock])
  const { body, statusCode } = await fastify.inject({
    method: 'GET',
    url: '/latencies'
  })
  const res = JSON.parse(body)

  assert.equal(statusCode, 200)
  assert.deepStrictEqual(res, [])
})

test('get the latencies from redis', async (t) => {
  const coldStorageMock = fp(async function (fastify, opts) {
    fastify.addHook('onRequest', function (req, reply, done) {
      req.coldStorage = {
        getStatus: async () => {
          return {
            isImporter: false,
            isExporter: true
          }
        },
        getLatenciesWindow: async () => {
          return []
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

  const { body, statusCode } = await fastify.inject({
    method: 'GET',
    url: '/latencies'
  })
  const res = JSON.parse(body)

  assert.equal(statusCode, 200)
  assert.equal(res.length, 2)
  const first = res.find((l) => l.from === '')
  const second = res.find((l) => l.from === 'A')
  assert.deepStrictEqual(first, {
    count: 2,
    from: '',
    mean: 150,
    to: 'A'
  })
  assert.deepStrictEqual(second, {
    count: 3,
    from: 'A',
    mean: 300,
    to: 'B'
  })
})

test('get the latencies from cold storage', async (t) => {
  const coldStorageMock = fp(async function (fastify, opts) {
    fastify.addHook('onRequest', function (req, reply, done) {
      req.coldStorage = {
        getStatus: async () => {
          return {
            isImporter: false,
            isExporter: true
          }
        },
        getLatenciesWindow: async () => {
          return [
            {
              from: '',
              to: 'A',
              mean: 1000,
              count: 2
            },
            {
              from: 'A',
              to: 'B',
              mean: 2000,
              count: 4
            }
          ]
        }
      }
      done()
    })
  })

  const fastify = await setupServer(t, [coldStorageMock])

  const { body, statusCode } = await fastify.inject({
    method: 'GET',
    url: '/latencies'
  })
  const res = JSON.parse(body)

  assert.equal(statusCode, 200)
  assert.deepStrictEqual(res.sort(compare), [
    {
      count: 2,
      from: '',
      mean: 1000,
      to: 'A'
    },
    {
      count: 4,
      from: 'A',
      mean: 2000,
      to: 'B'
    }
  ].sort(compare))
})

test('get the latencies from cold storage AND redis, calculating the correct means', async (t) => {
  const coldStorageMock = fp(async function (fastify, opts) {
    fastify.addHook('onRequest', function (req, reply, done) {
      req.coldStorage = {
        getStatus: async () => {
          return {
            isImporter: false,
            isExporter: true
          }
        },
        getLatenciesWindow: async () => {
          return [
            {
              from: '',
              to: 'A',
              mean: 1000,
              count: 2
            },
            {
              from: 'A',
              to: 'B',
              mean: 1000,
              count: 4
            }
          ]
        }
      }
      done()
    })
  })

  const fastify = await setupServer(t, [coldStorageMock])

  // Insert some data
  const latencies = {
    '||A': [100, 200],
    'A||B': [200, 300]
  }

  await fastify.store.storeLatencies(latencies)

  const { body, statusCode } = await fastify.inject({
    method: 'GET',
    url: '/latencies'
  })
  const res = JSON.parse(body)

  assert.equal(statusCode, 200)
  assert.deepStrictEqual(res.sort(compare), [
    {
      count: 4,
      from: '',
      mean: 575,
      to: 'A'
    },
    {
      count: 6,
      from: 'A',
      mean: 750,
      to: 'B'
    }
  ].sort())
})

test('get latencies only from cold storage when isImporter is true', async (t) => {
  const coldStorageMock = fp(async function (fastify, opts) {
    fastify.addHook('onRequest', function (req, reply, done) {
      req.coldStorage = {
        getStatus: async () => {
          return {
            isImporter: true,
            isExporter: false
          }
        },
        getLatenciesWindow: async () => {
          return [
            {
              from: '',
              to: 'A',
              mean: 1000,
              count: 2
            },
            {
              from: 'A',
              to: 'B',
              mean: 1000,
              count: 4
            }
          ]
        }
      }
      done()
    })
  })

  const fastify = await setupServer(t, [coldStorageMock])

  // Insert some data in Redis - this should be ignored when isImporter is true
  const latencies = {
    '||A': [100, 200],
    'A||B': [200, 300]
  }

  await fastify.store.storeLatencies(latencies)

  const { body, statusCode } = await fastify.inject({
    method: 'GET',
    url: '/latencies'
  })
  const res = JSON.parse(body)

  assert.equal(statusCode, 200)
  // Should only return cold storage data, ignoring Redis data
  assert.deepStrictEqual(res.sort(compare), [
    {
      count: 2,
      from: '',
      mean: 1000,
      to: 'A'
    },
    {
      count: 4,
      from: 'A',
      mean: 1000,
      to: 'B'
    }
  ].sort(compare))
})
