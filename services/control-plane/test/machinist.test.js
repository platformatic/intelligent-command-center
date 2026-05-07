'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const Fastify = require('fastify')
const fp = require('fastify-plugin')
const machinistPlugin = require('../plugins/machinist')

const ctx = { logger: { info () {}, error () {}, warn () {}, debug () {} } }

async function startMockMachinist (t, handlers = {}) {
  const machinist = Fastify({ logger: false })

  machinist.get('/k8s/machines/:namespace/:id', async (req) => {
    handlers.onGetMachine?.(req.params)
    return handlers.machineResponse ?? {
      id: req.params.id,
      status: 'Running',
      image: 'myapp:latest',
      labels: {},
      controller: { name: 'my-controller' }
    }
  })

  machinist.get('/k8s/machines/:namespace', async (req) => {
    handlers.onGetMachines?.({ namespace: req.params.namespace, query: req.query })
    return handlers.machinesResponse ?? []
  })

  machinist.patch('/k8s/machines/:namespace/:id/labels', async (req) => {
    handlers.onSetMachineLabels?.({ namespace: req.params.namespace, id: req.params.id, body: req.body })
    return { labels: req.body.labels }
  })

  machinist.get('/k8s/services/:namespace', async (req) => {
    handlers.onGetServicesByLabels?.({ namespace: req.params.namespace, query: req.query })
    return handlers.servicesResponse ?? []
  })

  machinist.post('/k8s/controllers/:namespace/:name', async (req) => {
    handlers.onUpdateControllerReplicas?.({
      namespace: req.params.namespace,
      name: req.params.name,
      body: req.body,
      query: req.query
    })
    return { name: req.params.name, replicas: req.body.replicas, labels: {} }
  })

  machinist.delete('/k8s/controllers/:namespace/:name', async (req) => {
    handlers.onDeleteController?.({
      namespace: req.params.namespace,
      name: req.params.name,
      query: req.query
    })
    return { status: 'Success' }
  })

  machinist.delete('/k8s/services/:namespace/:name', async (req) => {
    handlers.onDeleteService?.({ namespace: req.params.namespace, name: req.params.name })
    return { status: 'Success' }
  })

  await machinist.listen({ host: '127.0.0.1', port: 0 })
  t.after(() => machinist.close())

  const address = `http://127.0.0.1:${machinist.server.address().port}`
  return { machinist, address }
}

async function buildClient (t, address) {
  const app = Fastify({ logger: false })
  await app.register(fp(async (app) => {
    app.decorate('env', {
      PLT_MACHINIST_URL: address,
      PLT_MACHINIST_PROVIDER: 'k8s'
    })
  }, { name: 'env' }))
  await app.register(machinistPlugin)
  t.after(() => app.close())
  return app
}

test('getMachine sends namespace as path param 1, machineId as param 2', async (t) => {
  let received
  const { address } = await startMockMachinist(t, {
    onGetMachine: (params) => { received = params }
  })
  const app = await buildClient(t, address)

  await app.machinist.getMachine('platformatic', 'my-pod-abc', ctx)

  assert.strictEqual(received.namespace, 'platformatic')
  assert.strictEqual(received.id, 'my-pod-abc')
})

test('getMachines sends namespace as path param, labels as query', async (t) => {
  let received
  const { address } = await startMockMachinist(t, {
    onGetMachines: (data) => { received = data },
    machinesResponse: []
  })
  const app = await buildClient(t, address)

  await app.machinist.getMachines('platformatic', { 'app.kubernetes.io/name': 'myapp', env: 'prod' }, ctx)

  assert.strictEqual(received.namespace, 'platformatic')
  assert.deepStrictEqual(received.query.labels, ['app.kubernetes.io/name=myapp', 'env=prod'])
})

test('setMachineLabels sends namespace as param 1, machineId as param 2', async (t) => {
  let received
  const { address } = await startMockMachinist(t, {
    onSetMachineLabels: (data) => { received = data }
  })
  const app = await buildClient(t, address)

  await app.machinist.setMachineLabels('platformatic', 'my-pod-xyz', { foo: 'bar' }, ctx)

  assert.strictEqual(received.namespace, 'platformatic')
  assert.strictEqual(received.id, 'my-pod-xyz')
  assert.deepStrictEqual(received.body, { labels: { foo: 'bar' } })
})

test('getServicesByLabels sends namespace as path param, labels as query', async (t) => {
  let received
  const { address } = await startMockMachinist(t, {
    onGetServicesByLabels: (data) => { received = data },
    servicesResponse: []
  })
  const app = await buildClient(t, address)

  await app.machinist.getServicesByLabels('platformatic', { 'app.kubernetes.io/name': 'myapp', env: 'prod' }, ctx)

  assert.strictEqual(received.namespace, 'platformatic')
  assert.deepStrictEqual(received.query.labels, ['app.kubernetes.io/name=myapp', 'env=prod'])
})

test('updateControllerReplicas sends replicas in body, providerMetadata as query', async (t) => {
  let received
  const { address } = await startMockMachinist(t, {
    onUpdateControllerReplicas: (data) => { received = data }
  })
  const app = await buildClient(t, address)

  await app.machinist.updateControllerReplicas(
    'platformatic',
    'my-controller',
    5,
    { kind: 'Deployment', apiVersion: 'apps/v1' },
    ctx
  )

  assert.strictEqual(received.namespace, 'platformatic')
  assert.strictEqual(received.name, 'my-controller')
  assert.deepStrictEqual(received.body, { replicas: 5 })
  assert.strictEqual(received.query?.kind, 'Deployment')
  assert.strictEqual(received.query?.apiVersion, 'apps/v1')
})

test('deleteController sends providerMetadata as query string', async (t) => {
  let received
  const { address } = await startMockMachinist(t, {
    onDeleteController: (data) => { received = data }
  })
  const app = await buildClient(t, address)

  await app.machinist.deleteController(
    'platformatic',
    'my-controller',
    { kind: 'Deployment', apiVersion: 'apps/v1' },
    ctx
  )

  assert.strictEqual(received.namespace, 'platformatic')
  assert.strictEqual(received.name, 'my-controller')
  assert.strictEqual(received.query?.kind, 'Deployment')
  assert.strictEqual(received.query?.apiVersion, 'apps/v1')
})

test('deleteService hits /k8s/services/:namespace/:name', async (t) => {
  let received
  const { address } = await startMockMachinist(t, {
    onDeleteService: (data) => { received = data }
  })
  const app = await buildClient(t, address)

  await app.machinist.deleteService('platformatic', 'my-svc', ctx)

  assert.strictEqual(received.namespace, 'platformatic')
  assert.strictEqual(received.name, 'my-svc')
})

test('URL prefix uses PLT_MACHINIST_PROVIDER env var', async (t) => {
  const machinist = Fastify({ logger: false })
  let hit = null
  machinist.get('/ecs/machines/my-cluster/task-id', async () => {
    hit = 'ecs'
    return {}
  })
  await machinist.listen({ host: '127.0.0.1', port: 0 })
  t.after(() => machinist.close())

  const address = `http://127.0.0.1:${machinist.server.address().port}`
  const app = Fastify({ logger: false })
  await app.register(fp(async (app) => {
    app.decorate('env', {
      PLT_MACHINIST_URL: address,
      PLT_MACHINIST_PROVIDER: 'ecs'
    })
  }, { name: 'env' }))
  await app.register(machinistPlugin)
  t.after(() => app.close())

  await app.machinist.getMachine('my-cluster', 'task-id', ctx)
  assert.strictEqual(hit, 'ecs')
})
