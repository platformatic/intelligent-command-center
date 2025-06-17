'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { randomUUID } = require('node:crypto')
const { buildServer } = require('../helper')
const { setTimeout } = require('timers/promises')

test('prediction scheduler plugin should be loaded', async (t) => {
  const server = await buildServer(t)

  assert.strictEqual(typeof server.startPredictionScheduling, 'function')
  assert.strictEqual(typeof server.stopPredictionScheduling, 'function')
  assert.strictEqual(typeof server.scheduleNextPrediction, 'function')
})

test('prediction scheduler should handle empty predictions gracefully', async (t) => {
  const server = await buildServer(t)

  server.isScalerLeader = () => true

  await server.startPredictionScheduling()
  await setTimeout(100)
  await server.stopPredictionScheduling()
})

test('prediction scheduler should not schedule when not leader', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()

  const prediction = {
    applicationId: appId,
    timeOfDay: 28800,
    absoluteTime: Date.now() + 1000,
    action: 'up',
    pods: 3,
    confidence: 0.85,
    reasons: ['Test prediction']
  }

  server.isScalerLeader = () => false

  await server.store.replaceApplicationPredictions(appId, [prediction])
  await server.startPredictionScheduling()

  await setTimeout(1500)
  const remaining = await server.store.getPredictions()
  assert.strictEqual(remaining.length, 1, 'Prediction should not be executed when not leader')

  await server.stopPredictionScheduling()
})

test('stopping prediction scheduler should clear timeout', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()

  const prediction = {
    applicationId: appId,
    timeOfDay: 28800,
    absoluteTime: Date.now() + 60000,
    action: 'up',
    pods: 3,
    confidence: 0.85,
    reasons: ['Future prediction']
  }

  await server.store.replaceApplicationPredictions(appId, [prediction])

  server.isScalerLeader = () => true
  server.scalerExecutor = {
    getCurrentPodCount: async () => { throw new Error('Controller not found') },
    getScaleConfig: async () => ({ minPods: undefined, maxPods: undefined }),
    applyScaleConstraints: (targetPods, minPods, maxPods) => targetPods,
    executeScaling: async () => ({ success: false })
  }

  await server.startPredictionScheduling()
  await server.stopPredictionScheduling()

  await setTimeout(100)
  const remaining = await server.store.getPredictions()
  assert.strictEqual(remaining.length, 1, 'Prediction should not be executed after stopping')
})

test('prediction scheduler can start and stop multiple times', async (t) => {
  const server = await buildServer(t)

  server.isScalerLeader = () => true
  await server.startPredictionScheduling()
  await server.stopPredictionScheduling()

  await server.startPredictionScheduling()
  await server.stopPredictionScheduling()

  await server.startPredictionScheduling()
  await server.stopPredictionScheduling()
})

test('prediction scheduler respects isSchedulingActive flag', async (t) => {
  const server = await buildServer(t)

  server.isScalerLeader = () => true

  await server.startPredictionScheduling()
  await server.startPredictionScheduling()
  await server.stopPredictionScheduling()
  await server.stopPredictionScheduling()
})

test('should execute overdue prediction immediately', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()
  let scalingExecuted = false

  const prediction = {
    applicationId: appId,
    timeOfDay: 28800,
    absoluteTime: Date.now() - 1000,
    action: 'up',
    pods: 3,
    confidence: 0.85,
    reasons: ['Overdue prediction']
  }

  server.isScalerLeader = () => true
  server.scalerExecutor = {
    getCurrentPodCount: async (id) => 1,
    getScaleConfig: async (id) => ({ minPods: undefined, maxPods: undefined }),
    applyScaleConstraints: (targetPods, minPods, maxPods) => {
      const effectiveMin = minPods || 1
      const effectiveMax = maxPods || Number.MAX_SAFE_INTEGER
      return Math.max(effectiveMin, Math.min(effectiveMax, targetPods))
    },
    executeScaling: async (appId, targetPods, reason) => {
      scalingExecuted = true
      assert.strictEqual(targetPods, 3)
      assert.ok(reason.includes('Prediction-based scale up'))
      return { success: true }
    }
  }

  await server.store.replaceApplicationPredictions(appId, [prediction])
  await server.scheduleNextPrediction()
  await setTimeout(100)

  assert.strictEqual(scalingExecuted, true, 'Overdue prediction should be executed immediately')

  const remaining = await server.store.getPredictions()
  assert.strictEqual(remaining.length, 0, 'Prediction should be removed after execution')
})

test('should schedule future prediction correctly', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()
  let scalingExecuted = false

  const prediction = {
    applicationId: appId,
    timeOfDay: 28800,
    absoluteTime: Date.now() + 500,
    action: 'down',
    pods: 1,
    confidence: 0.75,
    reasons: ['Future prediction']
  }

  server.isScalerLeader = () => true
  server.scalerExecutor = {
    getCurrentPodCount: async (id) => 3,
    getScaleConfig: async (id) => ({ minPods: undefined, maxPods: undefined }),
    applyScaleConstraints: (targetPods, minPods, maxPods) => {
      const effectiveMin = minPods || 1
      const effectiveMax = maxPods || Number.MAX_SAFE_INTEGER
      return Math.max(effectiveMin, Math.min(effectiveMax, targetPods))
    },
    executeScaling: async (appId, targetPods, reason) => {
      scalingExecuted = true
      assert.strictEqual(targetPods, 1)
      assert.ok(reason.includes('Prediction-based scale down'))
      return { success: true }
    }
  }

  await server.store.replaceApplicationPredictions(appId, [prediction])
  await server.scheduleNextPrediction()
  await setTimeout(700)

  assert.strictEqual(scalingExecuted, true, 'Future prediction should be executed after timeout')

  const remaining = await server.store.getPredictions()
  assert.strictEqual(remaining.length, 0, 'Prediction should be removed after execution')
})

test('should respect scale config min/max constraints', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()
  let actualTargetPods = null

  const prediction = {
    applicationId: appId,
    timeOfDay: 28800,
    absoluteTime: Date.now() - 1000,
    action: 'up',
    pods: 10,
    confidence: 0.85,
    reasons: ['High scaling prediction']
  }

  server.isScalerLeader = () => true
  server.scalerExecutor = {
    getCurrentPodCount: async (id) => 1,
    getScaleConfig: async (id) => ({ minPods: 1, maxPods: 5 }),
    applyScaleConstraints: (targetPods, minPods, maxPods) => {
      const effectiveMin = minPods || 1
      const effectiveMax = maxPods || Number.MAX_SAFE_INTEGER
      return Math.max(effectiveMin, Math.min(effectiveMax, targetPods))
    },
    executeScaling: async (appId, targetPods, reason) => {
      actualTargetPods = targetPods
      return { success: true }
    }
  }

  await server.store.replaceApplicationPredictions(appId, [prediction])
  await server.scheduleNextPrediction()
  await setTimeout(100)

  assert.strictEqual(actualTargetPods, 5, 'Target pods should be capped at maxPods')
})

test('should not scale when target equals current pod count', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()
  let scalingExecuted = false

  const prediction = {
    applicationId: appId,
    timeOfDay: 28800,
    absoluteTime: Date.now() - 1000,
    action: 'up',
    pods: 3,
    confidence: 0.85,
    reasons: ['No change needed']
  }

  server.isScalerLeader = () => true
  server.getApplicationController = async (id) => ({
    replicas: 3,
    applicationId: id
  })
  server.scalerExecutor = {
    executeScaling: async () => {
      scalingExecuted = true
      return { success: true }
    }
  }

  await server.store.replaceApplicationPredictions(appId, [prediction])
  await server.scheduleNextPrediction()
  await setTimeout(100)

  assert.strictEqual(scalingExecuted, false, 'Scaling should not be executed when target equals current')

  const remaining = await server.store.getPredictions()
  assert.strictEqual(remaining.length, 0, 'Prediction should still be removed')
})

test('should handle missing controller gracefully', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()
  let scalingExecuted = false

  const prediction = {
    applicationId: appId,
    timeOfDay: 28800,
    absoluteTime: Date.now() - 1000,
    action: 'up',
    pods: 3,
    confidence: 0.85,
    reasons: ['Test prediction']
  }

  server.isScalerLeader = () => true
  server.getApplicationController = async () => null
  server.scalerExecutor = {
    executeScaling: async () => {
      scalingExecuted = true
      return { success: true }
    }
  }

  await server.store.replaceApplicationPredictions(appId, [prediction])
  await server.scheduleNextPrediction()
  await setTimeout(100)

  assert.strictEqual(scalingExecuted, false, 'Scaling should not be executed when controller is missing')

  const remaining = await server.store.getPredictions()
  assert.strictEqual(remaining.length, 0, 'Prediction should be removed even with missing controller')
})

test('should handle missing controllers plugin gracefully', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()
  let scalingExecuted = false

  const prediction = {
    applicationId: appId,
    timeOfDay: 28800,
    absoluteTime: Date.now() - 1000,
    action: 'up',
    pods: 3,
    confidence: 0.85,
    reasons: ['Test prediction']
  }

  server.isScalerLeader = () => true
  server.getApplicationController = undefined
  server.scalerExecutor = {
    executeScaling: async () => {
      scalingExecuted = true
      return { success: true }
    }
  }

  await server.store.replaceApplicationPredictions(appId, [prediction])
  await server.scheduleNextPrediction()
  await setTimeout(100)

  assert.strictEqual(scalingExecuted, false, 'Scaling should not be executed when controllers plugin is missing')

  const remaining = await server.store.getPredictions()
  assert.strictEqual(remaining.length, 0, 'Prediction should be removed even without controllers plugin')
})

test('should handle missing scaler executor gracefully', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()

  const prediction = {
    applicationId: appId,
    timeOfDay: 28800,
    absoluteTime: Date.now() - 1000,
    action: 'up',
    pods: 3,
    confidence: 0.85,
    reasons: ['Test prediction']
  }

  server.isScalerLeader = () => true
  server.getApplicationController = async (id) => ({
    replicas: 1,
    applicationId: id
  })
  server.scalerExecutor = undefined

  await server.store.replaceApplicationPredictions(appId, [prediction])
  await server.scheduleNextPrediction()
  await setTimeout(100)

  const remaining = await server.store.getPredictions()
  assert.strictEqual(remaining.length, 0, 'Prediction should be removed even without scaler executor')
})

test('should handle scaling execution failure', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()

  const prediction = {
    applicationId: appId,
    timeOfDay: 28800,
    absoluteTime: Date.now() - 1000,
    action: 'up',
    pods: 3,
    confidence: 0.85,
    reasons: ['Test prediction']
  }

  server.isScalerLeader = () => true
  server.getApplicationController = async (id) => ({
    replicas: 1,
    applicationId: id
  })
  server.scalerExecutor = {
    executeScaling: async () => ({
      success: false,
      error: 'Scaling failed'
    })
  }

  await server.store.replaceApplicationPredictions(appId, [prediction])
  await server.scheduleNextPrediction()
  await setTimeout(100)

  const remaining = await server.store.getPredictions()
  assert.strictEqual(remaining.length, 0, 'Prediction should be removed even after scaling failure')
})

test('should handle scaling execution error', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()

  const prediction = {
    applicationId: appId,
    timeOfDay: 28800,
    absoluteTime: Date.now() - 1000,
    action: 'up',
    pods: 3,
    confidence: 0.85,
    reasons: ['Test prediction']
  }

  server.isScalerLeader = () => true
  server.getApplicationController = async (id) => ({
    replicas: 1,
    applicationId: id
  })
  server.scalerExecutor = {
    executeScaling: async () => {
      throw new Error('Scaling error')
    }
  }

  await server.store.replaceApplicationPredictions(appId, [prediction])
  await server.scheduleNextPrediction()
  await setTimeout(100)

  const remaining = await server.store.getPredictions()
  assert.strictEqual(remaining.length, 0, 'Prediction should be removed even after scaling error')
})

test('should handle down action with min constraint', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()
  let actualTargetPods = null

  const prediction = {
    applicationId: appId,
    timeOfDay: 28800,
    absoluteTime: Date.now() - 1000,
    action: 'down',
    pods: 1,
    confidence: 0.85,
    reasons: ['Scale down prediction']
  }

  server.isScalerLeader = () => true
  server.scalerExecutor = {
    getCurrentPodCount: async (id) => 5,
    getScaleConfig: async (id) => ({ minPods: 2, maxPods: 10 }),
    applyScaleConstraints: (targetPods, minPods, maxPods) => {
      const effectiveMin = minPods || 1
      const effectiveMax = maxPods || Number.MAX_SAFE_INTEGER
      return Math.max(effectiveMin, Math.min(effectiveMax, targetPods))
    },
    executeScaling: async (appId, targetPods, reason) => {
      actualTargetPods = targetPods
      return { success: true }
    }
  }

  await server.store.replaceApplicationPredictions(appId, [prediction])
  await server.scheduleNextPrediction()
  await setTimeout(100)

  assert.strictEqual(actualTargetPods, 2, 'Target pods should be capped at minPods')
})

test('should chain multiple predictions', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()
  const executedPredictions = []

  const predictions = [
    {
      applicationId: appId,
      timeOfDay: 28800,
      absoluteTime: Date.now() - 100,
      action: 'up',
      pods: 3,
      confidence: 0.85,
      reasons: ['First prediction']
    },
    {
      applicationId: appId,
      timeOfDay: 28900,
      absoluteTime: Date.now() - 50,
      action: 'down',
      pods: 1,
      confidence: 0.75,
      reasons: ['Second prediction']
    }
  ]

  server.isScalerLeader = () => true
  let currentReplicas = 1
  server.scalerExecutor = {
    getCurrentPodCount: async (id) => currentReplicas,
    getScaleConfig: async (id) => ({ minPods: undefined, maxPods: undefined }),
    applyScaleConstraints: (targetPods, minPods, maxPods) => {
      const effectiveMin = minPods || 1
      const effectiveMax = maxPods || Number.MAX_SAFE_INTEGER
      return Math.max(effectiveMin, Math.min(effectiveMax, targetPods))
    },
    executeScaling: async (appId, targetPods, reason) => {
      executedPredictions.push({ targetPods, reason })
      currentReplicas = targetPods
      return { success: true }
    }
  }

  await server.store.replaceApplicationPredictions(appId, predictions)
  await server.scheduleNextPrediction()
  await setTimeout(100)

  assert.strictEqual(executedPredictions.length, 2, 'Both predictions should be executed')
  assert.strictEqual(executedPredictions[0].targetPods, 3, 'First prediction should scale to 3')
  assert.strictEqual(executedPredictions[1].targetPods, 1, 'Second prediction should scale to 1')
})

test('should start prediction scheduling on ready when leader', async (t) => {
  const server = await buildServer(t)

  server.isScalerLeader = () => true

  await server.ready()
  await setTimeout(100)

  await server.stopPredictionScheduling()
})

test('should not start prediction scheduling on ready when not leader', async (t) => {
  const server = await buildServer(t)

  server.isScalerLeader = () => false

  await server.ready()
  await setTimeout(100)
})

test('should execute next prediction correctly after leader change', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()
  let scalingExecuted = false
  let isLeader = false

  const prediction = {
    applicationId: appId,
    timeOfDay: 28800,
    absoluteTime: Date.now() + 300,
    action: 'up',
    pods: 4,
    confidence: 0.90,
    reasons: ['Leader change test prediction']
  }

  server.isScalerLeader = () => isLeader
  server.scalerExecutor = {
    getCurrentPodCount: async (id) => 2,
    getScaleConfig: async (id) => ({ minPods: 1, maxPods: 10 }),
    applyScaleConstraints: (targetPods, minPods, maxPods) => {
      const effectiveMin = minPods || 1
      const effectiveMax = maxPods || Number.MAX_SAFE_INTEGER
      return Math.max(effectiveMin, Math.min(effectiveMax, targetPods))
    },
    executeScaling: async (appId, targetPods, reason) => {
      scalingExecuted = true
      assert.strictEqual(targetPods, 4)
      assert.ok(reason.includes('Leader change test prediction'))
      return { success: true }
    }
  }

  await server.store.replaceApplicationPredictions(appId, [prediction])

  isLeader = false
  await server.startPredictionScheduling()
  await setTimeout(100)

  assert.strictEqual(scalingExecuted, false, 'Prediction should not execute when not leader')

  isLeader = true
  await server.stopPredictionScheduling()
  await server.startPredictionScheduling()
  await setTimeout(500)

  assert.strictEqual(scalingExecuted, true, 'Prediction should execute after becoming leader')

  const remaining = await server.store.getPredictions()
  assert.strictEqual(remaining.length, 0, 'Prediction should be removed after execution')

  await server.stopPredictionScheduling()
})
