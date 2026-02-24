'use strict'

const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const Store = require('../../lib/store')
const ReactiveScalingAlgorithm = require('../../lib/reactive-scaling-algorithm')
const { valkeyConnectionString, cleanValkeyData } = require('../helper')

const createMockLog = () => ({
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {}
})

function createMockApp (store) {
  const log = createMockLog()
  return {
    log,
    store,
    scalerMetrics: null
  }
}

beforeEach(async () => {
  await cleanValkeyData()
})

test('concurrent controllers have independent cooldowns', async (t) => {
  const store = new Store(valkeyConnectionString, createMockLog())
  t.after(() => store.close())

  const appId = 'app-1'

  // Controller A scales up
  await store.saveLastScalingTime(appId, Date.now(), 'up', 'ctrl-v1')

  // Controller B should NOT be in cooldown
  const ctrlBTime = await store.getLastScalingTime(appId, 'up', 'ctrl-v2')
  assert.strictEqual(ctrlBTime, 0, 'Controller B should have no scaling history')

  // Controller A should be in cooldown
  const ctrlATime = await store.getLastScalingTime(appId, 'up', 'ctrl-v1')
  assert.ok(ctrlATime > 0, 'Controller A should have scaling history')
})

test('concurrent controllers have independent performance history', async (t) => {
  const store = new Store(valkeyConnectionString, createMockLog())
  t.after(() => store.close())

  const appId = 'app-1'

  await store.addPerfHistoryEvent(appId, {
    timestamp: Date.now(),
    podsAdded: 1,
    totalPods: 3,
    preEluMean: 0.9,
    preHeapMean: 0.5
  }, 10, 'ctrl-v1')

  await store.addPerfHistoryEvent(appId, {
    timestamp: Date.now() + 1,
    podsAdded: 2,
    totalPods: 5,
    preEluMean: 0.95,
    preHeapMean: 0.7
  }, 10, 'ctrl-v2')

  const historyV1 = await store.loadPerfHistory(appId, 'ctrl-v1')
  assert.strictEqual(historyV1.length, 1)
  assert.strictEqual(historyV1[0].totalPods, 3)

  const historyV2 = await store.loadPerfHistory(appId, 'ctrl-v2')
  assert.strictEqual(historyV2.length, 1)
  assert.strictEqual(historyV2[0].totalPods, 5)

  // App-level history (no controllerId) should be empty
  const historyApp = await store.loadPerfHistory(appId)
  assert.strictEqual(historyApp.length, 0)
})

test('concurrent controllers have independent clusters', async (t) => {
  const store = new Store(valkeyConnectionString, createMockLog())
  t.after(() => store.close())

  const appId = 'app-1'

  await store.saveClusters(appId, [{ eluMean: 0.8, weight: 1 }], 'ctrl-v1')
  await store.saveClusters(appId, [{ eluMean: 0.3, weight: 2 }], 'ctrl-v2')

  const clustersV1 = await store.loadClusters(appId, 'ctrl-v1')
  assert.strictEqual(clustersV1.length, 1)
  assert.strictEqual(clustersV1[0].eluMean, 0.8)

  const clustersV2 = await store.loadClusters(appId, 'ctrl-v2')
  assert.strictEqual(clustersV2.length, 1)
  assert.strictEqual(clustersV2[0].eluMean, 0.3)

  // App-level clusters should be empty
  const clustersApp = await store.loadClusters(appId)
  assert.strictEqual(clustersApp.length, 0)
})

test('scaling algorithm uses independent cooldowns per controller', async (t) => {
  const store = new Store(valkeyConnectionString, createMockLog())
  t.after(() => store.close())

  const app = createMockApp(store)
  const algorithm = new ReactiveScalingAlgorithm(app, {
    scaleUpCooldownPeriod: 60,
    eluThreshold: 0.9,
    heapThreshold: 0.85
  })

  const appId = 'app-1'

  // Mark controller A as recently scaled
  await store.saveLastScalingTime(appId, Date.now(), 'up', 'ctrl-v1')

  // Controller A should be in cooldown
  const ctrlACooldown = await algorithm.isInCooldownPeriod(appId, 'up', 'ctrl-v1')
  assert.strictEqual(ctrlACooldown, true, 'Controller A should be in cooldown')

  // Controller B should NOT be in cooldown
  const ctrlBCooldown = await algorithm.isInCooldownPeriod(appId, 'up', 'ctrl-v2')
  assert.strictEqual(ctrlBCooldown, false, 'Controller B should not be in cooldown')
})

test('scaling decisions are independent for concurrent controllers', async (t) => {
  const store = new Store(valkeyConnectionString, createMockLog())
  t.after(() => store.close())

  const app = createMockApp(store)

  process.env.SKIP_POST_SCALING_EVALUATION = 'true'
  t.after(() => { delete process.env.SKIP_POST_SCALING_EVALUATION })

  const algorithm = new ReactiveScalingAlgorithm(app, {
    scaleUpCooldownPeriod: 60,
    eluThreshold: 0.8,
    heapThreshold: 0.85
  })

  const appId = 'app-1'

  // Mark controller A as recently scaled up — puts it in cooldown
  await store.saveLastScalingTime(appId, Date.now(), 'up', 'ctrl-v1')

  const highLoadMetrics = {
    'pod-1': {
      eventLoopUtilization: [{ metric: { pod: 'pod-1' }, values: [[Date.now(), '0.95']] }],
      heapSize: [{ metric: { pod: 'pod-1' }, values: [[Date.now(), '500000000']] }]
    }
  }

  const alerts = [{
    podId: 'pod-1',
    serviceId: 'svc-1',
    elu: 0.95,
    heapUsed: 500000000,
    heapTotal: 800000000,
    timestamp: Date.now(),
    healthHistory: []
  }]

  // Controller A: should be blocked by cooldown
  const resultA = await algorithm.calculateScalingDecision(
    appId, { ...highLoadMetrics }, 2, 1, 10, [...alerts], null, 'ctrl-v1'
  )
  assert.strictEqual(resultA.nfinal, 2, 'Controller A should not scale due to cooldown')
  assert.ok(resultA.reason.includes('cooldown'), 'Should mention cooldown')

  // Controller B: should scale up (not in cooldown)
  const resultB = await algorithm.calculateScalingDecision(
    appId, { ...highLoadMetrics }, 2, 1, 10, [...alerts], null, 'ctrl-v2'
  )
  assert.ok(resultB.nfinal > 2, 'Controller B should scale up')
})

test('single controller without controllerId works as before', async (t) => {
  const store = new Store(valkeyConnectionString, createMockLog())
  t.after(() => store.close())

  const appId = 'app-1'

  // Save without controllerId
  await store.saveLastScalingTime(appId, Date.now(), 'up')

  // Read without controllerId
  const time = await store.getLastScalingTime(appId, 'up')
  assert.ok(time > 0)

  // Read WITH controllerId should be independent
  const ctrlTime = await store.getLastScalingTime(appId, 'up', 'ctrl-v1')
  assert.strictEqual(ctrlTime, 0, 'Controller-scoped key should be independent from app-level key')

  // Save perf history without controllerId
  await store.addPerfHistoryEvent(appId, { timestamp: Date.now(), podsAdded: 1 }, 10)
  const history = await store.loadPerfHistory(appId)
  assert.strictEqual(history.length, 1)

  // Controller-scoped should be empty
  const ctrlHistory = await store.loadPerfHistory(appId, 'ctrl-v1')
  assert.strictEqual(ctrlHistory.length, 0)
})
