'use strict'

const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const assert = require('node:assert/strict')
const { setTimeout: sleep } = require('node:timers/promises')
const {
  buildServer,
  generateK8sHeader,
  startMachinist,
  cleanValkeyData
} = require('../helper')

test('E2E: signal ingestion should trigger scale up decision', async (t) => {
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
    PLT_SCALER_LOCK: Math.floor(Math.random() * 1000000).toString(),
    PLT_SIGNALS_SCALER_HOT_RATE_THRESHOLD: 0.3,
    PLT_SIGNALS_SCALER_UP_FW_RATE_THRESHOLD: 0.05
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

  await server.platformatic.entities.applicationScaleConfig.save({
    input: {
      applicationId,
      minPods: 1,
      maxPods: 10
    }
  })

  const now = Date.now()
  const signals = []
  for (let i = 0; i < 20; i++) {
    signals.push({
      type: 'cpu',
      value: 0.85,
      timestamp: now + (i * 1000)
    })
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
      serviceId: 'test-service',
      elu: 0.7,
      heapUsed: 111,
      heapTotal: 222,
      signals
    })
  })

  assert.strictEqual(response.statusCode, 200)

  const body = JSON.parse(response.body)
  assert.strictEqual(body.success, true)
  assert.strictEqual(body.applicationId, applicationId)
  assert.strictEqual(body.podId, podId)
  assert.strictEqual(body.signalCount, 20)
  assert.ok(body.scalingDecision)
  assert.ok(typeof body.scalingDecision.nfinal === 'number')
  assert.ok(body.scalingDecision.nfinal > 2, 'Should recommend scaling up from 2 pods')
  assert.ok(body.scalingDecision.reason)
  assert.strictEqual(typeof body.scalingDecision.reason, 'string')
})

test('E2E: multiple pods sending signals should aggregate for scaling decision', async (t) => {
  await cleanValkeyData()

  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const pod1Id = 'test-pod-1'
  const pod2Id = 'test-pod-2'
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
    PLT_SCALER_LOCK: Math.floor(Math.random() * 1000000).toString(),
    PLT_SIGNALS_SCALER_HOT_RATE_THRESHOLD: 0.3,
    PLT_SIGNALS_SCALER_UP_FW_RATE_THRESHOLD: 0.04
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
      podId: pod1Id
    })
  })

  await server.platformatic.entities.applicationScaleConfig.save({
    input: {
      applicationId,
      minPods: 2,
      maxPods: 8
    }
  })

  const now = Date.now()

  for (let i = 0; i < 15; i++) {
    await server.inject({
      method: 'POST',
      url: '/signals',
      headers: {
        'content-type': 'application/json',
        'x-k8s': generateK8sHeader(pod1Id, namespace)
      },
      body: JSON.stringify({
        applicationId,
        serviceId: 'test-service',
        elu: 0.7,
        heapUsed: 111,
        heapTotal: 222,
        signals: [{
          type: 'cpu',
          value: 0.9,
          timestamp: now + (i * 1000)
        }]
      })
    })
  }

  for (let i = 0; i < 15; i++) {
    await server.inject({
      method: 'POST',
      url: '/signals',
      headers: {
        'content-type': 'application/json',
        'x-k8s': generateK8sHeader(pod2Id, namespace)
      },
      body: JSON.stringify({
        applicationId,
        serviceId: 'test-service',
        elu: 0.7,
        heapUsed: 111,
        heapTotal: 222,
        signals: [{
          type: 'cpu',
          value: 0.88,
          timestamp: now + (i * 1000)
        }]
      })
    })
  }

  const result = await server.signalScalerExecutor.checkScalingForApplication(applicationId)

  assert.strictEqual(result.success, true)
  assert.ok(result.scalingDecision)
  assert.ok(result.scalingDecision.nfinal >= 2, 'Should have a scaling decision')
  assert.ok(result.scalingDecision.reason, 'Should have a scaling reason')
})

test('E2E: low signal values are processed correctly', async (t) => {
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
      replicas: 3
    })
  })

  const server = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v2',
    PLT_SCALER_LOCK: Math.floor(Math.random() * 1000000).toString(),
    PLT_SIGNALS_SCALER_DOWN_SW_RATE_THRESHOLD: 0.05,
    PLT_SIGNALS_SCALER_DOWN_LW_RATE_THRESHOLD: 0.02
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
      minPods: 1,
      maxPods: 10
    }
  })

  const now = Date.now()
  const signals = []
  for (let i = 0; i < 30; i++) {
    signals.push({
      type: 'cpu',
      value: 0.1,
      timestamp: now + (i * 1000)
    })
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
      serviceId: 'test-service',
      elu: 0.7,
      heapUsed: 111,
      heapTotal: 222,
      signals
    })
  })

  assert.strictEqual(response.statusCode, 200)
  const body = JSON.parse(response.body)
  assert.strictEqual(body.success, true)
  assert.ok(body.scalingDecision)
  assert.ok(typeof body.scalingDecision.nfinal === 'number')
  assert.ok(body.scalingDecision.reason)
})

test('E2E: respects min/max pod constraints', async (t) => {
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

  await server.platformatic.entities.applicationScaleConfig.save({
    input: {
      applicationId,
      minPods: 2,
      maxPods: 4
    }
  })

  const now = Date.now()
  const highSignals = []
  for (let i = 0; i < 50; i++) {
    highSignals.push({
      type: 'cpu',
      value: 0.99,
      timestamp: now + (i * 1000)
    })
  }

  const highResponse = await server.inject({
    method: 'POST',
    url: '/signals',
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId, namespace)
    },
    body: JSON.stringify({
      applicationId,
      serviceId: 'test-service',
      elu: 0.7,
      heapUsed: 111,
      heapTotal: 222,
      signals: highSignals
    })
  })

  const highBody = JSON.parse(highResponse.body)
  assert.ok(highBody.scalingDecision.nfinal <= 4, 'Should not exceed maxPods of 4')

  await cleanValkeyData()

  const lowSignals = []
  for (let i = 0; i < 50; i++) {
    lowSignals.push({
      type: 'cpu',
      value: 0.01,
      timestamp: now + (i * 1000) + 60000
    })
  }

  const lowResponse = await server.inject({
    method: 'POST',
    url: '/signals',
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId, namespace)
    },
    body: JSON.stringify({
      applicationId,
      serviceId: 'test-service',
      elu: 0.7,
      heapUsed: 111,
      heapTotal: 222,
      signals: lowSignals
    })
  })

  const lowBody = JSON.parse(lowResponse.body)
  assert.ok(lowBody.scalingDecision.nfinal >= 2, 'Should not go below minPods of 2')
})

test('E2E: signal grouping by timestamp works correctly', async (t) => {
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

  const now = Date.now()
  const signals = [
    { type: 'cpu', value: 0.8, timestamp: now },
    { type: 'memory', value: 0.7, timestamp: now + 100 },
    { type: 'cpu', value: 0.85, timestamp: now + 500 },
    { type: 'memory', value: 0.75, timestamp: now + 1000 },
    { type: 'cpu', value: 0.9, timestamp: now + 1500 }
  ]

  const response = await server.inject({
    method: 'POST',
    url: '/signals',
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId, namespace)
    },
    body: JSON.stringify({
      applicationId,
      serviceId: 'test-service',
      elu: 0.7,
      heapUsed: 111,
      heapTotal: 222,
      signals
    })
  })

  assert.strictEqual(response.statusCode, 200)

  const body = JSON.parse(response.body)
  assert.strictEqual(body.success, true)
  assert.strictEqual(body.signalCount, 5)
  assert.ok(body.scalingDecision)
})

test('E2E: mixed signal types (cpu, memory, custom) are processed', async (t) => {
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

  const now = Date.now()
  const signals = []
  for (let i = 0; i < 10; i++) {
    signals.push(
      { type: 'cpu', value: 0.8, timestamp: now + (i * 1000) },
      { type: 'memory', value: 0.75, timestamp: now + (i * 1000) },
      { type: 'custom_metric', value: 100, timestamp: now + (i * 1000), description: 'Custom application metric' }
    )
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
      serviceId: 'test-service',
      elu: 0.7,
      heapUsed: 111,
      heapTotal: 222,
      signals
    })
  })

  assert.strictEqual(response.statusCode, 200)

  const body = JSON.parse(response.body)
  assert.strictEqual(body.success, true)
  assert.strictEqual(body.signalCount, 30)
  assert.ok(body.scalingDecision)
})

test('E2E: periodic trigger processes accumulated signals', async (t) => {
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
    PLT_SCALER_LEADER_POLL: '50',
    PLT_SIGNALS_SCALER_PERIODIC_TRIGGER: '0.2',
    PLT_SIGNALS_SCALER_HOT_RATE_THRESHOLD: 0.3
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
      minPods: 1,
      maxPods: 10
    }
  })

  const now = Date.now()
  for (let batch = 0; batch < 3; batch++) {
    const signals = []
    for (let i = 0; i < 10; i++) {
      signals.push({
        type: 'cpu',
        value: 0.9,
        timestamp: now + (batch * 10000) + (i * 1000)
      })
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
        elu: 0.7,
        heapUsed: 111,
        heapTotal: 222,
        signals
      })
    })
  }

  await sleep(500)

  assert.strictEqual(server.isScalerLeader(), true, 'Server should be the leader')
})

test('E2E: scale down when no recent signals', async (t) => {
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
      replicas: 5
    })
  })

  const server = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v2',
    PLT_SCALER_LOCK: Math.floor(Math.random() * 1000000).toString(),
    PLT_SIGNALS_SCALER_PERIODIC_TRIGGER: 0.2
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

  await server.platformatic.entities.applicationScaleConfig.save({
    input: {
      applicationId,
      minPods: 1,
      maxPods: 10
    }
  })

  await sleep(500)

  const scaleEvents = await server.platformatic.entities.scaleEvent.find({
    where: {
      applicationId: {
        eq: applicationId
      }
    }
  })

  assert.ok(scaleEvents.length > 1, 'Should have created scale events')
  const latestEvent = scaleEvents[scaleEvents.length - 1]
  assert.strictEqual(latestEvent.direction, 'down', 'Should be scaling down')
  assert.strictEqual(latestEvent.replicas, 4, 'Should scale down to 4 pods')
  assert.strictEqual(latestEvent.replicasDiff, -1, 'Should scale down by 1')
  assert.ok(latestEvent.reason.includes('Low utilization'), 'Reason should mention low utilization')

  assert.strictEqual(server.isScalerLeader(), true, 'Server should be the leader')
})
