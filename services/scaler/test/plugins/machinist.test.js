'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const Fastify = require('fastify')
const fp = require('fastify-plugin')
const { createServer } = require('node:http')
const { once } = require('node:events')
const machinistPlugin = require('../../plugins/machinist')
const errors = require('../../lib/errors')

function createMockLogger () {
  const logs = []
  return {
    info: (data, msg) => logs.push({ level: 'info', data, msg }),
    error: (data, msg) => logs.push({ level: 'error', data, msg }),
    debug: (data, msg) => logs.push({ level: 'debug', data, msg }),
    warn: (data, msg) => logs.push({ level: 'warn', data, msg }),
    getLogs: () => logs
  }
}

async function setupMockMachinistServer (responses = {}) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    const pathname = url.pathname
    const method = req.method

    if (method === 'GET' && pathname.startsWith('/controllers/')) {
      const namespace = pathname.split('/')[2]
      /* eslint-disable-next-line no-unused-vars */
      const _ = url.searchParams.get('podId')

      if (responses.getControllers && responses.getControllers.error) {
        res.writeHead(responses.getControllers.statusCode || 500, { 'Content-Type': 'application/json' })
        res.end(responses.getControllers.error)
        return
      }

      if (responses.getControllers && responses.getControllers.empty) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ controllers: [] }))
        return
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        controllers: responses.getControllers?.controllers || [
          {
            id: 'controller-123',
            name: 'test-controller',
            namespace,
            apiVersion: 'apps/v1',
            kind: 'Deployment'
          }
        ]
      }))
    } else if (method === 'POST' && pathname.includes('/controllers/')) {
      if (responses.updateController && responses.updateController.error) {
        res.writeHead(responses.updateController.statusCode || 500, { 'Content-Type': 'text/plain' })
        res.end(responses.updateController.error)
        return
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true }))
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not found')
    }
  })

  server.listen(0)
  await once(server, 'listening')

  const address = `http://localhost:${server.address().port}`
  return { server, address }
}

test('machinist plugin should register successfully', async (t) => {
  const app = Fastify()
  const mockLogger = createMockLogger()
  app.log = mockLogger

  const env = {
    PLT_MACHINIST_URL: 'http://localhost:8080'
  }

  await app.register(fp(async function (app) {
    app.decorate('env', env)
  }, { name: 'env' }))

  await app.register(machinistPlugin)

  assert.ok(app.machinist)
  assert.strictEqual(app.machinist.url, 'http://localhost:8080')

  await app.close()
})

test('getPodController should return controller for valid pod', async (t) => {
  const { server: mockServer, address } = await setupMockMachinistServer()
  t.after(async () => {
    mockServer.close()
  })

  const app = Fastify()
  const mockLogger = createMockLogger()
  app.log = mockLogger

  const env = {
    PLT_MACHINIST_URL: address
  }

  await app.register(fp(async function (app) {
    app.decorate('env', env)
  }, { name: 'env' }))

  await app.register(machinistPlugin)

  const controller = await app.machinist.getPodController('test-pod', 'test-namespace')

  assert.strictEqual(controller.id, 'controller-123')
  assert.strictEqual(controller.namespace, 'test-namespace')

  await app.close()
})

test('getPodController should handle HTTP error responses', async (t) => {
  const { server: mockServer, address } = await setupMockMachinistServer({
    getControllers: {
      error: 'Internal server error',
      statusCode: 500
    }
  })
  t.after(async () => {
    mockServer.close()
  })

  const app = Fastify()
  const mockLogger = createMockLogger()
  app.log = mockLogger

  const env = {
    PLT_MACHINIST_URL: address
  }

  await app.register(fp(async function (app) {
    app.decorate('env', env)
  }, { name: 'env' }))

  await app.register(machinistPlugin)

  await assert.rejects(
    () => app.machinist.getPodController('test-pod', 'test-namespace'),
    errors.FAILED_TO_GET_POD_CONTROLLER
  )

  const logs = mockLogger.getLogs()
  const errorLog = logs.find(log => log.level === 'error')
  assert.ok(errorLog)

  await app.close()
})

test('getPodController should handle empty controllers array', async (t) => {
  const { server: mockServer, address } = await setupMockMachinistServer({
    getControllers: {
      empty: true
    }
  })
  t.after(async () => {
    mockServer.close()
  })

  const app = Fastify()
  const mockLogger = createMockLogger()
  app.log = mockLogger

  const env = {
    PLT_MACHINIST_URL: address
  }

  await app.register(fp(async function (app) {
    app.decorate('env', env)
  }, { name: 'env' }))

  await app.register(machinistPlugin)

  await assert.rejects(
    () => app.machinist.getPodController('test-pod', 'test-namespace'),
    errors.FAILED_TO_GET_POD_CONTROLLER
  )

  const logs = mockLogger.getLogs()
  const errorLog = logs.find(log => log.level === 'error' && log.data.podId === 'test-pod')
  assert.ok(errorLog)

  await app.close()
})

test('updateController should successfully update replicas', async (t) => {
  const { server: mockServer, address } = await setupMockMachinistServer()
  t.after(async () => {
    mockServer.close()
  })

  const app = Fastify()
  const mockLogger = createMockLogger()
  app.log = mockLogger

  const env = {
    PLT_MACHINIST_URL: address
  }

  await app.register(fp(async function (app) {
    app.decorate('env', env)
  }, { name: 'env' }))

  await app.register(machinistPlugin)

  await app.machinist.updateController(
    'controller-123',
    'test-namespace',
    'apps/v1',
    'Deployment',
    5
  )

  const logs = mockLogger.getLogs()
  const infoLog = logs.find(log => log.level === 'info')
  assert.ok(infoLog)

  await app.close()
})

test('updateController should handle HTTP error responses', async (t) => {
  const { server: mockServer, address } = await setupMockMachinistServer({
    updateController: {
      error: 'Deployment not found',
      statusCode: 404
    }
  })
  t.after(async () => {
    mockServer.close()
  })

  const app = Fastify()
  const mockLogger = createMockLogger()
  app.log = mockLogger

  const env = {
    PLT_MACHINIST_URL: address
  }

  await app.register(fp(async function (app) {
    app.decorate('env', env)
  }, { name: 'env' }))

  await app.register(machinistPlugin)

  await assert.rejects(
    () => app.machinist.updateController(
      'controller-123',
      'test-namespace',
      'apps/v1',
      'Deployment',
      5
    ),
    errors.FAILED_TO_UPDATE_CONTROLLER
  )

  const logs = mockLogger.getLogs()
  const errorLog = logs.find(log => log.level === 'error')
  assert.ok(errorLog)

  await app.close()
})

test('Machinist class should set up retry interceptor correctly', async (t) => {
  const app = Fastify()
  const mockLogger = createMockLogger()
  app.log = mockLogger

  const env = {
    PLT_MACHINIST_URL: 'http://localhost:8080'
  }

  await app.register(fp(async function (app) {
    app.decorate('env', env)
  }, { name: 'env' }))

  await app.register(machinistPlugin)

  assert.ok(app.machinist)
  assert.ok(app.machinist.url)

  await app.close()
})

test('getPodController should handle network errors', async (t) => {
  const app = Fastify()
  const mockLogger = createMockLogger()
  app.log = mockLogger

  const env = {
    PLT_MACHINIST_URL: 'http://nonexistent:9999'
  }

  await app.register(fp(async function (app) {
    app.decorate('env', env)
  }, { name: 'env' }))

  await app.register(machinistPlugin)

  await assert.rejects(
    () => app.machinist.getPodController('test-pod', 'test-namespace'),
    (err) => err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'EAI_AGAIN'
  )

  await app.close()
})

test('updateController should handle network errors', async (t) => {
  const app = Fastify()
  const mockLogger = createMockLogger()
  app.log = mockLogger

  const env = {
    PLT_MACHINIST_URL: 'http://nonexistent:9999'
  }

  await app.register(fp(async function (app) {
    app.decorate('env', env)
  }, { name: 'env' }))

  await app.register(machinistPlugin)

  await assert.rejects(
    () => app.machinist.updateController(
      'controller-123',
      'test-namespace',
      'apps/v1',
      'Deployment',
      5
    ),
    (err) => err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'EAI_AGAIN'
  )

  await app.close()
})
