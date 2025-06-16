'use strict'

process.env.SKIP_POST_SCALING_EVALUATION = 'true'

const test = require('node:test')
const assert = require('node:assert')
const path = require('node:path')
const fs = require('node:fs')
const ReactiveScalingAlgorithm = require('../../../lib/reactive-scaling-algorithm')
const Store = require('../../../lib/store')
const { valkeyConnectionString } = require('../../helper')

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
    scalerMetrics: metrics,
    platformatic: {
      entities: {
        performanceHistory: {
          find: async () => [],
          save: async () => {}
        }
      }
    }
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

function loadMetricsFile (filename) {
  const metricsPath = path.join(__dirname, filename)
  return JSON.parse(fs.readFileSync(metricsPath, 'utf8'))
}

function analyzeMetrics (metricsData) {
  const podIds = Object.keys(metricsData)

  const avgEluOverall = podIds.reduce((sum, podId) => {
    const eluValues = metricsData[podId].eventLoopUtilization[0].values.map(([, value]) => parseFloat(value))
    return sum + (eluValues.reduce((a, b) => a + b, 0) / eluValues.length)
  }, 0) / podIds.length

  const avgHeapOverall = podIds.reduce((sum, podId) => {
    const heapValues = metricsData[podId].heapSize[0].values.map(([, value]) => parseFloat(value))
    const normalizedHeap = (heapValues.reduce((a, b) => a + b, 0) / heapValues.length) / (8 * 1024 * 1024 * 1024)
    return sum + normalizedHeap
  }, 0) / podIds.length

  return { avgEluOverall, avgHeapOverall, podCount: podIds.length }
}

test('scaling algorithm with metrics-low.json data', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()

  await store.redis.set('scaler:last-scaling:test-app', (Date.now() - 600000).toString())

  const app = createMockApp(store, log)
  const algorithm = new ReactiveScalingAlgorithm(app)

  const metricsData = loadMetricsFile('metrics-low.json')

  const applicationId = 'test-app'
  const currentPodCount = 2
  const minPods = 1
  const maxPods = 10
  const alerts = []

  const result = await algorithm.calculateScalingDecision(
    applicationId,
    metricsData,
    currentPodCount,
    minPods,
    maxPods,
    alerts
  )

  console.log('=== Scaling Algorithm Results ===')
  console.log('Input parameters:')
  console.log(`  Application ID: ${applicationId}`)
  console.log(`  Current pod count: ${currentPodCount}`)
  console.log(`  Min pods: ${minPods}`)
  console.log(`  Max pods: ${maxPods}`)
  console.log(`  Alerts: ${alerts.length}`)
  console.log(`  Pod metrics count: ${Object.keys(metricsData).length}`)
  console.log('')

  const podIds = Object.keys(metricsData)
  console.log('Pod analysis:')

  for (const podId of podIds) {
    const podMetrics = metricsData[podId]
    const eluValues = podMetrics.eventLoopUtilization[0].values.map(([, value]) => parseFloat(value))
    const heapValues = podMetrics.heapSize[0].values.map(([, value]) => parseFloat(value))

    const avgElu = eluValues.reduce((a, b) => a + b, 0) / eluValues.length
    const avgHeap = heapValues.reduce((a, b) => a + b, 0) / heapValues.length
    const normalizedHeap = avgHeap / (8 * 1024 * 1024 * 1024)

    console.log(`  ${podId}:`)
    console.log(`    Average ELU: ${(avgElu * 100).toFixed(2)}% (threshold: 90%)`)
    console.log(`    Average heap: ${(normalizedHeap * 100).toFixed(2)}% (threshold: 85%)`)
    console.log(`    ELU data points: ${eluValues.length}`)
    console.log(`    Heap data points: ${heapValues.length}`)
  }

  console.log('')
  console.log('Algorithm decision:')
  console.log(`  Target pod count (nfinal): ${result.nfinal}`)
  console.log(`  Scaling action: ${result.nfinal > currentPodCount ? 'SCALE UP' : result.nfinal < currentPodCount ? 'SCALE DOWN' : 'NO CHANGE'}`)
  console.log(`  Pods to add/remove: ${result.nfinal - currentPodCount}`)
  console.log(`  Reason: ${result.reason || 'Algorithm-based scaling decision'}`)
  console.log('')

  console.log('Decision analysis:')
  const avgEluOverall = podIds.reduce((sum, podId) => {
    const eluValues = metricsData[podId].eventLoopUtilization[0].values.map(([, value]) => parseFloat(value))
    return sum + (eluValues.reduce((a, b) => a + b, 0) / eluValues.length)
  }, 0) / podIds.length

  const avgHeapOverall = podIds.reduce((sum, podId) => {
    const heapValues = metricsData[podId].heapSize[0].values.map(([, value]) => parseFloat(value))
    const normalizedHeap = (heapValues.reduce((a, b) => a + b, 0) / heapValues.length) / (8 * 1024 * 1024 * 1024)
    return sum + normalizedHeap
  }, 0) / podIds.length

  console.log(`  Overall average ELU: ${(avgEluOverall * 100).toFixed(2)}% (90% threshold = scale up trigger)`)
  console.log(`  Overall average heap: ${(avgHeapOverall * 100).toFixed(2)}% (85% threshold = scale up trigger)`)
  console.log(`  ELU vs 50% of threshold: ${(avgEluOverall * 100).toFixed(2)}% vs 45% (scale down if below)`)
  console.log(`  Heap vs 50% of threshold: ${(avgHeapOverall * 100).toFixed(2)}% vs 42.5% (scale down if below)`)

  if (avgEluOverall < 0.45 || avgHeapOverall < 0.425) {
    console.log('  ✓ Metrics are low enough to potentially trigger scale down')
  } else if (avgEluOverall > 0.9 || avgHeapOverall > 0.85) {
    console.log('  ⚠ Metrics are high enough to trigger scale up')
  } else {
    console.log('  → Metrics are in normal range, no scaling expected')
  }

  console.log('================================')

  const expectedTargetPods = 1

  assert.strictEqual(result.nfinal, expectedTargetPods, 'Should scale down to 1 pod due to low utilization')
  assert.ok(result.nfinal < currentPodCount, 'Target pod count should be less than current pod count')
  assert.strictEqual(result.reason, 'Scaling down due to low utilization', 'Reason should indicate scaling down due to low utilization')
  assert.ok(result.nfinal >= minPods, 'Should not scale below minimum pod count')

  const shouldScaleDown = avgEluOverall < 0.45 || avgHeapOverall < 0.425
  assert.ok(shouldScaleDown, 'Metrics should be low enough to trigger scale down')
})

test('scaling progression: scale down then stop', async (t) => {
  const store = await setupStore(t)
  const log = createMockLog()
  const app = createMockApp(store, log)
  const algorithm = new ReactiveScalingAlgorithm(app)

  const applicationId = 'test-app-progression'
  const minPods = 2
  const maxPods = 10
  const alerts = []

  console.log('=== Scaling Progression Test ===')

  console.log('\n--- Phase 1: Initial scale down ---')
  await store.redis.set('scaler:last-scaling:test-app-progression', (Date.now() - 600000).toString())

  const veryLowMetrics = loadMetricsFile('metrics-very-low.json')
  const veryLowAnalysis = analyzeMetrics(veryLowMetrics)

  console.log(`Input: 4 pods, ELU: ${(veryLowAnalysis.avgEluOverall * 100).toFixed(2)}%, Heap: ${(veryLowAnalysis.avgHeapOverall * 100).toFixed(2)}%`)

  const result1 = await algorithm.calculateScalingDecision(
    applicationId,
    veryLowMetrics,
    4,
    minPods,
    maxPods,
    alerts
  )

  console.log(`Decision: ${result1.nfinal} pods (${result1.nfinal - 4 > 0 ? '+' : ''}${result1.nfinal - 4})`)
  console.log(`Reason: ${result1.reason}`)

  assert.ok(result1.nfinal < 4, 'Should scale down from 4 pods due to very low utilization')
  assert.ok(result1.nfinal >= minPods, 'Should not scale below minimum pod count')
  assert.strictEqual(result1.reason, 'Scaling down due to low utilization')

  console.log('\n--- Phase 2: After scale down, moderate utilization ---')
  await store.redis.set('scaler:last-scaling:test-app-progression', (Date.now() - 600000).toString())

  const moderateMetrics = loadMetricsFile('metrics-moderate.json')
  const moderateAnalysis = analyzeMetrics(moderateMetrics)

  console.log(`Input: ${result1.nfinal} pods, ELU: ${(moderateAnalysis.avgEluOverall * 100).toFixed(2)}%, Heap: ${(moderateAnalysis.avgHeapOverall * 100).toFixed(2)}%`)

  const result2 = await algorithm.calculateScalingDecision(
    applicationId,
    moderateMetrics,
    result1.nfinal,
    minPods,
    maxPods,
    alerts
  )

  console.log(`Decision: ${result2.nfinal} pods (${result2.nfinal - result1.nfinal > 0 ? '+' : ''}${result2.nfinal - result1.nfinal})`)
  console.log(`Reason: ${result2.reason}`)

  assert.strictEqual(result2.nfinal, result1.nfinal, 'Should maintain pod count with moderate utilization')
  assert.strictEqual(result2.reason, 'No pods triggered scaling')

  console.log('\n--- Analysis ---')
  console.log(`Very low metrics: ELU ${(veryLowAnalysis.avgEluOverall * 100).toFixed(2)}% < 45% threshold ✓`)
  console.log(`Very low metrics: Heap ${(veryLowAnalysis.avgHeapOverall * 100).toFixed(2)}% < 42.5% threshold ✓`)
  console.log(`Moderate metrics: ELU ${(moderateAnalysis.avgEluOverall * 100).toFixed(2)}% > 45% threshold ✓`)
  console.log(`Moderate metrics: Heap ${(moderateAnalysis.avgHeapOverall * 100).toFixed(2)}% > 42.5% threshold ✓`)

  console.log('\n--- Final State ---')
  console.log('Started with: 4 pods')
  console.log(`Scaled down to: ${result1.nfinal} pods`)
  console.log(`Final count: ${result2.nfinal} pods`)
  console.log(`Minimum respected: ${result2.nfinal >= minPods ? '✓' : '✗'}`)

  const shouldScaleDownPhase1 = veryLowAnalysis.avgEluOverall < 0.45 || veryLowAnalysis.avgHeapOverall < 0.425
  const shouldNotScalePhase2 = moderateAnalysis.avgEluOverall >= 0.45 && moderateAnalysis.avgHeapOverall >= 0.425

  assert.ok(shouldScaleDownPhase1, 'Phase 1 metrics should trigger scale down')
  assert.ok(shouldNotScalePhase2, 'Phase 2 metrics should not trigger scaling')

  console.log('================================')
})
