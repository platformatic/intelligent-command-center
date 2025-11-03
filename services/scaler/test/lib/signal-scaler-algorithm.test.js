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
  assert.equal(algorithm.SCALE_UP_FW_RATE_THRESHOLD, 0.2)
  assert.equal(algorithm.SCALE_UP_SW_RATE_THRESHOLD, 0.15)
  assert.equal(algorithm.SCALE_DOWN_SW_RATE_THRESHOLD, 0.05)
  assert.equal(algorithm.SCALE_DOWN_LW_RATE_THRESHOLD, 0.03)
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

test('SignalScalerAlgorithm - filter events by time window', async (t) => {
  const app = await buildServer(t)
  const algorithm = new SignalScalerAlgorithm(app, {
    FW: 10000,
    SW: 30000
  })

  const applicationId = 'test-app-2'
  const now = Date.now()

  await algorithm.storeSignal(applicationId, 'pod-1', { type: 'cpu', value: 0.8, timestamp: now - 5000 })
  await algorithm.storeSignal(applicationId, 'pod-2', { type: 'cpu', value: 0.7, timestamp: now - 20000 })
  await algorithm.storeSignal(applicationId, 'pod-3', { type: 'cpu', value: 0.9, timestamp: now - 40000 })

  const podsSignals = await algorithm.getAppPodsSignals(applicationId)
  const { statsFW, statsSW } = algorithm.calculateStats(podsSignals, 1, now)

  assert.equal(statsFW.eventsCount, 1)
  assert.equal(statsSW.eventsCount, 2)
})

test('SignalScalerAlgorithm - calculate rate per pod', async (t) => {
  const app = await buildServer(t)
  const algorithm = new SignalScalerAlgorithm(app)

  const applicationId = 'test-app-3'
  const now = Date.now()

  for (let i = 0; i < 5; i++) {
    const signal = { type: 'cpu', value: 0.8, timestamp: now - i * 1000 }
    await algorithm.storeSignal(applicationId, 'pod-1', signal)
  }

  for (let i = 0; i < 3; i++) {
    const signal = { type: 'cpu', value: 0.7, timestamp: now - i * 1000 }
    await algorithm.storeSignal(applicationId, 'pod-2', signal)
  }

  const podsSignals = await algorithm.getAppPodsSignals(applicationId)
  const { statsFW } = algorithm.calculateStats(podsSignals, 1, now)

  assert.ok(statsFW.eventRates['pod-1'] > statsFW.eventRates['pod-2'])
})

test('SignalScalerAlgorithm - calculate stats', async (t) => {
  const app = await buildServer(t)
  const algorithm = new SignalScalerAlgorithm(app)

  const applicationId = 'test-app-4'
  const now = Date.now()
  const podCount = 2

  for (let i = 0; i < 10; i++) {
    const signal = { type: 'cpu', value: 0.9, timestamp: now - i * 1000 }
    await algorithm.storeSignal(applicationId, 'pod-1', signal)
  }

  for (let i = 0; i < 3; i++) {
    const signal = { type: 'cpu', value: 0.6, timestamp: now - i * 1000 }
    await algorithm.storeSignal(applicationId, 'pod-2', signal)
  }

  const podsSignals = await algorithm.getAppPodsSignals(applicationId)
  const { statsFW: stats } = algorithm.calculateStats(podsSignals, podCount)

  assert.ok(stats.avgEventRate > 0)
  assert.ok(stats.maxEventRate >= stats.avgEventRate)
  assert.ok('pod-1' in stats.eventRates)
  assert.ok('pod-2' in stats.eventRates)
})

test('SignalScalerAlgorithm - hotspot scale up', async (t) => {
  const app = await buildServer(t)
  const algorithm = new SignalScalerAlgorithm(app, {
    FW: 10000,
    HOT_RATE_THRESHOLD: 0.5
  })

  const applicationId = 'test-app-5'
  const now = Date.now()

  for (let i = 0; i < 12; i++) {
    const signal = { type: 'cpu', value: 0.95, timestamp: now - i * 500 }
    await algorithm.storeSignal(applicationId, 'pod-1', signal)
  }

  const decision = await algorithm.calculateScalingDecision(applicationId, 4, 1, 10)

  assert.equal(decision.nfinal, 5)
  assert.strictEqual(decision.reason, 'Pod "pod-1" sent 12 signals for 10 seconds')

  const signals = decision.signals
  assert.strictEqual(signals.length, 12)

  for (const signal of signals) {
    assert.ok(signal.id)
    assert.strictEqual(signal.type, 'cpu')
    assert.strictEqual(signal.value, '0.95')
  }
})

test('SignalScalerAlgorithm - scale up if there is at least one critical signal', async (t) => {
  const app = await buildServer(t)
  const algorithm = new SignalScalerAlgorithm(app, { FW: 10000 })

  const applicationId = 'test-app-5'
  const now = Date.now()

  const signal = {
    type: 'kafka',
    level: 'critical',
    value: 10,
    timestamp: now
  }
  await algorithm.storeSignal(applicationId, 'pod-1', signal)

  const decision = await algorithm.calculateScalingDecision(applicationId, 4, 1, 10)

  assert.equal(decision.nfinal, 5)
  assert.ok(decision.reason.includes('Received 1 critical signals'))

  const signals = decision.signals
  assert.strictEqual(signals.length, 1)

  assert.ok(signals[0].id)
  assert.strictEqual(signals[0].type, 'kafka')
  assert.strictEqual(signals[0].level, 'critical')
  assert.strictEqual(signals[0].value, '10')
})

test('SignalScalerAlgorithm - breadth scale up', async (t) => {
  const app = await buildServer(t)
  const algorithm = new SignalScalerAlgorithm(app, {
    FW: 10000,
    SW: 30000,
    SCALE_UP_FW_RATE_THRESHOLD: 0.1,
    SCALE_UP_SW_RATE_THRESHOLD: 0.05
  })

  const applicationId = 'test-app-6'
  const now = Date.now()

  for (let i = 0; i < 3; i++) {
    const signal = { type: 'cpu', value: 0.8, timestamp: now - i * 1000 }
    await algorithm.storeSignal(applicationId, 'pod-1', signal)
    await algorithm.storeSignal(applicationId, 'pod-2', signal)
  }

  for (let i = 0; i < 4; i++) {
    const signal = { type: 'cpu', value: 0.8, timestamp: now - 15000 - i * 1000 }
    await algorithm.storeSignal(applicationId, 'pod-1', signal)
    await algorithm.storeSignal(applicationId, 'pod-2', signal)
  }

  const decision = await algorithm.calculateScalingDecision(applicationId, 2, 1, 10)

  assert.equal(decision.nfinal, 3)
  assert.strictEqual(decision.reason, 'Received 6 signals from multiple pods for 10 seconds')

  const signals = decision.signals
  assert.strictEqual(signals.length, 6)

  for (const signal of signals) {
    assert.ok(signal.id)
    assert.strictEqual(signal.type, 'cpu')
    assert.strictEqual(signal.value, '0.8')
  }
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

  const signal = { type: 'cpu', value: 0.3, timestamp: now - 50000 }
  await algorithm.storeSignal(applicationId, 'pod-1', signal)

  const decision = await algorithm.calculateScalingDecision(applicationId, 3, 1, 10)

  assert.equal(decision.nfinal, 2)
  assert.strictEqual(
    decision.reason,
    'Application signals rates are low (' +
      '0 signals for 10 seconds, ' +
      '0 signals for 30 seconds, ' +
      '1 signals for 60 seconds)'
  )
  assert.strictEqual(decision.signals.length, 0)
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
    const signal = { type: 'cpu', value: 0.95, timestamp: now - i * 500 }
    await algorithm.storeSignal(applicationId, 'pod-1', signal)
  }

  const decision = await algorithm.calculateScalingDecision(applicationId, 5, 1, 5)

  assert.equal(decision.nfinal, 5)
})

test('SignalScalerAlgorithm - scale up cooldown after scale down', async (t) => {
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
    const signal = { type: 'cpu', value: 0.95, timestamp: now - i * 500 }
    await algorithm.storeSignal(applicationId, 'pod-1', signal)
  }

  const decision = await algorithm.calculateScalingDecision(applicationId, 2, 1, 10)

  assert.equal(decision.nfinal, 2)
  assert.ok(decision.reason.includes('cooldown'))

  const signals = decision.signals
  assert.strictEqual(signals.length, 0)
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

  const timestamp = Date.now()

  await algorithm.storeSignals(applicationId, podId, [
    { type: 'cpu', value: 0.8, timestamp },
    { type: 'memory', value: 0.7, timestamp },
    { type: 'custom_metric', value: 100, timestamp },
    { type: 'errorRate', value: 0.05, timestamp }
  ])

  await algorithm.storeSignals(applicationId, podId, [
    { type: 'cpu', value: 0.9, timestamp: timestamp + 1000 },
    { type: 'diskIO', value: 0.6, timestamp: timestamp + 1000 },
    { type: 'networkThroughput', value: 1000, timestamp: timestamp + 1000 }
  ])

  const podsSignals = await algorithm.getAppPodsSignals(applicationId)
  const { statsFW } = algorithm.calculateStats(podsSignals, 1, timestamp + 2000)

  assert.equal(statsFW.eventsCount, 2)
})

test('SignalScalerAlgorithm - scale up by Math.ceil(n/2)', async (t) => {
  const app = await buildServer(t)
  const algorithm = new SignalScalerAlgorithm(app, {
    FW: 10000,
    HOT_RATE_THRESHOLD: 0.5
  })

  const applicationId = 'test-app-scale-amount-' + Date.now()
  const now = Date.now()

  for (let i = 0; i < 15; i++) {
    const signal = { type: 'cpu', value: 0.95, timestamp: now - i * 2000 }
    await algorithm.storeSignal(applicationId, 'pod-1', signal)
    await algorithm.storeSignal(applicationId, 'pod-2', signal)
  }

  const decision2 = await algorithm.calculateScalingDecision(applicationId, 2, 1, 20)
  assert.equal(decision2.nfinal, 3)

  const signals = decision2.signals
  assert.strictEqual(signals.length, 10)

  for (const signal of signals) {
    assert.ok(signal.id)
    assert.strictEqual(signal.type, 'cpu')
    assert.strictEqual(signal.value, '0.95')
  }
})

test('SignalScalerAlgorithm - scale up by Math.ceil(n/2)', async (t) => {
  const app = await buildServer(t)
  const algorithm = new SignalScalerAlgorithm(app, {
    FW: 10000,
    HOT_RATE_THRESHOLD: 0.5
  })

  const applicationId = 'test-app-scale-amount-' + Date.now()
  const now = Date.now()

  for (let i = 0; i < 15; i++) {
    const signal = { type: 'cpu', value: 0.95, timestamp: now - i * 2000 }
    await algorithm.storeSignal(applicationId, 'pod-1', signal)
    await algorithm.storeSignal(applicationId, 'pod-2', signal)
    await algorithm.storeSignal(applicationId, 'pod-3', signal)
    await algorithm.storeSignal(applicationId, 'pod-4', signal)
    await algorithm.storeSignal(applicationId, 'pod-5', signal)
  }

  const decision5 = await algorithm.calculateScalingDecision(applicationId, 5, 1, 20)
  assert.equal(decision5.nfinal, 8)

  const signals = decision5.signals
  assert.strictEqual(signals.length, 25)

  for (const signal of signals) {
    assert.ok(signal.id)
    assert.strictEqual(signal.type, 'cpu')
    assert.strictEqual(signal.value, '0.95')
  }
})

test('SignalScalerAlgorithm - scale up by Math.ceil(n/2)', async (t) => {
  const app = await buildServer(t)
  const algorithm = new SignalScalerAlgorithm(app, {
    FW: 10000,
    HOT_RATE_THRESHOLD: 0.5
  })

  const applicationId = 'test-app-scale-amount-' + Date.now()
  const now = Date.now()

  for (let i = 0; i < 20; i++) {
    const signal = { type: 'cpu', value: 0.95, timestamp: now - i * 2000 }
    await algorithm.storeSignal(applicationId, 'pod-1', signal)
    await algorithm.storeSignal(applicationId, 'pod-2', signal)
    await algorithm.storeSignal(applicationId, 'pod-3', signal)
    await algorithm.storeSignal(applicationId, 'pod-4', signal)
    await algorithm.storeSignal(applicationId, 'pod-5', signal)
    await algorithm.storeSignal(applicationId, 'pod-6', signal)
    await algorithm.storeSignal(applicationId, 'pod-7', signal)
    await algorithm.storeSignal(applicationId, 'pod-8', signal)
  }

  const decision10 = await algorithm.calculateScalingDecision(applicationId, 10, 1, 20)
  assert.equal(decision10.nfinal, 15)

  const signals = decision10.signals
  assert.strictEqual(signals.length, 40)

  for (const signal of signals) {
    assert.ok(signal.id)
    assert.strictEqual(signal.type, 'cpu')
    assert.strictEqual(signal.value, '0.95')
  }
})
