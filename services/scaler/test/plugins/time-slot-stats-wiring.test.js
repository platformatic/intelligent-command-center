'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { setTimeout: sleep } = require('node:timers/promises')
const {
  buildServer,
  generateMachineHeaders,
  startMachinist,
  cleanValkeyData
} = require('../helper')

function createMetricsSamples (count, eluValue, heapValue, eluThreshold = 0.75, heapThreshold = 250) {
  const base = Math.floor(Date.now() / 1000) * 1000
  const eluValues = []
  const heapValues = []
  for (let i = count; i >= 1; i--) {
    const ts = base - i * 1000
    eluValues.push([ts, eluValue])
    heapValues.push([ts, heapValue])
  }
  return {
    elu: { options: { threshold: eluThreshold }, workers: { 'worker-0': { values: eluValues } } },
    heap: { options: { threshold: heapThreshold, heapTotal: 512 }, workers: { 'worker-0': { values: heapValues } } }
  }
}

test('Scaler v2 processing run records an unclamped target into the time-slot bucket', async (t) => {
  await cleanValkeyData()

  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const podId = 'test-pod-1'
  const runtimeId = randomUUID()
  const namespace = 'platformatic'
  const controllerId = 'test-controller'

  await startMachinist(t, {
    getPodController: () => ({ name: controllerId, namespace, kind: 'Deployment', apiVersion: 'apps/v1', replicas: 2 })
  })

  const server = await buildServer(t, {
    PLT_SCALER_ALGORITHM_VERSION: 'v2',
    PLT_SCALER_LOCK: Math.floor(Math.random() * 1000000).toString(),
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
    body: JSON.stringify({ applicationId, deploymentId, namespace, machineId: podId })
  })

  server.getInstanceByMachineId = async (id) =>
    id === podId ? { applicationId, deploymentId, podId, namespace, status: 'running' } : null

  await server.platformatic.entities.applicationScaleConfig.save({
    input: { applicationId, minPods: 1, maxPods: 10 }
  })

  await server.signalScalerExecutor.initialize()
  await server.signalScalerExecutor.onReady(applicationId, controllerId, deploymentId, podId, runtimeId, Date.now() - 60000)

  // Become leader so the incoming signal schedules a local processing run.
  await sleep(300)
  assert.equal(server.isScalerLeader(), true, 'server should be the leader')

  await server.inject({
    method: 'POST',
    url: '/signals',
    headers: { 'content-type': 'application/json', ...generateMachineHeaders(podId, namespace) },
    body: JSON.stringify({ applicationId, runtimeId, signals: { 'test-service': createMetricsSamples(10, 0.9, 100) } })
  })

  // The processing run is debounced ~processingInitTimeoutMs (1s); wait for it to fire onTarget.
  await sleep(1500)

  const bucket = await server.store.readBucket(applicationId)
  assert.ok(bucket, 'time-slot bucket should exist after a processing run')
  assert.ok(bucket.targets.length >= 1, 'should have recorded at least one unclamped target')
  assert.ok(bucket.targets.every((s) => s.value > 0), 'recorded targets should be positive')
})
