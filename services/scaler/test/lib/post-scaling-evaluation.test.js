'use strict'

// Ensure post-scaling evaluation is not skipped for these tests
delete process.env.SKIP_POST_SCALING_EVALUATION

const { test } = require('node:test')
const assert = require('node:assert')
const { setTimeout } = require('node:timers/promises')
const ReactiveScalingAlgorithm = require('../../lib/reactive-scaling-algorithm')
const PerformanceHistory = require('../../lib/performance-history')
const { processPodMetrics, updateClusters } = require('../../lib/scaling-algorithm-utils')
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

function createMockApp (store, log, metrics) {
  return {
    store,
    log,
    scalerMetrics: metrics
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

function createMockMetricsService () {
  const metricsData = new Map()

  return {
    getApplicationMetrics: async (applicationId) => {
      return metricsData.get(applicationId) || {}
    },
    setApplicationMetrics: (applicationId, metrics) => {
      metricsData.set(applicationId, metrics)
    }
  }
}

function createPostScalingMetrics (eluMean = 0.7, heapMean = 0.65) {
  return {
    'pod-1': {
      eventLoopUtilization: [{
        metric: { podId: 'pod-1' },
        values: [
          [Date.now(), eluMean.toString()],
          [Date.now() + 1000, (eluMean + 0.01).toString()],
          [Date.now() + 2000, (eluMean - 0.01).toString()]
        ]
      }],
      heapSize: [{
        metric: { podId: 'pod-1' },
        values: [
          [Date.now(), (heapMean * 8 * 1024 * 1024 * 1024).toString()],
          [Date.now() + 1000, ((heapMean + 0.01) * 8 * 1024 * 1024 * 1024).toString()],
          [Date.now() + 2000, ((heapMean - 0.01) * 8 * 1024 * 1024 * 1024).toString()]
        ]
      }]
    }
  }
}

test('performPostScalingEvaluation updates event with post-scaling metrics', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()
  const metricsService = createMockMetricsService()

  const app = createMockApp(store, log, metricsService)
  const algorithm = new ReactiveScalingAlgorithm(app)

  const scalingTimestamp = Date.now()
  const initialEvent = {
    timestamp: scalingTimestamp,
    podsAdded: 2,
    preEluMean: 0.9,
    preHeapMean: 0.85,
    preEluTrend: 0.05,
    preHeapTrend: 0.03,
    deltaElu: 0,
    deltaHeap: 0,
    sigmaElu: 0,
    sigmaHeap: 0
  }

  await store.addPerfHistoryEvent('app-1', initialEvent, 10)
  metricsService.setApplicationMetrics('app-1', createPostScalingMetrics(0.7, 0.65))
  const performanceHistory = new PerformanceHistory(app)
  await performanceHistory.postScalingEvaluation({
    applicationId: 'app-1',
    scalingTimestamp,
    store,
    log,
    metrics: metricsService,
    eluThreshold: algorithm.eluThreshold,
    heapThreshold: algorithm.heapThreshold
  })

  const history = await store.loadPerfHistory('app-1')
  const updatedEvent = history.find(e => e.timestamp === scalingTimestamp)

  assert.ok(updatedEvent, 'Event should exist in history')
  assert.ok(updatedEvent.deltaElu < 0, 'Delta ELU should be negative (improvement)')
  assert.ok(updatedEvent.deltaHeap < 0, 'Delta heap should be negative (improvement)')
  assert.ok(updatedEvent.sigmaElu >= 0, 'Sigma ELU should be non-negative')
  assert.ok(updatedEvent.sigmaHeap >= 0, 'Sigma heap should be non-negative')

  const clusters = await store.loadClusters('app-1')
  assert.ok(clusters.length > 0, 'Clusters should be created/updated')
})

test('performPostScalingEvaluation handles missing event gracefully', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()
  const metricsService = createMockMetricsService()

  const app = createMockApp(store, log, metricsService)
  const algorithm = new ReactiveScalingAlgorithm(app)

  const performanceHistory = new PerformanceHistory(app)
  await performanceHistory.postScalingEvaluation({
    applicationId: 'app-1',
    scalingTimestamp: Date.now(),
    store,
    log,
    metrics: metricsService,
    eluThreshold: algorithm.eluThreshold,
    heapThreshold: algorithm.heapThreshold
  })

  const logs = log.getLogs()
  const warningLog = logs.find(l => l.level === 'warn' && l.msg.includes('event not found'))
  assert.ok(warningLog, 'Should log warning for missing event')
})

test('performPostScalingEvaluation handles metrics service errors', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()

  const metricsService = {
    getApplicationMetrics: async () => {
      throw new Error('Metrics service unavailable')
    }
  }

  const app = createMockApp(store, log, metricsService)
  const algorithm = new ReactiveScalingAlgorithm(app)

  const scalingTimestamp = Date.now()
  await store.addPerfHistoryEvent('app-1', {
    timestamp: scalingTimestamp,
    podsAdded: 1,
    preEluMean: 0.9,
    preHeapMean: 0.85,
    preEluTrend: 0,
    preHeapTrend: 0,
    deltaElu: 0,
    deltaHeap: 0,
    sigmaElu: 0,
    sigmaHeap: 0
  }, 10)

  const performanceHistory = new PerformanceHistory(app)
  await performanceHistory.postScalingEvaluation({
    applicationId: 'app-1',
    scalingTimestamp,
    store,
    log,
    metrics: metricsService,
    eluThreshold: algorithm.eluThreshold,
    heapThreshold: algorithm.heapThreshold
  })

  const logs = log.getLogs()
  const errorLog = logs.find(l => l.level === 'error' && l.msg.includes('Error fetching metrics'))
  assert.ok(errorLog, 'Should log error when metrics service fails')
})

test('performPostScalingEvaluation handles no metrics available', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()
  const metricsService = createMockMetricsService()

  const app = createMockApp(store, log, metricsService)
  const algorithm = new ReactiveScalingAlgorithm(app)

  const scalingTimestamp = Date.now()
  await store.addPerfHistoryEvent('app-1', {
    timestamp: scalingTimestamp,
    podsAdded: 1,
    preEluMean: 0.9,
    preHeapMean: 0.85,
    preEluTrend: 0,
    preHeapTrend: 0,
    deltaElu: 0,
    deltaHeap: 0,
    sigmaElu: 0,
    sigmaHeap: 0
  }, 10)

  metricsService.setApplicationMetrics('app-1', {})
  const performanceHistory = new PerformanceHistory(app)
  await performanceHistory.postScalingEvaluation({
    applicationId: 'app-1',
    scalingTimestamp,
    store,
    log,
    metrics: metricsService,
    eluThreshold: algorithm.eluThreshold,
    heapThreshold: algorithm.heapThreshold
  })

  const logs = log.getLogs()
  const warningLog = logs.find(l => l.level === 'warn' && l.msg.includes('no metrics available'))
  assert.ok(warningLog, 'Should log warning when no metrics available')
})

test('performPostScalingEvaluation calculates performance score correctly', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()
  const metricsService = createMockMetricsService()

  const app = createMockApp(store, log, metricsService)
  const algorithm = new ReactiveScalingAlgorithm(app)

  const scalingTimestamp = Date.now()
  await store.addPerfHistoryEvent('app-1', {
    timestamp: scalingTimestamp,
    podsAdded: 3,
    preEluMean: 0.95,
    preHeapMean: 0.9,
    preEluTrend: 0.1,
    preHeapTrend: 0.08,
    deltaElu: 0,
    deltaHeap: 0,
    sigmaElu: 0,
    sigmaHeap: 0
  }, 10)

  metricsService.setApplicationMetrics('app-1', createPostScalingMetrics(0.6, 0.55))
  const performanceHistory = new PerformanceHistory(app)
  await performanceHistory.postScalingEvaluation({
    applicationId: 'app-1',
    scalingTimestamp,
    store,
    log,
    metrics: metricsService,
    eluThreshold: algorithm.eluThreshold,
    heapThreshold: algorithm.heapThreshold
  })

  const logs = log.getLogs()
  const performanceLog = logs.find(l =>
    l.level === 'info' &&
    l.msg === 'Post-scaling evaluation completed' &&
    l.data.performance !== undefined
  )

  assert.ok(performanceLog, 'Should log performance score')
  assert.ok(performanceLog.data.performance > 0.5, 'Performance score should be good for significant improvement')
  assert.ok(performanceLog.data.deltaElu < -0.3, 'Should show significant ELU improvement')
  assert.ok(performanceLog.data.deltaHeap < -0.3, 'Should show significant heap improvement')
})

test('schedulePostScalingEvaluation schedules evaluation after delay', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()
  const metricsService = createMockMetricsService()
  const app = createMockApp(store, log, metricsService)
  const algorithm = new ReactiveScalingAlgorithm(app, {
    postScalingWindow: 0.1
  })

  metricsService.setApplicationMetrics('app-1', createPostScalingMetrics(0.7, 0.65))

  // Test the scheduling through applyScaling
  const performanceHistory = new PerformanceHistory(app)
  await performanceHistory.scalingEvaluation({
    applicationId: 'app-1',
    actualPodsChange: 1, // 2 - 1 = 1 pod added
    preMetrics: { eluMean: 0.9, heapMean: 0.85, eluTrend: 0, heapTrend: 0 },
    source: 'signal',
    postScalingWindow: 0.1,
    maxHistoryEvents: 10,
    eluThreshold: algorithm.eluThreshold,
    heapThreshold: algorithm.heapThreshold
  })

  // Get the new event created by applyScaling
  const immediateHistory = await store.loadPerfHistory('app-1')
  // Find the most recent event (should be the one we just created)
  const newEvent = immediateHistory[immediateHistory.length - 1]

  // The deltaElu should be 0 initially (not calculated yet)
  assert.strictEqual(newEvent.deltaElu, 0, 'Evaluation should not be called immediately')

  await setTimeout(150)

  // After delay, evaluation should have run and updated the event
  const finalHistory = await store.loadPerfHistory('app-1')
  const finalEvent = finalHistory.find(e => e.timestamp === newEvent.timestamp)
  assert.notStrictEqual(finalEvent.deltaElu, 0, 'Evaluation should be called after delay')
})

test('schedulePostScalingEvaluation handles errors in evaluation', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()
  // Create a performance history event first
  await store.addPerfHistoryEvent('app-1', {
    timestamp: Date.now(),
    podsAdded: 1,
    preEluMean: 0.9,
    preHeapMean: 0.85,
    preEluTrend: 0,
    preHeapTrend: 0,
    deltaElu: 0,
    deltaHeap: 0,
    sigmaElu: 0,
    sigmaHeap: 0
  }, 10)

  // Create a store that will fail during the evaluation phase
  const originalLoadPerfHistory = store.loadPerfHistory
  let callCount = 0
  store.loadPerfHistory = async (applicationId) => {
    callCount++
    if (callCount > 1) {
      // Fail on subsequent calls (during evaluation)
      throw new Error('Evaluation failed')
    }
    // Succeed on first call (during applyScaling)
    return originalLoadPerfHistory.call(store, applicationId)
  }

  // Test the error handling through applyScaling
  const testApp2 = createMockApp(store, log)
  const performanceHistory = new PerformanceHistory(testApp2)
  await performanceHistory.scalingEvaluation({
    applicationId: 'app-1',
    actualPodsChange: 1, // 2 - 1 = 1 pod added
    preMetrics: { eluMean: 0.9, heapMean: 0.85, eluTrend: 0, heapTrend: 0 },
    source: 'signal',
    postScalingWindow: 0.1,
    maxHistoryEvents: 10,
    eluThreshold: 0.9,
    heapThreshold: 0.85
  })

  await setTimeout(150)

  const logs = log.getLogs()
  const errorLog = logs.find(l => l.level === 'error' && l.msg.includes('Error in post-scaling evaluation'))
  assert.ok(errorLog, 'Should log error when evaluation fails')
})

test('Integration: full post-scaling evaluation cycle', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()
  const metricsService = createMockMetricsService()

  const app = createMockApp(store, log, metricsService)
  const algorithm = new ReactiveScalingAlgorithm(app, {
    cooldownPeriod: 0.1,
    postScalingWindow: 0.1
  })

  const highLoadMetrics = {
    'pod-1': {
      eventLoopUtilization: [{
        metric: { podId: 'pod-1' },
        values: [[Date.now(), '0.96']]
      }],
      heapSize: [{
        metric: { podId: 'pod-1' },
        values: [[Date.now(), (0.88 * 8 * 1024 * 1024 * 1024).toString()]]
      }]
    }
  }

  const alerts = [{
    id: 1,
    podId: 'pod-1',
    serviceId: 'service-1',
    applicationId: 'app-1',
    elu: 0.96,
    heapUsed: 0.88 * 8 * 1024 * 1024 * 1024,
    heapTotal: 8 * 1024 * 1024 * 1024,
    timestamp: Date.now()
  }]

  const result = await algorithm.calculateScalingDecision(
    'app-1',
    highLoadMetrics,
    2,
    1,
    10,
    alerts
  )

  assert.ok(result.nfinal > 2, 'Should scale up')
  assert.ok(result.reason.includes('Scaling up'), 'Reason should indicate scaling up')
  assert.ok(result.reason.includes('pod-1'), 'Reason should mention triggering pod')
  assert.ok(result.reason.includes('ELU'), 'Reason should mention ELU metric')
  assert.ok(result.reason.includes('%'), 'Reason should show metric percentage')

  const history = await store.loadPerfHistory('app-1')
  assert.strictEqual(history.length, 1, 'Should have one history event')
  assert.strictEqual(history[0].deltaElu, 0, 'Initial delta should be 0')

  metricsService.setApplicationMetrics('app-1', createPostScalingMetrics(0.7, 0.65))

  await setTimeout(150)

  const updatedHistory = await store.loadPerfHistory('app-1')
  const updatedEvent = updatedHistory[0]

  assert.ok(updatedEvent.deltaElu < 0, 'Delta ELU should show improvement')
  assert.ok(updatedEvent.deltaHeap < 0, 'Delta heap should show improvement')

  const clusters = await store.loadClusters('app-1')
  assert.ok(clusters.length > 0, 'Should have created clusters')
  assert.ok(clusters[0].performanceScore > 0, 'Cluster should have performance score')
})

test('Integration: multiple scaling events create performance history', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()
  const metricsService = createMockMetricsService()

  const app = createMockApp(store, log, metricsService)
  const algorithm = new ReactiveScalingAlgorithm(app, {
    maxHistoryEvents: 3,
    maxClusters: 2
  })

  for (let i = 0; i < 5; i++) {
    const timestamp = Date.now() - (i * 1000)

    await store.addPerfHistoryEvent('app-1', {
      timestamp,
      podsAdded: i + 1,
      preEluMean: 0.9 - (i * 0.05),
      preHeapMean: 0.85 - (i * 0.05),
      preEluTrend: 0.05,
      preHeapTrend: 0.03,
      deltaElu: 0,
      deltaHeap: 0,
      sigmaElu: 0,
      sigmaHeap: 0
    }, 3)

    const postElu = 0.7 - (i * 0.05)
    const postHeap = 0.65 - (i * 0.05)
    metricsService.setApplicationMetrics('app-1', createPostScalingMetrics(postElu, postHeap))

    const performanceHistory = new PerformanceHistory(app)
    await performanceHistory.postScalingEvaluation({
      applicationId: 'app-1',
      scalingTimestamp: timestamp,
      store,
      log,
      metrics: metricsService,
      processPodMetrics: (podMetrics, clusters) => processPodMetrics(podMetrics, clusters, algorithm.eluThreshold, algorithm.heapThreshold),
      updateClusters: (applicationId, newEvent) => updateClusters(store, applicationId, newEvent),
      eluThreshold: algorithm.eluThreshold,
      heapThreshold: algorithm.heapThreshold
    })
  }

  const history = await store.loadPerfHistory('app-1')
  assert.strictEqual(history.length, 3, 'History should be limited to maxHistoryEvents')

  const clusters = await store.loadClusters('app-1')
  assert.ok(clusters.length <= 2, 'Clusters should be limited to maxClusters')

  for (const event of history) {
    assert.ok(event.deltaElu !== 0 || event.deltaHeap !== 0, 'Event should have been evaluated')
  }
})

test('Post-scaling evaluation updates cluster weights correctly', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()
  const metricsService = createMockMetricsService()

  const app = createMockApp(store, log, metricsService)
  const algorithm = new ReactiveScalingAlgorithm(app)

  for (let i = 0; i < 2; i++) {
    const timestamp = Date.now() - (i * 1000)

    await store.addPerfHistoryEvent('app-1', {
      timestamp,
      podsAdded: 2,
      preEluMean: 0.9,
      preHeapMean: 0.85,
      preEluTrend: 0.05,
      preHeapTrend: 0.03,
      deltaElu: 0,
      deltaHeap: 0,
      sigmaElu: 0,
      sigmaHeap: 0
    })

    metricsService.setApplicationMetrics('app-1', createPostScalingMetrics(0.7, 0.65))

    const performanceHistory = new PerformanceHistory(app)
    await performanceHistory.postScalingEvaluation({
      applicationId: 'app-1',
      scalingTimestamp: timestamp,
      store,
      log,
      metrics: metricsService,
      processPodMetrics: (podMetrics, clusters) => processPodMetrics(podMetrics, clusters, algorithm.eluThreshold, algorithm.heapThreshold),
      updateClusters: (applicationId, newEvent) => updateClusters(store, applicationId, newEvent),
      eluThreshold: algorithm.eluThreshold,
      heapThreshold: algorithm.heapThreshold
    })
  }

  const clusters = await store.loadClusters('app-1')
  assert.strictEqual(clusters.length, 1, 'Should have one cluster for similar events')
  assert.ok(clusters[0].weight > 1, 'Cluster weight should increase with similar events')
})
