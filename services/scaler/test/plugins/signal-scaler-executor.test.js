'use strict'

const { test } = require('node:test')
const { strict: assert } = require('node:assert')
const { buildServer } = require('../helper')
const { randomUUID } = require('crypto')

function createTestController (applicationId, replicas = 2) {
  const deploymentId = randomUUID()
  return {
    applicationId,
    deploymentId,
    k8SControllerId: 'test-controller-' + Date.now(),
    namespace: 'default',
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    replicas
  }
}

test('signal-scaler-executor should be registered correctly', async (t) => {
  const app = await buildServer(t)

  assert.ok(app.signalScalerExecutor, 'signalScalerExecutor should be decorated on app')
  assert.strictEqual(typeof app.signalScalerExecutor.processSignals, 'function')
  assert.strictEqual(typeof app.signalScalerExecutor.checkScalingForApplication, 'function')
  assert.strictEqual(typeof app.signalScalerExecutor.checkScalingForAllApplications, 'function')
  assert.strictEqual(typeof app.signalScalerExecutor.getCurrentPodCount, 'function')
  assert.strictEqual(typeof app.signalScalerExecutor.getScaleConfig, 'function')
  assert.strictEqual(typeof app.signalScalerExecutor.executeScaling, 'function')
})

test('getCurrentPodCount should return replica count', async (t) => {
  const app = await buildServer(t)

  const applicationId = randomUUID()
  const controllerData = createTestController(applicationId, 3)

  await app.platformatic.entities.controller.save({
    input: controllerData
  })

  const podCount = await app.signalScalerExecutor.getCurrentPodCount(applicationId)
  assert.strictEqual(podCount, 3)
})

test('getCurrentPodCount should throw error when no controller found', async (t) => {
  const app = await buildServer(t)

  await assert.rejects(
    async () => {
      await app.signalScalerExecutor.getCurrentPodCount(randomUUID())
    },
    /No controller found for application/
  )
})

test('getScaleConfig should return config when available', async (t) => {
  const app = await buildServer(t)

  const applicationId = randomUUID()
  await app.platformatic.entities.applicationScaleConfig.save({
    input: {
      applicationId,
      minPods: 2,
      maxPods: 8
    }
  })

  const config = await app.signalScalerExecutor.getScaleConfig(applicationId)
  assert.strictEqual(config.minPods, 2)
  assert.strictEqual(config.maxPods, 8)
})

test('getScaleConfig should return undefined when no config found', async (t) => {
  const app = await buildServer(t)

  const config = await app.signalScalerExecutor.getScaleConfig(randomUUID())
  assert.strictEqual(config.minPods, undefined)
  assert.strictEqual(config.maxPods, undefined)
})

test('processSignals should store signal event and make scaling decision', async (t) => {
  const app = await buildServer(t)

  const applicationId = randomUUID()
  const podId = 'test-pod-1'
  const controllerData = createTestController(applicationId, 2)

  await app.platformatic.entities.controller.save({
    input: controllerData
  })

  const signals = [
    { type: 'cpu', value: 0.8, timestamp: Date.now() },
    { type: 'memory', value: 0.7, timestamp: Date.now() }
  ]

  const result = await app.signalScalerExecutor.processSignals({
    applicationId,
    podId,
    signals
  })

  assert.ok(result.scalingDecision)
  assert.ok(typeof result.scalingDecision.nfinal === 'number')
  assert.ok(typeof result.scalingDecision.reason === 'string')
})

test('check Scaling For Application should handle errors gracefully', async (t) => {
  const app = await buildServer(t)

  const result = await app.signalScalerExecutor.checkScalingForApplication(randomUUID())

  assert.strictEqual(result.success, false)
  assert.ok(result.error)
})

test('checkScalingForAllApplications should return success', async (t) => {
  const app = await buildServer(t)

  const result = await app.signalScalerExecutor.checkScalingForAllApplications()

  assert.ok(result.success)
  assert.ok(Array.isArray(result.results))
})
