'use strict'

const { test } = require('node:test')
const { strict: assert } = require('node:assert')
const { buildServer } = require('../helper')
const SignalScalerAlgorithm = require('../../lib/signal-scaler-algorithm')

test('SignalScalerAlgorithm - basic initialization', async (t) => {
  const app = await buildServer(t)

  const algorithm = new SignalScalerAlgorithm(app)

  assert.equal(algorithm.FW, 15000)
  assert.equal(algorithm.SW, 60000)
  assert.equal(algorithm.LW, 300000)
  assert.equal(algorithm.HOT_RATE_THRESHOLD, 0.5)
  assert.equal(algorithm.SCALE_UP_FW_RATE_THRESHOLD, 0.05)
  assert.equal(algorithm.SCALE_UP_SW_RATE_THRESHOLD, 0.05)
  assert.equal(algorithm.SCALE_UP_VELOCITY_THRESHOLD, 0.02)
  assert.equal(algorithm.SCALE_DOWN_SW_RATE_THRESHOLD, 0.01)
  assert.equal(algorithm.SCALE_DOWN_LW_RATE_THRESHOLD, 0.004)
})

test('SignalScalerAlgorithm - custom options', async (t) => {
  const app = await buildServer(t)

  const algorithm = new SignalScalerAlgorithm(app, {
    FW: 10000,
    SW: 30000,
    LW: 120000,
    HOT_RATE_THRESHOLD: 0.7,
    minPodsDefault: 2,
    maxPodsDefault: 20
  })

  assert.equal(algorithm.FW, 10000)
  assert.equal(algorithm.SW, 30000)
  assert.equal(algorithm.LW, 120000)
  assert.equal(algorithm.HOT_RATE_THRESHOLD, 0.7)
  assert.equal(algorithm.minPodsDefault, 2)
  assert.equal(algorithm.maxPodsDefault, 20)
})

test('SignalScalerAlgorithm - store and retrieve signal events', async (t) => {
  const app = await buildServer(t)
  const algorithm = new SignalScalerAlgorithm(app)

  const applicationId = 'test-app-1'
  const podId = 'pod-1'
  const signals = {
    cpu: 0.8,
    memory: 0.7,
    latency: 150
  }

  await algorithm.storeSignalEvent(applicationId, podId, signals)

  const { eventsFW } = await algorithm.getAllEventsGroupedByWindows(applicationId)
  assert.equal(eventsFW.length, 1)
  assert.equal(eventsFW[0].podId, podId)
  assert.ok(eventsFW[0].timestamp)
})

test('SignalScalerAlgorithm - filter events by time window', async (t) => {
  const app = await buildServer(t)
  const algorithm = new SignalScalerAlgorithm(app, {
    FW: 10000,
    SW: 30000
  })

  const applicationId = 'test-app-2'
  const now = Date.now()

  await algorithm.storeSignalEvent(applicationId, 'pod-1', { cpu: 0.8 }, now - 5000)
  await algorithm.storeSignalEvent(applicationId, 'pod-2', { cpu: 0.7 }, now - 20000)
  await algorithm.storeSignalEvent(applicationId, 'pod-3', { cpu: 0.9 }, now - 40000)

  const { eventsFW, eventsSW } = await algorithm.getAllEventsGroupedByWindows(applicationId, now)
  assert.equal(eventsFW.length, 1)
  assert.equal(eventsSW.length, 2)
})

test('SignalScalerAlgorithm - calculate rate per pod', async (t) => {
  const app = await buildServer(t)
  const algorithm = new SignalScalerAlgorithm(app)

  const applicationId = 'test-app-3'
  const now = Date.now()

  for (let i = 0; i < 5; i++) {
    await algorithm.storeSignalEvent(applicationId, 'pod-1', { cpu: 0.8 }, now - i * 1000)
  }

  for (let i = 0; i < 3; i++) {
    await algorithm.storeSignalEvent(applicationId, 'pod-2', { cpu: 0.7 }, now - i * 1000)
  }

  const { eventsFW } = await algorithm.getAllEventsGroupedByWindows(applicationId, now)

  const ratePod1 = algorithm.calculateRatePerPod(eventsFW, algorithm.FW, 'pod-1')
  const ratePod2 = algorithm.calculateRatePerPod(eventsFW, algorithm.FW, 'pod-2')

  assert.ok(ratePod1 > ratePod2)
})

test('SignalScalerAlgorithm - calculate stats', async (t) => {
  const app = await buildServer(t)
  const algorithm = new SignalScalerAlgorithm(app)

  const applicationId = 'test-app-4'
  const now = Date.now()

  for (let i = 0; i < 10; i++) {
    await algorithm.storeSignalEvent(applicationId, 'pod-1', { cpu: 0.9 }, now - i * 1000)
  }

  for (let i = 0; i < 3; i++) {
    await algorithm.storeSignalEvent(applicationId, 'pod-2', { cpu: 0.6 }, now - i * 1000)
  }

  const { eventsFW } = await algorithm.getAllEventsGroupedByWindows(applicationId, now)
  const stats = algorithm.calculateStats(eventsFW, algorithm.FW)

  assert.equal(stats.podCount, 2)
  assert.ok(stats.avgRate > 0)
  assert.ok(stats.maxRate >= stats.avgRate)
  assert.ok('pod-1' in stats.rates)
  assert.ok('pod-2' in stats.rates)
})

test('SignalScalerAlgorithm - hotspot scale up', async (t) => {
  const app = await buildServer(t)
  const algorithm = new SignalScalerAlgorithm(app, {
    FW: 10000,
    HOT_RATE_THRESHOLD: 0.5
  })

  const applicationId = 'test-app-5'
  const now = Date.now()

  for (let i = 0; i < 10; i++) {
    await algorithm.storeSignalEvent(applicationId, 'pod-1', { cpu: 0.95 }, now - i * 500)
  }

  const decision = await algorithm.calculateScalingDecision(applicationId, 2, 1, 10)

  assert.equal(decision.nfinal, 3)
  assert.ok(decision.reason.includes('Hotspot'))
})

test('SignalScalerAlgorithm - breadth scale up', async (t) => {
  const app = await buildServer(t)
  const algorithm = new SignalScalerAlgorithm(app, {
    FW: 10000,
    SW: 30000,
    SCALE_UP_FW_RATE_THRESHOLD: 0.1,
    SCALE_UP_SW_RATE_THRESHOLD: 0.05,
    SCALE_UP_VELOCITY_THRESHOLD: 0.02
  })

  const applicationId = 'test-app-6'
  const now = Date.now()

  for (let i = 0; i < 3; i++) {
    await algorithm.storeSignalEvent(applicationId, 'pod-1', { cpu: 0.8 }, now - i * 1000)
    await algorithm.storeSignalEvent(applicationId, 'pod-2', { cpu: 0.8 }, now - i * 1000)
  }

  for (let i = 0; i < 4; i++) {
    await algorithm.storeSignalEvent(applicationId, 'pod-1', { cpu: 0.8 }, now - 15000 - i * 1000)
    await algorithm.storeSignalEvent(applicationId, 'pod-2', { cpu: 0.8 }, now - 15000 - i * 1000)
  }

  const decision = await algorithm.calculateScalingDecision(applicationId, 2, 1, 10)

  assert.equal(decision.nfinal, 3)
  assert.ok(decision.reason.includes('Breadth'))
})

test('SignalScalerAlgorithm - scale down', async (t) => {
  const app = await buildServer(t)
  const algorithm = new SignalScalerAlgorithm(app, {
    FW: 10000,
    SW: 30000,
    LW: 60000,
    SCALE_DOWN_SW_RATE_THRESHOLD: 0.05,
    SCALE_DOWN_LW_RATE_THRESHOLD: 0.02
  })

  const applicationId = 'test-app-7'
  const now = Date.now()

  await algorithm.storeSignalEvent(applicationId, 'pod-1', { cpu: 0.3 }, now - 50000)

  const decision = await algorithm.calculateScalingDecision(applicationId, 3, 1, 10)

  assert.equal(decision.nfinal, 2)
  assert.ok(decision.reason.includes('Low utilization'))
})

test('SignalScalerAlgorithm - respect minimum pods', async (t) => {
  const app = await buildServer(t)
  const algorithm = new SignalScalerAlgorithm(app)

  const applicationId = 'test-app-8'
  const currentPodCount = 5

  const decision = await algorithm.calculateScalingDecision(applicationId, currentPodCount, 5, 10)

  assert.ok(decision.nfinal >= 5, 'Should not scale below minimum')
  assert.ok(decision.nfinal === currentPodCount, 'Should stay at current pod count with no signals')
})

test('SignalScalerAlgorithm - respect maximum pods', async (t) => {
  const app = await buildServer(t)
  const algorithm = new SignalScalerAlgorithm(app, {
    FW: 10000,
    HOT_RATE_THRESHOLD: 0.5
  })

  const applicationId = 'test-app-9'
  const now = Date.now()

  for (let i = 0; i < 20; i++) {
    await algorithm.storeSignalEvent(applicationId, 'pod-1', { cpu: 0.95 }, now - i * 500)
  }

  const decision = await algorithm.calculateScalingDecision(applicationId, 5, 1, 5)

  assert.equal(decision.nfinal, 5)
})

test('SignalScalerAlgorithm -scale up cooldown after scale down', async (t) => {
  const app = await buildServer(t)
  const algorithm = new SignalScalerAlgorithm(app, {
    FW: 10000,
    SW: 30000,
    HOT_RATE_THRESHOLD: 0.5
  })

  const applicationId = 'test-app-10'
  const now = Date.now()

  await algorithm.setCooldown(applicationId, 'scaledown', now - 5000)

  for (let i = 0; i < 20; i++) {
    await algorithm.storeSignalEvent(applicationId, 'pod-1', { cpu: 0.95 }, now - i * 500)
  }

  const decision = await algorithm.calculateScalingDecision(applicationId, 2, 1, 10)

  assert.equal(decision.nfinal, 2)
  assert.ok(decision.reason.includes('cooldown'))
})

test('SignalScalerAlgorithm - scale down cooldown', async (t) => {
  const app = await buildServer(t)
  const algorithm = new SignalScalerAlgorithm(app, {
    FW: 10000,
    SW: 30000,
    LW: 60000
  })

  const applicationId = 'test-app-11'
  const now = Date.now()

  await algorithm.setCooldown(applicationId, 'scaledown', now - 5000)

  const decision = await algorithm.calculateScalingDecision(applicationId, 3, 1, 10)

  assert.equal(decision.nfinal, 3)
})

test('SignalScalerAlgorithm - scale down when no events and at minimum', async (t) => {
  const app = await buildServer(t)
  const algorithm = new SignalScalerAlgorithm(app)

  const applicationId = 'test-app-12'

  const decision = await algorithm.calculateScalingDecision(applicationId, 1, 1, 10)

  assert.equal(decision.nfinal, 1)
})

test('SignalScalerAlgorithm - multiple signal types', async (t) => {
  const app = await buildServer(t)
  const algorithm = new SignalScalerAlgorithm(app)

  const applicationId = 'test-app-multi-signals-' + Date.now()
  const podId = 'pod-1'

  const signals1 = {
    cpu: 0.8,
    memory: 0.7,
    latency: 150,
    errorRate: 0.05
  }

  const signals2 = {
    cpu: 0.9,
    diskIO: 0.6,
    networkThroughput: 1000
  }

  const timestamp = Date.now()
  await algorithm.storeSignalEvent(applicationId, podId, signals1, timestamp)
  await algorithm.storeSignalEvent(applicationId, podId, signals2, timestamp + 1000)

  const { eventsFW } = await algorithm.getAllEventsGroupedByWindows(applicationId, timestamp + 2000)

  assert.equal(eventsFW.length, 2)
  assert.equal(eventsFW[0].podId, podId)
  assert.equal(eventsFW[1].podId, podId)
  assert.ok(eventsFW[0].timestamp)
  assert.ok(eventsFW[1].timestamp)
})

test('SignalScalerAlgorithm - velocity calculation', async (t) => {
  const app = await buildServer(t)
  const algorithm = new SignalScalerAlgorithm(app, {
    FW: 10000,
    SW: 30000
  })

  const applicationId = 'test-app-14'
  const now = Date.now()

  for (let i = 0; i < 5; i++) {
    await algorithm.storeSignalEvent(applicationId, 'pod-1', { cpu: 0.8 }, now - i * 1000)
  }

  for (let i = 0; i < 2; i++) {
    await algorithm.storeSignalEvent(applicationId, 'pod-1', { cpu: 0.8 }, now - 20000 - i * 1000)
  }

  const { eventsFW, eventsSW } = await algorithm.getAllEventsGroupedByWindows(applicationId, now)

  const statsFW = algorithm.calculateStats(eventsFW, algorithm.FW)
  const statsSW = algorithm.calculateStats(eventsSW, algorithm.SW)

  const velocity = statsFW.avgRate - statsSW.avgRate

  assert.ok(velocity > 0)
})

test('SignalScalerAlgorithm -scale up by Math.ceil(n/2)', async (t) => {
  const app = await buildServer(t)
  const algorithm = new SignalScalerAlgorithm(app, {
    FW: 10000,
    HOT_RATE_THRESHOLD: 0.5
  })

  const applicationId = 'test-app-scale-amount-' + Date.now()
  const now = Date.now()

  for (let i = 0; i < 10; i++) {
    await algorithm.storeSignalEvent(applicationId, 'pod-1', { cpu: 0.95 }, now - i * 500)
  }

  const decision2 = await algorithm.calculateScalingDecision(applicationId, 2, 1, 20)
  assert.equal(decision2.nfinal, 3)

  const decision5 = await algorithm.calculateScalingDecision(applicationId, 5, 1, 20)
  assert.equal(decision5.nfinal, 8)

  const decision10 = await algorithm.calculateScalingDecision(applicationId, 10, 1, 20)
  assert.equal(decision10.nfinal, 15)
})
