'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const { buildServer, startMachinist } = require('../helper')

function makeServiceSamples (eluValue, heapValue = 100, workerId = 'worker-0') {
  const now = Date.now()
  const base = Math.floor(now / 1000) * 1000
  const eluTuples = []
  const heapTuples = []
  for (let i = 5; i >= 1; i--) {
    const timestamp = base - i * 1000
    eluTuples.push([timestamp, eluValue])
    heapTuples.push([timestamp, heapValue])
  }
  return {
    elu: {
      options: { threshold: 0.75 },
      workers: { [workerId]: { values: eluTuples } }
    },
    heap: {
      options: { threshold: 250 },
      workers: { [workerId]: { values: heapTuples } }
    }
  }
}

test('GET /api/v2/application/:appId/count returns count snapshot', async (t) => {
  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const controllerId = 'controller-id'
  const namespace = 'platformatic'
  const podId = 'pod-id'

  const server = await buildServer(t, { PLT_SCALER_ALGORITHM_VERSION: 'v2' })
  t.after(async () => {
    await server.close()
  })

  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      kind: 'Controller',
      apiVersion: 'v1',
      replicas: 1
    }),
    setPodController: () => {}
  })

  {
    const { statusCode } = await server.inject({
      method: 'POST',
      url: '/controllers',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ applicationId, deploymentId, namespace, machineId: podId })
    })
    assert.strictEqual(statusCode, 200)
  }

  const predictor = server.signalScalerExecutor.predictor

  // Register an instance so getClusterState returns an imageId
  const now = Date.now()
  await predictor.registerInstance(
    applicationId, controllerId, deploymentId, podId, 'inst-1',
    now - 60000, now - 60000
  )

  // Seed the count snapshot directly in Valkey
  const expected = {
    now,
    initTimeoutMs: 30000,
    horizonMs: 36000,
    minPods: 1,
    maxPods: 10,
    history: [{ timestamp: now - 60000, count: 1 }],
    prediction: [
      { timestamp: now, count: 1 },
      { timestamp: now + 1000, count: 1 },
      { timestamp: now + 36000, count: 1 }
    ]
  }
  await predictor.store.saveCountSnapshot(
    applicationId, controllerId, deploymentId, expected, 60000
  )

  const res = await server.inject({
    method: 'GET',
    url: `/api/v2/application/${applicationId}/count`
  })
  assert.strictEqual(res.statusCode, 200)
  const body = res.json()
  assert.deepStrictEqual(body, expected)
})

test('GET /api/v2/application/:appId/service/:serviceId/metrics returns metric snapshot', async (t) => {
  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const controllerId = 'controller-id'
  const namespace = 'platformatic'
  const podId = 'pod-id'
  const serviceId = 'svc-a'

  const server = await buildServer(t, { PLT_SCALER_ALGORITHM_VERSION: 'v2' })
  t.after(async () => {
    await server.close()
  })

  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      kind: 'Controller',
      apiVersion: 'v1',
      replicas: 1
    }),
    setPodController: () => {}
  })

  {
    const { statusCode } = await server.inject({
      method: 'POST',
      url: '/controllers',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ applicationId, deploymentId, namespace, machineId: podId })
    })
    assert.strictEqual(statusCode, 200)
  }

  const predictor = server.signalScalerExecutor.predictor

  const now = Date.now()
  await predictor.registerInstance(
    applicationId, controllerId, deploymentId, podId, 'inst-1',
    now - 60000, now - 60000
  )

  // Seed both metric prediction blobs directly
  const eluBlob = {
    now,
    initTimeoutMs: 30000,
    horizonMs: 36000,
    threshold: 0.75,
    trendDirection: 'up',
    prediction: [{ timestamp: now, avg: 0.5 }]
  }
  const heapBlob = {
    now,
    initTimeoutMs: 30000,
    horizonMs: 36000,
    threshold: 250,
    trendDirection: 'horizontal',
    prediction: [{ timestamp: now, avg: 100 }]
  }
  await predictor.store.addService(applicationId, controllerId, deploymentId, serviceId)
  await predictor.store.saveMetricPrediction(applicationId, controllerId, serviceId, deploymentId, 'elu', eluBlob, 60000)
  await predictor.store.saveMetricPrediction(applicationId, controllerId, serviceId, deploymentId, 'heap', heapBlob, 60000)

  const res = await server.inject({
    method: 'GET',
    url: `/api/v2/application/${applicationId}/service/${serviceId}/metrics`
  })
  assert.strictEqual(res.statusCode, 200)
  const body = res.json()
  assert.ok(body.elu, 'expected elu in response')
  assert.ok(body.heap, 'expected heap in response')
  assert.strictEqual(body.elu.threshold, 0.75)
  assert.strictEqual(body.heap.threshold, 250)
  assert.strictEqual(body.elu.prediction[0].avg, 0.5)
  // count and sum must not appear in per-service prediction points
  assert.strictEqual(body.elu.prediction[0].count, undefined)
  assert.strictEqual(body.elu.prediction[0].sum, undefined)
})

test('GET /api/v2/application/:appId/service/:serviceId/metrics omits missing metric', async (t) => {
  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const controllerId = 'controller-id'
  const namespace = 'platformatic'
  const podId = 'pod-id'
  const serviceId = 'svc-a'

  const server = await buildServer(t, { PLT_SCALER_ALGORITHM_VERSION: 'v2' })
  t.after(async () => {
    await server.close()
  })

  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      kind: 'Controller',
      apiVersion: 'v1',
      replicas: 1
    }),
    setPodController: () => {}
  })

  {
    const { statusCode } = await server.inject({
      method: 'POST',
      url: '/controllers',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ applicationId, deploymentId, namespace, machineId: podId })
    })
    assert.strictEqual(statusCode, 200)
  }

  const predictor = server.signalScalerExecutor.predictor

  const now = Date.now()
  await predictor.registerInstance(
    applicationId, controllerId, deploymentId, podId, 'inst-1',
    now - 60000, now - 60000
  )

  // Seed only the ELU blob — heap intentionally missing
  const eluBlob = {
    now,
    initTimeoutMs: 30000,
    horizonMs: 36000,
    threshold: 0.75,
    trendDirection: 'up',
    prediction: [{ timestamp: now, avg: 0.5 }]
  }
  await predictor.store.addService(applicationId, controllerId, deploymentId, serviceId)
  await predictor.store.saveMetricPrediction(applicationId, controllerId, serviceId, deploymentId, 'elu', eluBlob, 60000)

  const res = await server.inject({
    method: 'GET',
    url: `/api/v2/application/${applicationId}/service/${serviceId}/metrics`
  })
  assert.strictEqual(res.statusCode, 200)
  const body = res.json()
  assert.ok(body.elu, 'expected elu in response')
  assert.strictEqual('heap' in body, false, 'heap should be absent, not null')
})

test('GET /api/v2/application/:appId/service/:serviceId/metrics returns 404 when no snapshot exists', async (t) => {
  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const controllerId = 'controller-id'
  const namespace = 'platformatic'
  const podId = 'pod-id'

  const server = await buildServer(t, { PLT_SCALER_ALGORITHM_VERSION: 'v2' })
  t.after(async () => {
    await server.close()
  })

  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      kind: 'Controller',
      apiVersion: 'v1',
      replicas: 1
    }),
    setPodController: () => {}
  })

  {
    const { statusCode } = await server.inject({
      method: 'POST',
      url: '/controllers',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ applicationId, deploymentId, namespace, machineId: podId })
    })
    assert.strictEqual(statusCode, 200)
  }

  const res = await server.inject({
    method: 'GET',
    url: `/api/v2/application/${applicationId}/service/svc-missing/metrics`
  })
  assert.strictEqual(res.statusCode, 404)
})

test('GET /api/v2/application/:appId/services returns alive services with current/predicted/threshold', async (t) => {
  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const controllerId = 'controller-id'
  const namespace = 'platformatic'
  const podId = 'pod-id'

  const server = await buildServer(t, { PLT_SCALER_ALGORITHM_VERSION: 'v2' })
  t.after(async () => {
    await server.close()
  })

  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      kind: 'Controller',
      apiVersion: 'v1',
      replicas: 1
    }),
    setPodController: () => {}
  })

  {
    const { statusCode } = await server.inject({
      method: 'POST',
      url: '/controllers',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ applicationId, deploymentId, namespace, machineId: podId })
    })
    assert.strictEqual(statusCode, 200)
  }

  const predictor = server.signalScalerExecutor.predictor

  // Seed the saved services summary directly (the route reads it as-is).
  const expected = [
    {
      id: 'svc-a',
      elu: { current: 0.4, predicted: 0.6, threshold: 0.75, overloaded: false },
      heap: { current: 100, predicted: 130, threshold: 250, overloaded: false }
    },
    {
      id: 'svc-b',
      elu: { current: 0.7, predicted: 0.9, threshold: 0.75, overloaded: true }
    }
  ]
  await predictor.registerInstance(
    applicationId, controllerId, deploymentId, podId, 'inst-1',
    Date.now() - 60000, Date.now() - 60000
  )
  await predictor.store.saveServicesSummary(applicationId, controllerId, deploymentId, expected, 60000)

  const res = await server.inject({
    method: 'GET',
    url: `/api/v2/application/${applicationId}/services`
  })
  assert.strictEqual(res.statusCode, 200)
  assert.deepStrictEqual(res.json(), expected)
})

test('GET /api/v2/application/:appId/services returns empty array when no alive services', async (t) => {
  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const controllerId = 'controller-id'
  const namespace = 'platformatic'
  const podId = 'pod-id'

  const server = await buildServer(t, { PLT_SCALER_ALGORITHM_VERSION: 'v2' })
  t.after(async () => {
    await server.close()
  })

  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      kind: 'Controller',
      apiVersion: 'v1',
      replicas: 1
    }),
    setPodController: () => {}
  })

  {
    const { statusCode } = await server.inject({
      method: 'POST',
      url: '/controllers',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ applicationId, deploymentId, namespace, machineId: podId })
    })
    assert.strictEqual(statusCode, 200)
  }

  const res = await server.inject({
    method: 'GET',
    url: `/api/v2/application/${applicationId}/services`
  })
  assert.strictEqual(res.statusCode, 200)
  assert.deepStrictEqual(res.json(), [])
})

test('GET /api/v2/application/:appId/services/elu returns elu history per service', async (t) => {
  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const controllerId = 'controller-id'
  const namespace = 'platformatic'
  const podId = 'pod-id'

  const server = await buildServer(t, { PLT_SCALER_ALGORITHM_VERSION: 'v2' })
  t.after(async () => {
    await server.close()
  })

  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      kind: 'Controller',
      apiVersion: 'v1',
      replicas: 1
    }),
    setPodController: () => {}
  })

  {
    const { statusCode } = await server.inject({
      method: 'POST',
      url: '/controllers',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ applicationId, deploymentId, namespace, machineId: podId })
    })
    assert.strictEqual(statusCode, 200)
  }

  const predictor = server.signalScalerExecutor.predictor
  const now = Date.now()

  await predictor.registerInstance(
    applicationId, controllerId, deploymentId, podId, 'inst-1',
    now - 60000, now - 60000
  )

  await predictor.saveInstanceMetrics({
    applicationId,
    controllerId,
    podId,
    instanceId: 'inst-1',
    imageId: deploymentId,
    services: {
      'svc-b': makeServiceSamples(0.4),
      'svc-a': makeServiceSamples(0.6)
    },
    batchStartedAt: now
  })
  await predictor.checkForPendingBatches(applicationId, controllerId, 1, () => {})

  const res = await server.inject({
    method: 'GET',
    url: `/api/v2/application/${applicationId}/services/elu`
  })
  assert.strictEqual(res.statusCode, 200)
  const body = res.json()
  assert.strictEqual(typeof body.now, 'number')
  assert.strictEqual(body.services.length, 2)
  // Alphabetical
  assert.strictEqual(body.services[0].id, 'svc-a')
  assert.strictEqual(body.services[1].id, 'svc-b')
  for (const entry of body.services) {
    assert.ok(entry.history.length > 0)
    for (const point of entry.history) {
      assert.strictEqual(typeof point.timestamp, 'number')
      assert.strictEqual(typeof point.avg, 'number')
      // Debug fields stripped by schema
      assert.strictEqual(point.podsCount, undefined)
      assert.strictEqual(point.stableSum, undefined)
    }
  }
})

test('GET /api/v2/application/:appId/services/elu returns 404 when no data', async (t) => {
  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const controllerId = 'controller-id'
  const namespace = 'platformatic'
  const podId = 'pod-id'

  const server = await buildServer(t, { PLT_SCALER_ALGORITHM_VERSION: 'v2' })
  t.after(async () => {
    await server.close()
  })

  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      kind: 'Controller',
      apiVersion: 'v1',
      replicas: 1
    }),
    setPodController: () => {}
  })

  {
    const { statusCode } = await server.inject({
      method: 'POST',
      url: '/controllers',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ applicationId, deploymentId, namespace, machineId: podId })
    })
    assert.strictEqual(statusCode, 200)
  }

  const res = await server.inject({
    method: 'GET',
    url: `/api/v2/application/${applicationId}/services/elu`
  })
  assert.strictEqual(res.statusCode, 404)
})

test('GET /api/v2/application/:appId/service/:serviceId/instances/metrics returns per-pod aligned series', async (t) => {
  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const controllerId = 'controller-id'
  const namespace = 'platformatic'
  const podId = 'pod-1'

  const server = await buildServer(t, { PLT_SCALER_ALGORITHM_VERSION: 'v2' })
  t.after(async () => {
    await server.close()
  })

  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      kind: 'Controller',
      apiVersion: 'v1',
      replicas: 1
    }),
    setPodController: () => {}
  })

  {
    const { statusCode } = await server.inject({
      method: 'POST',
      url: '/controllers',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ applicationId, deploymentId, namespace, machineId: podId })
    })
    assert.strictEqual(statusCode, 200)
  }

  const predictor = server.signalScalerExecutor.predictor
  const now = Date.now()

  await predictor.registerInstance(
    applicationId, controllerId, deploymentId, podId, 'inst-1',
    now - 60000, now - 60000
  )

  await predictor.saveInstanceMetrics({
    applicationId,
    controllerId,
    podId,
    instanceId: 'inst-1',
    imageId: deploymentId,
    services: { 'svc-a': makeServiceSamples(0.5, 100) },
    batchStartedAt: now
  })

  const res = await server.inject({
    method: 'GET',
    url: `/api/v2/application/${applicationId}/service/svc-a/instances/metrics`
  })
  assert.strictEqual(res.statusCode, 200)
  const body = res.json()
  assert.ok(body[podId], `expected pod ${podId} in response`)
  assert.ok(body[podId].elu.length > 0)
  assert.ok(body[podId].heap.length > 0)
  for (const point of body[podId].elu) {
    assert.strictEqual(typeof point.timestamp, 'number')
    assert.strictEqual(typeof point.value, 'number')
  }
})

test('GET /api/v2/application/:appId/service/:serviceId/instances/metrics returns 404 when no instances', async (t) => {
  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const controllerId = 'controller-id'
  const namespace = 'platformatic'
  const podId = 'pod-id'

  const server = await buildServer(t, { PLT_SCALER_ALGORITHM_VERSION: 'v2' })
  t.after(async () => {
    await server.close()
  })

  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      kind: 'Controller',
      apiVersion: 'v1',
      replicas: 1
    }),
    setPodController: () => {}
  })

  {
    const { statusCode } = await server.inject({
      method: 'POST',
      url: '/controllers',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ applicationId, deploymentId, namespace, machineId: podId })
    })
    assert.strictEqual(statusCode, 200)
  }

  const res = await server.inject({
    method: 'GET',
    url: `/api/v2/application/${applicationId}/service/svc-a/instances/metrics`
  })
  assert.strictEqual(res.statusCode, 404)
})

test('GET /api/v2/application/:appId/pods/health counts unhealthy services per pod', async (t) => {
  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const controllerId = 'controller-id'
  const namespace = 'platformatic'
  const podId = 'pod-id'

  const server = await buildServer(t, { PLT_SCALER_ALGORITHM_VERSION: 'v2' })
  t.after(async () => {
    await server.close()
  })

  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      kind: 'Controller',
      apiVersion: 'v1',
      replicas: 1
    }),
    setPodController: () => {}
  })

  {
    const { statusCode } = await server.inject({
      method: 'POST',
      url: '/controllers',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ applicationId, deploymentId, namespace, machineId: podId })
    })
    assert.strictEqual(statusCode, 200)
  }

  const predictor = server.signalScalerExecutor.predictor
  const now = Date.now()
  const startedAt = now - 60000

  await predictor.registerInstance(
    applicationId, controllerId, deploymentId, podId, 'inst-1',
    startedAt, startedAt
  )

  // makeServiceSamples uses thresholds: elu=0.75, heap=250 (saved to store automatically).
  // svc-cool: below both thresholds; svc-hot-elu: ELU above; svc-hot-heap: heap above.
  await predictor.saveInstanceMetrics({
    applicationId,
    controllerId,
    podId,
    instanceId: 'inst-1',
    imageId: deploymentId,
    services: {
      'svc-cool': makeServiceSamples(0.4, 100),
      'svc-hot-elu': makeServiceSamples(0.9, 100),
      'svc-hot-heap': makeServiceSamples(0.4, 400)
    },
    batchStartedAt: now
  })

  const res = await server.inject({
    method: 'GET',
    url: `/api/v2/application/${applicationId}/pods/health`
  })
  assert.strictEqual(res.statusCode, 200)
  const body = res.json()
  assert.strictEqual(body.servicesCount, 3)
  assert.deepStrictEqual(body.pods[podId], {
    startedAt,
    unhealthyServicesCount: 2
  })
})

test('GET /api/v2/application/:appId/pods/health returns empty pods when no instances', async (t) => {
  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const controllerId = 'controller-id'
  const namespace = 'platformatic'
  const podId = 'pod-id'

  const server = await buildServer(t, { PLT_SCALER_ALGORITHM_VERSION: 'v2' })
  t.after(async () => {
    await server.close()
  })

  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      kind: 'Controller',
      apiVersion: 'v1',
      replicas: 1
    }),
    setPodController: () => {}
  })

  {
    const { statusCode } = await server.inject({
      method: 'POST',
      url: '/controllers',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ applicationId, deploymentId, namespace, machineId: podId })
    })
    assert.strictEqual(statusCode, 200)
  }

  const res = await server.inject({
    method: 'GET',
    url: `/api/v2/application/${applicationId}/pods/health`
  })
  assert.strictEqual(res.statusCode, 200)
  assert.deepStrictEqual(res.json(), { servicesCount: 0, pods: {} })
})

test('GET /api/v2/application/:appId/count returns 404 when no snapshot exists', async (t) => {
  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const controllerId = 'controller-id'
  const namespace = 'platformatic'
  const podId = 'pod-id'

  const server = await buildServer(t, { PLT_SCALER_ALGORITHM_VERSION: 'v2' })
  t.after(async () => {
    await server.close()
  })

  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      kind: 'Controller',
      apiVersion: 'v1',
      replicas: 1
    }),
    setPodController: () => {}
  })

  {
    const { statusCode } = await server.inject({
      method: 'POST',
      url: '/controllers',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ applicationId, deploymentId, namespace, machineId: podId })
    })
    assert.strictEqual(statusCode, 200)
  }

  const res = await server.inject({
    method: 'GET',
    url: `/api/v2/application/${applicationId}/count`
  })
  assert.strictEqual(res.statusCode, 404)
})
