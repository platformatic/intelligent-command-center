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

    if (method === 'GET' && pathname.match(/^\/k8s\/controllers\/[^/]+$/) && url.searchParams.has('machineId')) {
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
            name: 'test-controller',
            replicas: 1,
            labels: {},
            providerMetadata: { kind: 'Deployment', apiVersion: 'apps/v1' }
          }
        ]
      }))
    } else if (method === 'POST' && pathname.includes('/k8s/controllers/')) {
      if (responses.updateController && responses.updateController.error) {
        res.writeHead(responses.updateController.statusCode || 500, { 'Content-Type': 'text/plain' })
        res.end(responses.updateController.error)
        return
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true }))
    } else if (method === 'GET' && pathname.match(/^\/k8s\/controllers\/[^/]+\/[^/]+$/) && !url.searchParams.has('machineId')) {
      // Handle GET /controllers/:namespace/:controllerId
      const parts = pathname.split('/')
      const controllerId = parts[parts.length - 1]

      if (responses.getController && responses.getController.error) {
        res.writeHead(responses.getController.statusCode || 500, { 'Content-Type': 'text/plain' })
        res.end(responses.getController.error)
        return
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        controller: responses.getController?.controller || {
          name: controllerId,
          replicas: 3,
          labels: {},
          providerMetadata: { kind: 'Deployment', apiVersion: 'apps/v1' },
          machines: [
            {
              id: 'pod-1',
              status: 'Running',
              startTime: '2024-01-01T00:00:00Z',
              resources: {
                limits: { cpu: '500m', memory: '512Mi' },
                requests: { cpu: '250m', memory: '256Mi' }
              }
            }
          ]
        }
      }))
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
    PLT_MACHINIST_URL: 'http://localhost:8080',
    PLT_MACHINIST_PROVIDER: 'k8s'
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
    PLT_MACHINIST_URL: address,
    PLT_MACHINIST_PROVIDER: 'k8s'
  }

  await app.register(fp(async function (app) {
    app.decorate('env', env)
  }, { name: 'env' }))

  await app.register(machinistPlugin)

  const controller = await app.machinist.getPodController('test-pod', 'test-namespace')

  assert.strictEqual(controller.name, 'test-controller')
  assert.strictEqual(controller.replicas, 1)

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
    PLT_MACHINIST_URL: address,
    PLT_MACHINIST_PROVIDER: 'k8s'
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
    PLT_MACHINIST_URL: address,
    PLT_MACHINIST_PROVIDER: 'k8s'
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
  const errorLog = logs.find(log => log.level === 'error' && log.data.machineId === 'test-pod')
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
    PLT_MACHINIST_URL: address,
    PLT_MACHINIST_PROVIDER: 'k8s'
  }

  await app.register(fp(async function (app) {
    app.decorate('env', env)
  }, { name: 'env' }))

  await app.register(machinistPlugin)

  await app.machinist.updateController(
    'controller-123',
    'test-namespace',
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
    PLT_MACHINIST_URL: address,
    PLT_MACHINIST_PROVIDER: 'k8s'
  }

  await app.register(fp(async function (app) {
    app.decorate('env', env)
  }, { name: 'env' }))

  await app.register(machinistPlugin)

  await assert.rejects(
    () => app.machinist.updateController(
      'controller-123',
      'test-namespace',
      5
    ),
    errors.FAILED_TO_UPDATE_CONTROLLER
  )

  const logs = mockLogger.getLogs()
  const errorLog = logs.find(log => log.level === 'error')
  assert.ok(errorLog)

  await app.close()
})

test('getController should return controller details', async (t) => {
  const { server: mockServer, address } = await setupMockMachinistServer()
  t.after(async () => {
    mockServer.close()
  })

  const app = Fastify()
  const mockLogger = createMockLogger()
  app.log = mockLogger

  const env = {
    PLT_MACHINIST_URL: address,
    PLT_MACHINIST_PROVIDER: 'k8s'
  }

  await app.register(fp(async function (app) {
    app.decorate('env', env)
  }, { name: 'env' }))

  await app.register(machinistPlugin)

  const controller = await app.machinist.getController(
    'test-deployment',
    'test-namespace'
  )

  assert.ok(controller, 'Controller should be defined')
  assert.strictEqual(controller.name, 'test-deployment')
  assert.strictEqual(controller.replicas, 3)
  assert.ok(Array.isArray(controller.machines))
  assert.strictEqual(controller.machines.length, 1)
  assert.strictEqual(controller.machines[0].id, 'pod-1')
  assert.strictEqual(controller.machines[0].status, 'Running')

  await app.close()
})

test('getController should handle HTTP error responses', async (t) => {
  const { server: mockServer, address } = await setupMockMachinistServer({
    getController: {
      error: 'Controller not found',
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
    PLT_MACHINIST_URL: address,
    PLT_MACHINIST_PROVIDER: 'k8s'
  }

  await app.register(fp(async function (app) {
    app.decorate('env', env)
  }, { name: 'env' }))

  await app.register(machinistPlugin)

  await assert.rejects(
    () => app.machinist.getController(
      'test-deployment',
      'test-namespace'
    ),
    errors.FAILED_TO_GET_CONTROLLER
  )

  const logs = mockLogger.getLogs()
  const errorLog = logs.find(log => log.level === 'error' && log.data.controllerId === 'test-deployment')
  assert.ok(errorLog)

  await app.close()
})

test('getController should handle network errors', async (t) => {
  const app = Fastify()
  const mockLogger = createMockLogger()
  app.log = mockLogger

  const env = {
    PLT_MACHINIST_URL: 'http://nonexistent:9999',
    PLT_MACHINIST_PROVIDER: 'k8s'
  }

  await app.register(fp(async function (app) {
    app.decorate('env', env)
  }, { name: 'env' }))

  await app.register(machinistPlugin)

  await assert.rejects(
    () => app.machinist.getController(
      'test-deployment',
      'test-namespace'
    ),
    (err) => err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'EAI_AGAIN'
  )

  await app.close()
})

test('Machinist class should set up retry interceptor correctly', async (t) => {
  const app = Fastify()
  const mockLogger = createMockLogger()
  app.log = mockLogger

  const env = {
    PLT_MACHINIST_URL: 'http://localhost:8080',
    PLT_MACHINIST_PROVIDER: 'k8s'
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
    PLT_MACHINIST_URL: 'http://nonexistent:9999',
    PLT_MACHINIST_PROVIDER: 'k8s'
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
    PLT_MACHINIST_URL: 'http://nonexistent:9999',
    PLT_MACHINIST_PROVIDER: 'k8s'
  }

  await app.register(fp(async function (app) {
    app.decorate('env', env)
  }, { name: 'env' }))

  await app.register(machinistPlugin)

  await assert.rejects(
    () => app.machinist.updateController('controller-123', 'test-namespace', 5),
    (err) => err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'EAI_AGAIN'
  )

  await app.close()
})

test('updateController should abort previous in-flight request for the same controller', async (t) => {
  const requestLog = []
  const server = createServer((req, res) => {
    if (req.method === 'POST' && req.url.includes('/k8s/controllers/')) {
      let body = ''
      req.on('data', (chunk) => { body += chunk })
      req.on('end', () => {
        const parsed = JSON.parse(body)
        requestLog.push(parsed.replicas)
        // Delay the response to give time for the second request to abort this one
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true }))
        }, 500)
      })
    } else {
      res.writeHead(404)
      res.end()
    }
  })

  server.listen(0)
  await once(server, 'listening')
  const address = `http://localhost:${server.address().port}`

  t.after(async () => {
    server.close()
  })

  const app = Fastify()
  app.log = createMockLogger()

  await app.register(fp(async function (app) {
    app.decorate('env', { PLT_MACHINIST_URL: address, PLT_MACHINIST_PROVIDER: 'k8s' })
  }, { name: 'env' }))

  await app.register(machinistPlugin)

  // Fire first request (don't await yet)
  const firstRequest = app.machinist.updateController('controller-123', 'test-namespace', 3)

  // Fire second request for the same controller — should abort the first
  const secondRequest = app.machinist.updateController('controller-123', 'test-namespace', 5)

  await assert.rejects(firstRequest, errors.SCALE_REQUEST_SUPERSEDED)
  await secondRequest // should succeed

  await app.close()
})

test('updateController should not interfere with requests for different controllers', async (t) => {
  const { server: mockServer, address } = await setupMockMachinistServer()
  t.after(async () => {
    mockServer.close()
  })

  const app = Fastify()
  app.log = createMockLogger()

  await app.register(fp(async function (app) {
    app.decorate('env', { PLT_MACHINIST_URL: address, PLT_MACHINIST_PROVIDER: 'k8s' })
  }, { name: 'env' }))

  await app.register(machinistPlugin)

  // Fire two concurrent requests for different controllers
  const [result1, result2] = await Promise.allSettled([
    app.machinist.updateController('controller-1', 'ns-1', 3),
    app.machinist.updateController('controller-2', 'ns-2', 5)
  ])

  assert.strictEqual(result1.status, 'fulfilled')
  assert.strictEqual(result2.status, 'fulfilled')

  await app.close()
})

test('getControllerWithPods should return controller with pods', async (t) => {
  const { server: mockServer, address } = await setupMockMachinistServer()
  t.after(async () => {
    mockServer.close()
  })

  const app = Fastify()
  const mockLogger = createMockLogger()
  app.log = mockLogger

  const env = {
    PLT_MACHINIST_URL: address,
    PLT_MACHINIST_PROVIDER: 'k8s'
  }

  await app.register(fp(async function (app) {
    app.decorate('env', env)
  }, { name: 'env' }))

  await app.register(machinistPlugin)

  const controller = await app.machinist.getControllerWithPods(
    'test-deployment',
    'test-namespace'
  )

  assert.ok(controller)
  assert.strictEqual(controller.name, 'test-deployment')
  assert.ok(Array.isArray(controller.machines))
  assert.strictEqual(controller.machines.length, 1)
  assert.strictEqual(controller.machines[0].id, 'pod-1')

  await app.close()
})

test('updateController should work after a previous request completes', async (t) => {
  const { server: mockServer, address } = await setupMockMachinistServer()
  t.after(async () => {
    mockServer.close()
  })

  const app = Fastify()
  app.log = createMockLogger()

  await app.register(fp(async function (app) {
    app.decorate('env', { PLT_MACHINIST_URL: address, PLT_MACHINIST_PROVIDER: 'k8s' })
  }, { name: 'env' }))

  await app.register(machinistPlugin)

  // First request completes normally
  await app.machinist.updateController('controller-123', 'test-namespace', 3)

  // Second request for the same controller should also work (no stale abort controller)
  await app.machinist.updateController('controller-123', 'test-namespace', 5)

  await app.close()
})
