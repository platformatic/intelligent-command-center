'use strict'

const { test, beforeEach } = require('node:test')
const { randomUUID } = require('node:crypto')
const assert = require('node:assert/strict')
const { MockAgent, setGlobalDispatcher, getGlobalDispatcher } = require('undici')
const { setTimeout: sleep } = require('node:timers/promises')
const {
  buildServer,
  generateK8sHeader,
  startMachinist,
  cleanValkeyData
} = require('../helper')

function createMetricsSamples (count, eluValue, heapValue, eluThreshold = 0.75, heapThreshold = 250) {
  const now = Date.now()
  const base = Math.floor(now / 1000) * 1000
  const eluValues = []
  const heapValues = []
  for (let i = count; i >= 1; i--) {
    const timestamp = base - i * 1000
    eluValues.push([timestamp, eluValue])
    heapValues.push([timestamp, heapValue])
  }
  return {
    elu: {
      options: { threshold: eluThreshold },
      workers: { 'worker-0': { values: eluValues } }
    },
    heap: {
      options: { threshold: heapThreshold, heapTotal: 512 },
      workers: { 'worker-0': { values: heapValues } }
    }
  }
}

beforeEach(async (t) => {
  const originalDispatcher = getGlobalDispatcher()
  const mockAgent = new MockAgent()
  setGlobalDispatcher(mockAgent)
  // Allow connections to localhost (for startMachinist)
  mockAgent.enableNetConnect(/localhost/)
  t.after(() => setGlobalDispatcher(originalDispatcher))

  // Mock control-plane requests
  const mockControlPlane = mockAgent.get('http://control-plane.plt.local')
  mockControlPlane
    .intercept({
      path: () => true,
      method: 'GET'
    })
    .reply(200, { name: 'test-app' })
    .persist()

  // Mock activities POST request
  const mockActivities = mockAgent.get('http://activities.plt.local')
  mockActivities
    .intercept({
      path: '/events',
      method: 'POST'
    })
    .reply(() => {
      return { statusCode: 201, data: {} }
    })
    .persist()
})

function mockGetInstanceByPodId (server, instances) {
  server.getInstanceByPodId = async (podId, namespace) => {
    return instances[podId] || null
  }
}

test('E2E: signal processing should return alerts for high ELU', async (t) => {
  await cleanValkeyData()

  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const podId = 'test-pod-1'
  const runtimeId = randomUUID()
  const namespace = 'platformatic'
  const controllerId = 'test-controller'

  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      namespace,
      kind: 'Deployment',
      apiVersion: 'apps/v1',
      replicas: 2
    })
  })

  const server = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v2',
    PLT_SCALER_LOCK: Math.floor(Math.random() * 1000000).toString()
  })

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  await server.inject({
    method: 'POST',
    url: '/controllers',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      applicationId,
      deploymentId,
      namespace,
      podId
    })
  })

  // Mock getInstanceByPodId to return the instance
  mockGetInstanceByPodId(server, {
    [podId]: { applicationId, deploymentId, podId, namespace, status: 'running' }
  })

  await server.platformatic.entities.applicationScaleConfig.save({
    input: {
      applicationId,
      minPods: 1,
      maxPods: 10
    }
  })

  // Initialize and connect the instance
  await server.signalScalerExecutor.initialize()
  await server.signalScalerExecutor.onConnect(applicationId, deploymentId, podId, runtimeId, Date.now() - 60000)

  // High ELU samples (0.9 > threshold 0.75) should trigger alert
  const signals = {
    'test-service': createMetricsSamples(10, 0.9, 100)
  }

  const response = await server.inject({
    method: 'POST',
    url: '/signals',
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId, namespace)
    },
    body: JSON.stringify({
      applicationId,
      runtimeId,
      signals
    })
  })

  assert.strictEqual(response.statusCode, 200)

  const body = JSON.parse(response.body)
  assert.ok(Array.isArray(body.alerts), 'Should return alerts array')
  assert.ok(body.alerts.find(a => a.serviceId === 'test-service'), 'Should have alert for high ELU service')

  // Verify alert was created in database
  const alerts = await server.platformatic.entities.alert.find({
    where: {
      applicationId: { eq: applicationId },
      podId: { eq: podId }
    }
  })

  assert.ok(alerts.length > 0, 'Should create alert in database')
  assert.strictEqual(alerts[0].applicationId, applicationId)
  assert.strictEqual(alerts[0].serviceId, 'test-service')
  assert.strictEqual(alerts[0].podId, podId)
})

test('E2E: signal processing should not create alerts for low metrics', async (t) => {
  await cleanValkeyData()

  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const podId = 'test-pod-1'
  const runtimeId = randomUUID()
  const namespace = 'platformatic'
  const controllerId = 'test-controller'

  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      namespace,
      kind: 'Deployment',
      apiVersion: 'apps/v1',
      replicas: 2
    })
  })

  const server = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v2',
    PLT_SCALER_LOCK: Math.floor(Math.random() * 1000000).toString()
  })

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  await server.inject({
    method: 'POST',
    url: '/controllers',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      applicationId,
      deploymentId,
      namespace,
      podId
    })
  })

  // Mock getInstanceByPodId
  mockGetInstanceByPodId(server, {
    [podId]: { applicationId, deploymentId, podId, namespace, status: 'running' }
  })

  await server.signalScalerExecutor.initialize()
  await server.signalScalerExecutor.onConnect(applicationId, deploymentId, podId, runtimeId, Date.now() - 60000)

  // Low ELU samples (0.3 < threshold 0.75) should NOT trigger alert
  const signals = {
    'test-service': createMetricsSamples(10, 0.3, 50)
  }

  const response = await server.inject({
    method: 'POST',
    url: '/signals',
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId, namespace)
    },
    body: JSON.stringify({
      applicationId,
      runtimeId,
      signals
    })
  })

  assert.strictEqual(response.statusCode, 200)

  const body = JSON.parse(response.body)
  assert.ok(Array.isArray(body.alerts), 'Should return alerts array')
  assert.deepStrictEqual(body.alerts, [], 'Should have no alerts for low metrics')

  // Verify no alert was created in database
  const alerts = await server.platformatic.entities.alert.find({
    where: {
      applicationId: { eq: applicationId },
      podId: { eq: podId }
    }
  })

  assert.strictEqual(alerts.length, 0, 'Should not create any alerts')
})

test('E2E: multiple pods sending signals should be handled independently', async (t) => {
  await cleanValkeyData()

  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const pod1Id = 'test-pod-1'
  const pod2Id = 'test-pod-2'
  const runtime1Id = randomUUID()
  const runtime2Id = randomUUID()
  const namespace = 'platformatic'
  const controllerId = 'test-controller'

  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      namespace,
      kind: 'Deployment',
      apiVersion: 'apps/v1',
      replicas: 2
    })
  })

  const server = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v2',
    PLT_SCALER_LOCK: Math.floor(Math.random() * 1000000).toString()
  })

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  // Register both pods
  await server.inject({
    method: 'POST',
    url: '/controllers',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      applicationId,
      deploymentId,
      namespace,
      podId: pod1Id
    })
  })

  await server.inject({
    method: 'POST',
    url: '/controllers',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      applicationId,
      deploymentId,
      namespace,
      podId: pod2Id
    })
  })

  // Mock getInstanceByPodId for both pods
  mockGetInstanceByPodId(server, {
    [pod1Id]: { applicationId, deploymentId, podId: pod1Id, namespace, status: 'running' },
    [pod2Id]: { applicationId, deploymentId, podId: pod2Id, namespace, status: 'running' }
  })

  await server.signalScalerExecutor.initialize()
  await server.signalScalerExecutor.onConnect(applicationId, deploymentId, pod1Id, runtime1Id, Date.now() - 60000)
  await server.signalScalerExecutor.onConnect(applicationId, deploymentId, pod2Id, runtime2Id, Date.now() - 60000)

  // Pod 1: High ELU
  const signals1 = {
    'service-1': createMetricsSamples(10, 0.9, 100)
  }

  // Pod 2: Low ELU
  const signals2 = {
    'service-1': createMetricsSamples(10, 0.3, 50)
  }

  const response1 = await server.inject({
    method: 'POST',
    url: '/signals',
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(pod1Id, namespace)
    },
    body: JSON.stringify({
      applicationId,
      runtimeId: runtime1Id,
      signals: signals1
    })
  })

  const response2 = await server.inject({
    method: 'POST',
    url: '/signals',
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(pod2Id, namespace)
    },
    body: JSON.stringify({
      applicationId,
      runtimeId: runtime2Id,
      signals: signals2
    })
  })

  assert.strictEqual(response1.statusCode, 200)
  assert.strictEqual(response2.statusCode, 200)

  const body1 = JSON.parse(response1.body)
  const body2 = JSON.parse(response2.body)

  assert.ok(body1.alerts.find(a => a.serviceId === 'service-1'), 'Pod 1 should have alert (high ELU)')
  assert.deepStrictEqual(body2.alerts, [], 'Pod 2 should have no alerts (low ELU)')
})

test('E2E: multiple services in a single request', async (t) => {
  await cleanValkeyData()

  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const podId = 'test-pod-1'
  const runtimeId = randomUUID()
  const namespace = 'platformatic'
  const controllerId = 'test-controller'

  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      namespace,
      kind: 'Deployment',
      apiVersion: 'apps/v1',
      replicas: 2
    })
  })

  const server = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v2',
    PLT_SCALER_LOCK: Math.floor(Math.random() * 1000000).toString()
  })

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  await server.inject({
    method: 'POST',
    url: '/controllers',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      applicationId,
      deploymentId,
      namespace,
      podId
    })
  })

  // Mock getInstanceByPodId
  mockGetInstanceByPodId(server, {
    [podId]: { applicationId, deploymentId, podId, namespace, status: 'running' }
  })

  await server.signalScalerExecutor.initialize()
  await server.signalScalerExecutor.onConnect(applicationId, deploymentId, podId, runtimeId, Date.now() - 60000)

  // Multiple services with different load levels
  const signals = {
    'service-high': createMetricsSamples(10, 0.9, 100), // High ELU
    'service-low': createMetricsSamples(10, 0.3, 50), // Low ELU
    'service-medium': createMetricsSamples(10, 0.85, 80) // High ELU
  }

  const response = await server.inject({
    method: 'POST',
    url: '/signals',
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId, namespace)
    },
    body: JSON.stringify({
      applicationId,
      runtimeId,
      signals
    })
  })

  assert.strictEqual(response.statusCode, 200)

  const body = JSON.parse(response.body)
  assert.ok(body.alerts.find(a => a.serviceId === 'service-high'), 'Should have alert for high ELU service')
  assert.strictEqual(body.alerts.find(a => a.serviceId === 'service-low'), undefined, 'Should not have alert for low ELU service')
  assert.ok(body.alerts.find(a => a.serviceId === 'service-medium'), 'Should have alert for medium-high ELU service')

  // Verify alerts were created in database
  const alerts = await server.platformatic.entities.alert.find({
    where: {
      applicationId: { eq: applicationId },
      podId: { eq: podId }
    }
  })

  assert.strictEqual(alerts.length, 2, 'Should create alerts for high ELU services only')
})

test('E2E: checkScalingOnSignals processes scaling decision', async (t) => {
  await cleanValkeyData()

  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const podId = 'test-pod-1'
  const runtimeId = randomUUID()
  const namespace = 'platformatic'
  const controllerId = 'test-controller'

  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      namespace,
      kind: 'Deployment',
      apiVersion: 'apps/v1',
      replicas: 2
    })
  })

  const server = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v2',
    PLT_SCALER_LOCK: Math.floor(Math.random() * 1000000).toString()
  })

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  await server.inject({
    method: 'POST',
    url: '/controllers',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      applicationId,
      deploymentId,
      namespace,
      podId
    })
  })

  await server.platformatic.entities.applicationScaleConfig.save({
    input: {
      applicationId,
      minPods: 2,
      maxPods: 8
    }
  })

  // Mock getInstanceByPodId
  mockGetInstanceByPodId(server, {
    [podId]: { applicationId, deploymentId, podId, namespace, status: 'running' }
  })

  await server.signalScalerExecutor.initialize()
  await server.signalScalerExecutor.onConnect(applicationId, deploymentId, podId, runtimeId, Date.now() - 60000)

  // Send high load metrics
  const signals = {
    'test-service': createMetricsSamples(10, 0.9, 100)
  }

  await server.inject({
    method: 'POST',
    url: '/signals',
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId, namespace)
    },
    body: JSON.stringify({
      applicationId,
      runtimeId,
      signals
    })
  })

  // Trigger scaling check
  const result = await server.signalScalerExecutor.checkScalingOnSignals({ applicationId })

  assert.ok(result.success, 'Should return success')
  assert.ok(result.timestamp, 'Should have timestamp')
})

test('E2E: scaling respects min/max pod constraints', async (t) => {
  await cleanValkeyData()

  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const podId = 'test-pod-1'
  const runtimeId = randomUUID()
  const namespace = 'platformatic'
  const controllerId = 'test-controller'

  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      namespace,
      kind: 'Deployment',
      apiVersion: 'apps/v1',
      replicas: 3
    })
  })

  const server = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v2',
    PLT_SCALER_LOCK: Math.floor(Math.random() * 1000000).toString()
  })

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  await server.inject({
    method: 'POST',
    url: '/controllers',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      applicationId,
      deploymentId,
      namespace,
      podId
    })
  })

  // Set restrictive min/max constraints
  await server.platformatic.entities.applicationScaleConfig.save({
    input: {
      applicationId,
      minPods: 2,
      maxPods: 4
    }
  })

  await server.signalScalerExecutor.initialize()
  await server.signalScalerExecutor.onConnect(applicationId, deploymentId, podId, runtimeId, Date.now() - 60000)

  // Get scale config and verify constraints
  const config = await server.signalScalerExecutor.getScaleConfig(applicationId)
  assert.strictEqual(config.minPods, 2, 'Should have minPods of 2')
  assert.strictEqual(config.maxPods, 4, 'Should have maxPods of 4')
})

test('E2E: leader election works correctly', async (t) => {
  await cleanValkeyData()

  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const podId = 'test-pod-1'
  const namespace = 'platformatic'
  const controllerId = 'test-controller'

  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      namespace,
      kind: 'Deployment',
      apiVersion: 'apps/v1',
      replicas: 2
    })
  })

  const server = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v2',
    PLT_SCALER_LOCK: '12345',
    PLT_SCALER_LEADER_POLL: '50'
  })

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  await server.inject({
    method: 'POST',
    url: '/controllers',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      applicationId,
      deploymentId,
      namespace,
      podId
    })
  })

  await sleep(200)

  assert.strictEqual(server.isScalerLeader(), true, 'Server should be the leader')
})

test('E2E: API returns error for non-v2 algorithm version', async (t) => {
  await cleanValkeyData()

  const applicationId = randomUUID()
  const podId = 'test-pod-1'
  const namespace = 'platformatic'

  const server = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v1',
    PLT_SCALER_LOCK: Math.floor(Math.random() * 1000000).toString()
  })

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  const signals = {
    'test-service': createMetricsSamples(10, 0.9, 100)
  }

  const response = await server.inject({
    method: 'POST',
    url: '/signals',
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId, namespace)
    },
    body: JSON.stringify({
      applicationId,
      runtimeId: randomUUID(),
      signals
    })
  })

  assert.strictEqual(response.statusCode, 400)

  const body = JSON.parse(response.body)
  assert.ok(body.error.includes('algorithm version v2'), 'Should mention v2 requirement')
})

test('E2E: concurrent signal processing from same pod', async (t) => {
  await cleanValkeyData()

  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const podId = 'test-pod-1'
  const runtimeId = randomUUID()
  const namespace = 'platformatic'
  const controllerId = 'test-controller'

  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      namespace,
      kind: 'Deployment',
      apiVersion: 'apps/v1',
      replicas: 2
    })
  })

  const server = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v2',
    PLT_SCALER_LOCK: Math.floor(Math.random() * 1000000).toString()
  })

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  await server.inject({
    method: 'POST',
    url: '/controllers',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      applicationId,
      deploymentId,
      namespace,
      podId
    })
  })

  // Mock getInstanceByPodId
  mockGetInstanceByPodId(server, {
    [podId]: { applicationId, deploymentId, podId, namespace, status: 'running' }
  })

  await server.signalScalerExecutor.initialize()
  await server.signalScalerExecutor.onConnect(applicationId, deploymentId, podId, runtimeId, Date.now() - 60000)

  // Send multiple concurrent requests
  const signals1 = { 'service-1': createMetricsSamples(10, 0.9, 100) }
  const signals2 = { 'service-2': createMetricsSamples(10, 0.85, 90) }

  const [response1, response2] = await Promise.all([
    server.inject({
      method: 'POST',
      url: '/signals',
      headers: {
        'content-type': 'application/json',
        'x-k8s': generateK8sHeader(podId, namespace)
      },
      body: JSON.stringify({
        applicationId,
        runtimeId,
        signals: signals1
      })
    }),
    server.inject({
      method: 'POST',
      url: '/signals',
      headers: {
        'content-type': 'application/json',
        'x-k8s': generateK8sHeader(podId, namespace)
      },
      body: JSON.stringify({
        applicationId,
        runtimeId,
        signals: signals2
      })
    })
  ])

  assert.strictEqual(response1.statusCode, 200)
  assert.strictEqual(response2.statusCode, 200)

  const body1 = JSON.parse(response1.body)
  const body2 = JSON.parse(response2.body)

  assert.ok(body1.alerts, 'First request should return alerts')
  assert.ok(body2.alerts, 'Second request should return alerts')
})

test('E2E: heap threshold alerts work correctly', async (t) => {
  await cleanValkeyData()

  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const podId = 'test-pod-1'
  const runtimeId = randomUUID()
  const namespace = 'platformatic'
  const controllerId = 'test-controller'

  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      namespace,
      kind: 'Deployment',
      apiVersion: 'apps/v1',
      replicas: 2
    })
  })

  const server = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v2',
    PLT_SCALER_LOCK: Math.floor(Math.random() * 1000000).toString()
  })

  t.after(async () => {
    await server.close()
    await cleanValkeyData()
  })

  await server.inject({
    method: 'POST',
    url: '/controllers',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      applicationId,
      deploymentId,
      namespace,
      podId
    })
  })

  // Mock getInstanceByPodId
  mockGetInstanceByPodId(server, {
    [podId]: { applicationId, deploymentId, podId, namespace, status: 'running' }
  })

  await server.signalScalerExecutor.initialize()
  await server.signalScalerExecutor.onConnect(applicationId, deploymentId, podId, runtimeId, Date.now() - 60000)

  // Low ELU but high heap (above 250 MB threshold)
  const signals = {
    'test-service': createMetricsSamples(10, 0.3, 300) // heap 300 > threshold 250
  }

  const response = await server.inject({
    method: 'POST',
    url: '/signals',
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId, namespace)
    },
    body: JSON.stringify({
      applicationId,
      runtimeId,
      signals
    })
  })

  assert.strictEqual(response.statusCode, 200)

  const body = JSON.parse(response.body)
  assert.ok(Array.isArray(body.alerts), 'Should return alerts array')
  assert.ok(body.alerts.find(a => a.serviceId === 'test-service'), 'Should have alert for high heap service')
})
