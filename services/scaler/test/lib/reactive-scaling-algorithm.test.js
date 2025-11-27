'use strict'

process.env.SKIP_POST_SCALING_EVALUATION = 'true'

const { test } = require('node:test')
const assert = require('node:assert')
const ReactiveScalingAlgorithm = require('../../lib/reactive-scaling-algorithm')
const {
  calculateTrend,
  calculateVariability,
  getPerformanceSuccessScore,
  calculateEluScore,
  processPodMetrics,
  updateClusters
} = require('../../lib/scaling-algorithm-utils')
const Store = require('../../lib/store')
const { valkeyConnectionString } = require('../helper')

function createMockLog () {
  const logs = []
  return {
    info: (data, msg) => logs.push({ level: 'info', data, msg }),
    debug: (data, msg) => logs.push({ level: 'debug', data, msg }),
    warn: (data, msg) => logs.push({ level: 'warn', data, msg }),
    error: (data, msg) => logs.push({ level: 'error', data, msg }),
    getLogs: () => logs
  }
}

async function setupStore (t) {
  const { scanKeys } = require('../../../../lib/redis-utils')
  const store = new Store(valkeyConnectionString, createMockLog())

  // Clean up before test
  const keys = await scanKeys(store.valkey, 'scaler:*')
  if (keys.length > 0) {
    await store.valkey.del(...keys)
  }

  // Register cleanup after test
  t.after(async () => {
    const keys = await scanKeys(store.valkey, 'scaler:*')
    if (keys.length > 0) {
      await store.valkey.del(...keys)
    }
    await store.close()
  })

  return store
}

function createMockApp (store, log, metrics) {
  return {
    store,
    log,
    scalerMetrics: metrics
  }
}

function createMockMetrics () {
  return {
    eventLoopUtilization: [{
      metric: { podId: 'pod-1', applicationId: 'app-1' },
      values: [
        [1620000000, '0.75'],
        [1620000001, '0.80'],
        [1620000002, '0.85'],
        [1620000003, '0.90']
      ]
    }],
    heapSize: [{
      metric: { podId: 'pod-1', applicationId: 'app-1' },
      values: [
        [1620000000, '1073741824'],
        [1620000001, '1288490188'],
        [1620000002, '1503238553'],
        [1620000003, '1717986918']
      ]
    }]
  }
}

test('ReactiveScalingAlgorithm constructor initializes with default options', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()
  const app = createMockApp(store, log)

  const algorithm = new ReactiveScalingAlgorithm(app)

  assert.strictEqual(algorithm.maxHistoryEvents, 10)
  assert.strictEqual(algorithm.maxClusters, 5)
  assert.strictEqual(algorithm.eluThreshold, 0.9)
  assert.strictEqual(algorithm.heapThreshold, 0.85)
})

test('ReactiveScalingAlgorithm constructor initializes with custom options', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()
  const app = createMockApp(store, log)

  const options = {
    maxHistoryEvents: 15,
    maxClusters: 3,
    eluThreshold: 0.95,
    heapThreshold: 0.8,
    cooldownPeriod: 500,
    minPodsDefault: 2,
    maxPodsDefault: 20
  }

  const algorithm = new ReactiveScalingAlgorithm(app, options)

  assert.strictEqual(algorithm.maxHistoryEvents, 15)
  assert.strictEqual(algorithm.maxClusters, 3)
  assert.strictEqual(algorithm.eluThreshold, 0.95)
  assert.strictEqual(algorithm.heapThreshold, 0.8)
  assert.strictEqual(algorithm.cooldownPeriod, 500)
  assert.strictEqual(algorithm.minPodsDefault, 2)
  assert.strictEqual(algorithm.maxPodsDefault, 20)
})

test('calculateTrend computes linear trend correctly', async (t) => {
  assert.strictEqual(calculateTrend([0.5, 0.5, 0.5, 0.5]), 0)

  const positiveTrend = calculateTrend([0.1, 0.2, 0.3, 0.4])
  assert.ok(positiveTrend > 0)
  assert.ok(Math.abs(positiveTrend - 0.1) < 0.0001)

  const negativeTrend = calculateTrend([0.4, 0.3, 0.2, 0.1])
  assert.ok(negativeTrend < 0)
  assert.ok(Math.abs(negativeTrend + 0.1) < 0.0001)

  assert.strictEqual(calculateTrend([]), 0)
  assert.strictEqual(calculateTrend([0.5]), 0)
})

test('calculateVariability computes standard deviation correctly', async (t) => {
  assert.strictEqual(calculateVariability([0.5, 0.5, 0.5, 0.5]), 0)

  const variability = calculateVariability([0.1, 0.2, 0.3, 0.4])
  assert.ok(variability > 0)
  assert.ok(Math.abs(variability - 0.1118) < 0.001)

  assert.strictEqual(calculateVariability([]), 0)
  assert.strictEqual(calculateVariability([0.5]), 0)
})

test('processPodMetrics computes pod metrics correctly', async (t) => {
  const podMetrics = createMockMetrics()
  const clusters = []

  const result = processPodMetrics(podMetrics, clusters, 0.9, 0.85)

  assert.ok(Math.abs(result.eluMean - 0.825) < 0.001)

  const expectedHeapMean = (1 + 1.2 + 1.4 + 1.6) / 4 / 8
  assert.ok(Math.abs(result.heapMean - expectedHeapMean) < 0.001)

  assert.ok(result.eluTrend > 0)
  assert.ok(result.heapTrend > 0)
  assert.ok(result.performanceScore === 1.0)
  assert.ok('eluScore' in result)
  assert.ok('heapScore' in result)
  assert.ok('shouldScale' in result)
})

test('getPerformanceSuccessScore returns default when no clusters exist', async (t) => {
  const podMetrics = {
    eluMean: 0.85,
    heapMean: 0.7,
    eluTrend: 0.05,
    heapTrend: 0.03
  }

  const score = getPerformanceSuccessScore(podMetrics, [])
  assert.strictEqual(score, 1.0)
})

test('getPerformanceSuccessScore calculates weighted average from clusters', async (t) => {
  const podMetrics = {
    eluMean: 0.85,
    heapMean: 0.7,
    eluTrend: 0.05,
    heapTrend: 0.03
  }

  const clusters = [
    {
      eluMean: 0.85,
      heapMean: 0.7,
      eluTrendMean: 0.05,
      heapTrendMean: 0.03,
      performanceScore: 0.8,
      weight: 2
    },
    {
      eluMean: 0.75,
      heapMean: 0.6,
      eluTrendMean: 0.02,
      heapTrendMean: 0.02,
      performanceScore: 0.6,
      weight: 1
    }
  ]

  const score = getPerformanceSuccessScore(podMetrics, clusters)

  assert.ok(score > 0.7)
  assert.ok(score < 0.81)
})

test('calculateEluScore correctly weighs components', async (t) => {
  let podMetrics = {
    eluMean: 0.8,
    eluTrend: 0,
    eluVariability: 0
  }
  const score1 = calculateEluScore(podMetrics, 1.0, 0.9)
  assert.strictEqual(score1, 0)

  podMetrics = {
    eluMean: 0.95,
    eluTrend: 0.05,
    eluVariability: 0.1
  }
  const score2 = calculateEluScore(podMetrics, 1.0, 0.9)
  assert.ok(score2 > 0.3)

  const score3 = calculateEluScore(podMetrics, 0.5, 0.9)
  assert.ok(Math.abs(score3 - score2 * 0.5) < 0.001)
})

test('calculateScalingDecision respects cooldown period', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()

  await store.valkey.set('scaler:last-scaling:app-1', Date.now().toString())

  const app = createMockApp(store, log)
  const algorithm = new ReactiveScalingAlgorithm(app)

  const podsMetrics = {
    'pod-1': {
      eventLoopUtilization: [{
        metric: { podId: 'pod-1' },
        values: [[Date.now(), '0.95']]
      }],
      heapSize: [{
        metric: { podId: 'pod-1' },
        values: [[Date.now(), (0.9 * 8 * 1024 * 1024 * 1024).toString()]]
      }]
    }
  }

  const result = await algorithm.calculateScalingDecision('app-1', podsMetrics, 1)

  assert.strictEqual(result.nfinal, 1, 'Should return current pod count during cooldown')
  assert.ok(result.reason === 'In cooldown period')
})

test('calculateScalingDecision respects maximum pods limit', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()

  await store.valkey.set('scaler:last-scaling:app-1', (Date.now() - 600000).toString())

  const options = {
    maxPodsDefault: 5
  }

  const app = createMockApp(store, log)
  const algorithm = new ReactiveScalingAlgorithm(app, options)

  const highLoadMetrics = {
    'pod-1': {
      eventLoopUtilization: [{
        metric: { podId: 'pod-1' },
        values: [[Date.now(), '0.95']]
      }],
      heapSize: [{
        metric: { podId: 'pod-1' },
        values: [[Date.now(), (0.8 * 8 * 1024 * 1024 * 1024).toString()]]
      }]
    }
  }

  const result = await algorithm.calculateScalingDecision('app-1', highLoadMetrics, 5)

  // We're already at the max, so nfinal should be the current count (5)
  assert.strictEqual(result.nfinal, 5, 'Should return current pod count when at maximum')
})

test('calculateScalingDecision computes nfinal correctly with alerts', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()

  await store.valkey.set('scaler:last-scaling:app-1', (Date.now() - 600000).toString())

  const app = createMockApp(store, log)
  const algorithm = new ReactiveScalingAlgorithm(app)

  const highLoadMetrics = {
    'pod-1': {
      eventLoopUtilization: [{
        metric: { podId: 'pod-1' },
        values: [[Date.now(), '0.95']]
      }],
      heapSize: [{
        metric: { podId: 'pod-1' },
        values: [[Date.now(), (0.9 * 8 * 1024 * 1024 * 1024).toString()]]
      }]
    }
  }

  // Alerts are required for scale-up
  const alerts = [{
    podId: 'pod-1',
    serviceId: 'service-1',
    elu: 0.95,
    heapUsed: 0.9 * 8 * 1024 * 1024 * 1024,
    heapTotal: 8 * 1024 * 1024 * 1024,
    unhealthy: true
  }]

  const currentPodCount = 2
  const result = await algorithm.calculateScalingDecision('app-1', highLoadMetrics, currentPodCount, undefined, undefined, alerts)

  // New nfinal should be greater than current pod count when scaling up
  assert.ok(result.nfinal > currentPodCount, 'Should scale up from current pod count')
  // The maximum scale up should not exceed current + 8
  assert.ok(result.nfinal <= currentPodCount + 8, 'Should not scale up by more than 8 pods')
  // Should have the correct reason for scaling up with pod details
  assert.ok(result.reason.includes('Scaling up'), 'Reason should indicate scaling up')
  assert.ok(result.reason.includes('pod-1'), 'Reason should mention triggering pod')
  assert.ok(result.reason.includes('ELU'), 'Reason should mention ELU metric')
  assert.ok(result.reason.includes('95.0%'), 'Reason should show ELU percentage')
  assert.ok(result.reason.includes('heap'), 'Reason should mention heap metric')
})

test('updateClusters creates new cluster when none exist', async (t) => {
  const store = await setupStore(t)

  const newEvent = {
    timestamp: 1620000000,
    podsAdded: 1,
    preEluMean: 0.8,
    preHeapMean: 0.7,
    preEluTrend: 0.05,
    preHeapTrend: 0.03,
    deltaElu: -0.1,
    deltaHeap: -0.05,
    sigmaElu: 0.1,
    sigmaHeap: 0.1
  }

  const clusters = await updateClusters(store, 'app-1', newEvent)

  assert.strictEqual(clusters.length, 1)
  assert.strictEqual(clusters[0].eluMean, 0.8)
  assert.strictEqual(clusters[0].weight, 1)
  assert.ok(clusters[0].performanceScore >= 0 && clusters[0].performanceScore <= 1)
})

test('updateClusters updates closest cluster when similar', async (t) => {
  const store = await setupStore(t)

  await updateClusters(store, 'app-1', {
    timestamp: 1620000000,
    podsAdded: 1,
    preEluMean: 0.8,
    preHeapMean: 0.7,
    preEluTrend: 0.05,
    preHeapTrend: 0.03,
    deltaElu: -0.1,
    deltaHeap: -0.05,
    sigmaElu: 0.1,
    sigmaHeap: 0.1
  })

  const newEvent = {
    timestamp: 1620000600,
    podsAdded: 1,
    preEluMean: 0.82,
    preHeapMean: 0.71,
    preEluTrend: 0.06,
    preHeapTrend: 0.04,
    deltaElu: -0.12,
    deltaHeap: -0.06,
    sigmaElu: 0.11,
    sigmaHeap: 0.11
  }

  const clusters = await updateClusters(store, 'app-1', newEvent)

  assert.strictEqual(clusters.length, 1)
  assert.strictEqual(clusters[0].weight, 2)
  assert.ok(Math.abs(clusters[0].eluMean - 0.81) < 0.01)
})

test('calculateScalingDecision enforces minimum pod count', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()

  // Initialize the scaling algorithm with default min/max pods
  const app = createMockApp(store, log)
  const algorithm = new ReactiveScalingAlgorithm(app, {
    minPodsDefault: 3,
    maxPodsDefault: 10
  })

  // Set last scaling time to be outside the cooldown period
  await store.valkey.set('scaler:last-scaling:app-1', (Date.now() - 600000).toString())

  // Test 1: Current pod count below the minimum should scale up
  const result1 = await algorithm.calculateScalingDecision(
    'app-1',
    {}, // Empty metrics
    1, // Current pod count (below minimum)
    3, // minPods
    10 // maxPods
  )

  assert.strictEqual(result1.nfinal, 3, 'Should scale up to exact minimum of 3')
  assert.strictEqual(result1.reason, 'Scaling to reach minimum pod count', 'Reason should indicate scaling to minimum')

  // Test 2: Current pod count at the minimum should not trigger minimum scaling
  const result2 = await algorithm.calculateScalingDecision(
    'app-2',
    {}, // Empty metrics
    3, // Current pod count (at minimum)
    3, // minPods
    10 // maxPods
  )

  assert.strictEqual(result2.nfinal, 3, 'Should return current pod count when at minimum')
  assert.strictEqual(result2.reason, 'No pods triggered scaling', 'Reason should indicate no scaling needed')

  // Test 3: Using default minPods when not provided
  const result3 = await algorithm.calculateScalingDecision(
    'app-3',
    {}, // Empty metrics
    1, // Current pod count (below default minimum)
    undefined, // No minPods provided, should use default
    undefined // No maxPods provided, should use default
  )

  assert.strictEqual(result3.nfinal, 3, 'Should scale up to default minimum of 3')
  assert.strictEqual(result3.reason, 'Scaling to reach minimum pod count', 'Reason should indicate scaling to minimum')

  // Test 4: Overriding the default minPods
  const result4 = await algorithm.calculateScalingDecision(
    'app-4',
    {}, // Empty metrics
    2, // Current pod count (below custom minimum)
    5, // minPods (custom value, higher than default)
    10 // maxPods
  )

  assert.strictEqual(result4.nfinal, 5, 'Should scale up to custom minimum of 5')
  assert.strictEqual(result4.reason, 'Scaling to reach minimum pod count', 'Reason should indicate scaling to minimum')
})

// New tests for alerts and scaling based on metrics

test('calculateScalingDecision scales up with alerts', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()

  // Set last scaling time to be outside the cooldown period
  await store.valkey.set('scaler:last-scaling:app-1', (Date.now() - 600000).toString())

  const app = createMockApp(store, log)
  const algorithm = new ReactiveScalingAlgorithm(app)

  // Mock implementation of processPodMetrics
  const originalProcessPodMetrics = algorithm.processPodMetrics
  algorithm.processPodMetrics = function (metrics, clusters) {
    // Check if metrics came from an alert
    const isAlert = metrics.eventLoopUtilization.some(data =>
      data.values.length === 1 && data.values[0][1] > 0.9
    )

    if (isAlert) {
      return {
        eluMean: 0.92,
        heapMean: 0.8,
        eluTrend: 0.05,
        heapTrend: 0.04,
        eluVariability: 0.1,
        heapVariability: 0.1,
        performanceScore: 1.0,
        eluScore: 0.8,
        heapScore: 0.6,
        shouldScale: true
      }
    }

    return originalProcessPodMetrics.call(this, metrics, clusters)
  }

  // Create test alerts
  const alerts = [
    {
      podId: 'pod-alert',
      serviceId: 'service-1',
      elu: 0.95, // 95% ELU
      heapUsed: 6000000000,
      heapTotal: 8000000000,
      unhealthy: true,
      timestamp: Date.now(),
      healthHistory: []
    }
  ]

  // Empty pod metrics (all metrics will come from alerts)
  const podsMetrics = {}

  // Current pod count of 3
  const currentPodCount = 3

  // Execute the scaling decision
  const result = await algorithm.calculateScalingDecision(
    'app-1',
    podsMetrics,
    currentPodCount,
    1, // minPods
    10 // maxPods
    , alerts
  )

  // Should scale up from current pod count when alert triggers
  assert.ok(result.nfinal > currentPodCount, 'Should scale up when alert indicates high ELU')
  assert.ok(result.reason.includes('Scaling up'), 'Reason should indicate scaling up')
  assert.ok(result.reason.includes('pod-alert'), 'Reason should mention triggering pod')
  assert.ok(result.reason.includes('ELU'), 'Reason should mention ELU metric')
  assert.ok(result.reason.includes('%'), 'Reason should show metric percentage')
})

test('calculateScalingDecision does NOT scale up with high metrics without alerts', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()

  // Set last scaling time to be outside the cooldown period
  await store.valkey.set('scaler:last-scaling:app-1', (Date.now() - 600000).toString())

  const app = createMockApp(store, log)
  const algorithm = new ReactiveScalingAlgorithm(app)

  // Create high load pod metrics that would normally trigger scaling
  const highLoadPodMetrics = {
    'pod-1': {
      eventLoopUtilization: [{
        metric: { podId: 'pod-1' },
        values: [[Date.now(), '0.95']] // 95% ELU - would trigger scaling if alerts present
      }],
      heapSize: [{
        metric: { podId: 'pod-1' },
        values: [[Date.now(), (0.9 * 8 * 1024 * 1024 * 1024).toString()]] // 90% heap
      }]
    }
  }

  // Current pod count of 3
  const currentPodCount = 3

  // Execute the scaling decision WITHOUT alerts (simulating periodic check)
  const result = await algorithm.calculateScalingDecision(
    'app-1',
    highLoadPodMetrics,
    currentPodCount,
    1, // minPods
    10 // maxPods
    // No alerts - periodic check can only scale down
  )

  // Should NOT scale up without alerts (periodic check can only scale down)
  assert.strictEqual(result.nfinal, currentPodCount, 'Should NOT scale up without alerts')
  assert.ok(result.reason.includes('periodic check can only scale down'), 'Reason should explain limitation')
})

test('calculateScalingDecision maintains pod count with normal metrics', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()

  // Set last scaling time to be outside the cooldown period
  await store.valkey.set('scaler:last-scaling:app-1', (Date.now() - 600000).toString())

  const app = createMockApp(store, log)
  const algorithm = new ReactiveScalingAlgorithm(app)

  // Create normal load pod metrics that should not trigger scaling
  const normalLoadPodMetrics = {
    'pod-1': {
      eventLoopUtilization: [{
        metric: { podId: 'pod-1', applicationId: 'app-1' },
        values: Array(10).fill().map((_, i) => [Date.now() + i, '0.80'])
      }],
      heapSize: [{
        metric: { podId: 'pod-1', applicationId: 'app-1' },
        values: Array(10).fill().map((_, i) => [Date.now() + i, (5 * 1024 * 1024 * 1024).toString()])
      }]
    }
  }

  // Current pod count of 5
  const currentPodCount = 5

  // Execute the scaling decision
  const result = await algorithm.calculateScalingDecision(
    'app-1',
    normalLoadPodMetrics,
    currentPodCount,
    1, // minPods
    10 // maxPods
  )

  // Should maintain current pod count when metrics are normal
  assert.strictEqual(result.nfinal, currentPodCount, 'Should maintain current pod count when metrics are normal')
  assert.strictEqual(result.reason, 'No pods triggered scaling', 'Reason should indicate no scaling needed')
})

test('calculateScalingDecision with low metrics should scale down', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()

  // Set last scaling time to be outside the cooldown period
  await store.valkey.set('scaler:last-scaling:app-1', (Date.now() - 600000).toString())

  const app = createMockApp(store, log)
  const algorithm = new ReactiveScalingAlgorithm(app)

  // Create very low load pod metrics (well below 50% of thresholds)
  const lowLoadPodMetrics = {
    'pod-1': {
      eventLoopUtilization: [{
        metric: { podId: 'pod-1', applicationId: 'app-1' },
        values: Array(10).fill().map((_, i) => [Date.now() + i, '0.30'])
      }],
      heapSize: [{
        metric: { podId: 'pod-1', applicationId: 'app-1' },
        values: Array(10).fill().map((_, i) => [Date.now() + i, (2 * 1024 * 1024 * 1024).toString()])
      }]
    }
  }

  // Current pod count of 5, well above minimum of 2
  const currentPodCount = 5
  const minPods = 2

  // Execute the scaling decision
  const result = await algorithm.calculateScalingDecision(
    'app-1',
    lowLoadPodMetrics,
    currentPodCount,
    minPods,
    10 // maxPods
  )

  // The improved algorithm should now scale down with low metrics
  assert.ok(result.nfinal < currentPodCount, 'Should scale down when metrics are low')
  assert.ok(result.nfinal >= minPods, 'Should not scale below minimum pod count')
  assert.ok(result.reason.includes('Scaling down'), 'Reason should indicate scaling down')
  assert.ok(result.reason.includes('Low utilization'), 'Reason should mention low utilization')
  assert.ok(result.reason.includes('ELU'), 'Reason should mention ELU metric')
  assert.ok(result.reason.includes('30.0%'), 'Reason should show ELU percentage')
  assert.ok(result.reason.includes('threshold'), 'Reason should mention threshold values')
})

test('calculateScalingDecision should respect minimum pod count when scaling down', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()

  // Set last scaling time to be outside the cooldown period
  await store.valkey.set('scaler:last-scaling:app-1', (Date.now() - 600000).toString())

  const app = createMockApp(store, log)
  const algorithm = new ReactiveScalingAlgorithm(app)

  // Create very low load pod metrics
  const lowLoadPodMetrics = {
    'pod-1': {
      eventLoopUtilization: [{
        metric: { podId: 'pod-1', applicationId: 'app-1' },
        values: Array(10).fill().map((_, i) => [Date.now() + i, '0.20'])
      }],
      heapSize: [{
        metric: { podId: 'pod-1', applicationId: 'app-1' },
        values: Array(10).fill().map((_, i) => [Date.now() + i, (1 * 1024 * 1024 * 1024).toString()])
      }]
    }
  }

  // Current pod count just above minimum
  const currentPodCount = 3
  const minPods = 2

  // Execute the scaling decision
  const result = await algorithm.calculateScalingDecision(
    'app-1',
    lowLoadPodMetrics,
    currentPodCount,
    minPods,
    10 // maxPods
  )

  // Should not scale below minimum
  assert.ok(result.nfinal >= minPods, 'Should not scale below minimum pod count')
  assert.ok(result.nfinal < currentPodCount, 'Should still scale down when above minimum')
})

test('calculateScalingDecision should not scale down when in cooldown period', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()

  // Set last scaling time to be inside the cooldown period
  await store.valkey.set('scaler:last-scaling:app-1', Date.now().toString())

  const app = createMockApp(store, log)
  const algorithm = new ReactiveScalingAlgorithm(app)

  // Create very low load pod metrics
  const lowLoadPodMetrics = {
    'pod-1': {
      eventLoopUtilization: [{
        metric: { podId: 'pod-1', applicationId: 'app-1' },
        values: Array(10).fill().map((_, i) => [Date.now() + i, '0.20'])
      }],
      heapSize: [{
        metric: { podId: 'pod-1', applicationId: 'app-1' },
        values: Array(10).fill().map((_, i) => [Date.now() + i, (1 * 1024 * 1024 * 1024).toString()])
      }]
    }
  }

  // Current pod count of 5
  const currentPodCount = 5

  // Execute the scaling decision
  const result = await algorithm.calculateScalingDecision(
    'app-1',
    lowLoadPodMetrics,
    currentPodCount,
    2, // minPods
    10 // maxPods
  )

  // Should not scale during cooldown
  assert.strictEqual(result.nfinal, currentPodCount, 'Should not scale down during cooldown period')
  assert.strictEqual(result.reason, 'In cooldown period', 'Reason should indicate cooldown period')
})
