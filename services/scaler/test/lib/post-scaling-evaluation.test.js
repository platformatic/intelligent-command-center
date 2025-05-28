'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { setTimeout } = require('node:timers/promises')
const ScalingAlgorithm = require('../../lib/scaling-algorithm')
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
  const store = new Store(valkeyConnectionString, createMockLog())

  // Clean up before test
  const keys = await store.redis.keys('scaler:*')
  if (keys.length > 0) {
    await store.redis.del(keys)
  }

  // Register cleanup after test
  t.after(async () => {
    const keys = await store.redis.keys('scaler:*')
    if (keys.length > 0) {
      await store.redis.del(keys)
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

  const algorithm = new ScalingAlgorithm(store, log, { metrics: metricsService })

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

  await algorithm.addPerfHistoryEvent('app-1', initialEvent)
  metricsService.setApplicationMetrics('app-1', createPostScalingMetrics(0.7, 0.65))
  await algorithm.performPostScalingEvaluation('app-1', scalingTimestamp)

  const history = await algorithm.loadPerfHistory('app-1')
  const updatedEvent = history.find(e => e.timestamp === scalingTimestamp)

  assert.ok(updatedEvent, 'Event should exist in history')
  assert.ok(updatedEvent.deltaElu < 0, 'Delta ELU should be negative (improvement)')
  assert.ok(updatedEvent.deltaHeap < 0, 'Delta heap should be negative (improvement)')
  assert.ok(updatedEvent.sigmaElu >= 0, 'Sigma ELU should be non-negative')
  assert.ok(updatedEvent.sigmaHeap >= 0, 'Sigma heap should be non-negative')

  const clusters = await algorithm.loadClusters('app-1')
  assert.ok(clusters.length > 0, 'Clusters should be created/updated')
})

test('performPostScalingEvaluation handles missing event gracefully', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()
  const metricsService = createMockMetricsService()

  const algorithm = new ScalingAlgorithm(store, log, { metrics: metricsService })

  await algorithm.performPostScalingEvaluation('app-1', Date.now())

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

  const algorithm = new ScalingAlgorithm(store, log, { metrics: metricsService })

  const scalingTimestamp = Date.now()
  await algorithm.addPerfHistoryEvent('app-1', {
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
  })

  await algorithm.performPostScalingEvaluation('app-1', scalingTimestamp)

  const logs = log.getLogs()
  const errorLog = logs.find(l => l.level === 'error' && l.msg.includes('Error fetching metrics'))
  assert.ok(errorLog, 'Should log error when metrics service fails')
})

test('performPostScalingEvaluation handles no metrics available', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()
  const metricsService = createMockMetricsService()

  const algorithm = new ScalingAlgorithm(store, log, { metrics: metricsService })

  const scalingTimestamp = Date.now()
  await algorithm.addPerfHistoryEvent('app-1', {
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
  })

  metricsService.setApplicationMetrics('app-1', {})
  await algorithm.performPostScalingEvaluation('app-1', scalingTimestamp)

  const logs = log.getLogs()
  const warningLog = logs.find(l => l.level === 'warn' && l.msg.includes('no metrics available'))
  assert.ok(warningLog, 'Should log warning when no metrics available')
})

test('performPostScalingEvaluation calculates performance score correctly', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()
  const metricsService = createMockMetricsService()

  const algorithm = new ScalingAlgorithm(store, log, { metrics: metricsService })

  const scalingTimestamp = Date.now()
  await algorithm.addPerfHistoryEvent('app-1', {
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
  })

  metricsService.setApplicationMetrics('app-1', createPostScalingMetrics(0.6, 0.55))
  await algorithm.performPostScalingEvaluation('app-1', scalingTimestamp)

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

  const algorithm = new ScalingAlgorithm(store, log, {
    metrics: metricsService,
    postScalingWindow: 0.1
  })

  const scalingTimestamp = Date.now()
  await algorithm.addPerfHistoryEvent('app-1', {
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
  })

  metricsService.setApplicationMetrics('app-1', createPostScalingMetrics(0.7, 0.65))

  let evaluationCalled = false
  const originalPerform = algorithm.performPostScalingEvaluation
  algorithm.performPostScalingEvaluation = async function (...args) {
    evaluationCalled = true
    return originalPerform.apply(this, args)
  }

  algorithm.schedulePostScalingEvaluation('app-1', scalingTimestamp)

  assert.ok(!evaluationCalled, 'Evaluation should not be called immediately')

  await setTimeout(150)

  assert.ok(evaluationCalled, 'Evaluation should be called after delay')
})

test('schedulePostScalingEvaluation handles errors in evaluation', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()

  const algorithm = new ScalingAlgorithm(store, log, {
    postScalingWindow: 0.1
  })

  algorithm.performPostScalingEvaluation = async () => {
    throw new Error('Evaluation failed')
  }

  algorithm.schedulePostScalingEvaluation('app-1', Date.now())

  await setTimeout(150)

  const logs = log.getLogs()
  const errorLog = logs.find(l => l.level === 'error' && l.msg.includes('Error in post-scaling evaluation'))
  assert.ok(errorLog, 'Should log error when evaluation fails')
})

test('Integration: full post-scaling evaluation cycle', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()
  const metricsService = createMockMetricsService()

  const algorithm = new ScalingAlgorithm(store, log, {
    metrics: metricsService,
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

  const result = await algorithm.calculateScalingDecision(
    'app-1',
    highLoadMetrics,
    2,
    1,
    10
  )

  assert.ok(result.nfinal > 2, 'Should scale up')

  const history = await algorithm.loadPerfHistory('app-1')
  assert.strictEqual(history.length, 1, 'Should have one history event')
  assert.strictEqual(history[0].deltaElu, 0, 'Initial delta should be 0')

  metricsService.setApplicationMetrics('app-1', createPostScalingMetrics(0.7, 0.65))

  await setTimeout(150)

  const updatedHistory = await algorithm.loadPerfHistory('app-1')
  const updatedEvent = updatedHistory[0]

  assert.ok(updatedEvent.deltaElu < 0, 'Delta ELU should show improvement')
  assert.ok(updatedEvent.deltaHeap < 0, 'Delta heap should show improvement')

  const clusters = await algorithm.loadClusters('app-1')
  assert.ok(clusters.length > 0, 'Should have created clusters')
  assert.ok(clusters[0].performanceScore > 0, 'Cluster should have performance score')
})

test('Integration: multiple scaling events create performance history', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()
  const metricsService = createMockMetricsService()

  const algorithm = new ScalingAlgorithm(store, log, {
    metrics: metricsService,
    maxHistoryEvents: 3,
    maxClusters: 2
  })

  for (let i = 0; i < 5; i++) {
    const timestamp = Date.now() - (i * 1000)

    await algorithm.addPerfHistoryEvent('app-1', {
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
    })

    const postElu = 0.7 - (i * 0.05)
    const postHeap = 0.65 - (i * 0.05)
    metricsService.setApplicationMetrics('app-1', createPostScalingMetrics(postElu, postHeap))

    await algorithm.performPostScalingEvaluation('app-1', timestamp)
  }

  const history = await algorithm.loadPerfHistory('app-1')
  assert.strictEqual(history.length, 3, 'History should be limited to maxHistoryEvents')

  const clusters = await algorithm.loadClusters('app-1')
  assert.ok(clusters.length <= 2, 'Clusters should be limited to maxClusters')

  for (const event of history) {
    assert.ok(event.deltaElu !== 0 || event.deltaHeap !== 0, 'Event should have been evaluated')
  }
})

test('Post-scaling evaluation updates cluster weights correctly', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()
  const metricsService = createMockMetricsService()

  const algorithm = new ScalingAlgorithm(store, log, { metrics: metricsService })

  for (let i = 0; i < 2; i++) {
    const timestamp = Date.now() - (i * 1000)

    await algorithm.addPerfHistoryEvent('app-1', {
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

    await algorithm.performPostScalingEvaluation('app-1', timestamp)
  }

  const clusters = await algorithm.loadClusters('app-1')
  assert.strictEqual(clusters.length, 1, 'Should have one cluster for similar events')
  assert.ok(clusters[0].weight > 1, 'Cluster weight should increase with similar events')
})
