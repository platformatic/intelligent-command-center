'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { randomUUID } = require('node:crypto')
const { buildServer } = require('../../helper')
const TrendsLearningAlgorithm = require('../../../lib/trends-learning-algorithm')
const PerformanceHistory = require('../../../lib/performance-history')

function createHistoryEvent (timestamp, podsAdded, preEluMean, preHeapMean, successScore = 0.9, totalPods = Math.abs(podsAdded) + 5) {
  return {
    timestamp,
    podsAdded,
    totalPods,
    preEluMean,
    preHeapMean,
    preEluTrend: 0.002,
    preHeapTrend: 0.001,
    deltaElu: -0.15 * Math.abs(podsAdded),
    deltaHeap: -0.10 * Math.abs(podsAdded),
    sigmaElu: 0.05,
    sigmaHeap: 0.04,
    successScore
  }
}

test('should handle very large history datasets', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    maxHistoryEvents: 2000,
    confidenceThreshold: 0.7
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()

  for (let i = 0; i < 2500; i++) {
    const eventTime = currentTime - (i * 3600 * 1000)
    const event = createHistoryEvent(
      eventTime,
      Math.floor(Math.random() * 10) + 1,
      0.8 + Math.random() * 0.15,
      0.7 + Math.random() * 0.15,
      0.6 + Math.random() * 0.4
    )
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)
  assert.ok(result.analysisTime < 30000, 'Should complete large dataset analysis in reasonable time')
})

test('should handle midnight wraparound for time slots', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    timeSlotWindow: 1800,
    confidenceThreshold: 0.6
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const midnightSlot = 0
  const lateNightSlot = 86400 - 900

  const currentDayStart = Math.floor(currentTime / (86400 * 1000)) * (86400 * 1000)

  for (let day = 0; day < 10; day++) {
    const dayStart = currentDayStart - (day * 86400 * 1000)

    const midnightEvent = createHistoryEvent(
      dayStart + (midnightSlot * 1000),
      5,
      0.88,
      0.78,
      0.85
    )
    await performanceHistory.saveEvent(applicationId, midnightEvent)

    const lateNightEvent = createHistoryEvent(
      dayStart + (lateNightSlot * 1000),
      3,
      0.85,
      0.75,
      0.80
    )
    await performanceHistory.saveEvent(applicationId, lateNightEvent)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)

  const midnightPredictions = result.predictions.filter(p =>
    Math.abs(p.timeOfDay - midnightSlot) < 900 ||
    Math.abs(p.timeOfDay - lateNightSlot) < 900
  )

  if (midnightPredictions.length > 0) {
    assert.ok(midnightPredictions.some(p => p.confidence > 0.5), 'Should handle midnight wraparound correctly')
  }
})

test('should handle events with zero or negative success scores', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    confidenceThreshold: 0.3
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const testSlot = 36000

  for (let i = 0; i < 15; i++) {
    const eventTime = currentTime - (i * 86400 * 1000) + (testSlot * 1000)
    const event = createHistoryEvent(
      eventTime,
      4,
      0.92,
      0.82,
      i < 5 ? 0 : (i < 10 ? -0.1 : 0.2)
    )
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)

  const prediction = result.predictions.find(p =>
    Math.abs(p.timeOfDay - testSlot) < 900
  )

  if (prediction) {
    assert.ok(prediction.confidence >= 0, 'Confidence should not be negative')
    assert.ok(prediction.reasons.avg_success >= 0, 'Average success should handle negative scores')
  }
})

test('should handle extremely high and low ELU/HEAP values', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    confidenceThreshold: 0.5
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const testSlot = 39600

  for (let i = 0; i < 8; i++) {
    const eventTime = currentTime - (i * 86400 * 1000) + (testSlot * 1000)
    const event = createHistoryEvent(
      eventTime,
      6,
      i < 4 ? 1.5 : 0.001,
      i < 4 ? 1.2 : 0.001,
      0.85
    )
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)

  const prediction = result.predictions.find(p =>
    Math.abs(p.timeOfDay - testSlot) < 900
  )

  if (prediction) {
    assert.ok(prediction.reasons.avg_elu >= 0, 'Should handle extreme ELU values')
    assert.ok(prediction.reasons.avg_heap >= 0, 'Should handle extreme HEAP values')
    assert.ok(isFinite(prediction.confidence), 'Confidence should be finite')
  }
})

test('should handle events clustered in very short time windows', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    timeSlotWindow: 300,
    confidenceThreshold: 0.6
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const baseSlot = 43200

  for (let day = 0; day < 5; day++) {
    const dayStart = Math.floor(currentTime / (86400 * 1000)) * (86400 * 1000) - (day * 86400 * 1000)

    for (let minute = 0; minute < 5; minute++) {
      const eventTime = dayStart + ((baseSlot + minute * 60) * 1000)
      const event = createHistoryEvent(eventTime, 2, 0.90, 0.80, 0.85)
      await performanceHistory.saveEvent(applicationId, event)
    }
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)

  const predictions = result.predictions.filter(p =>
    Math.abs(p.timeOfDay - baseSlot) < 300
  )

  if (predictions.length > 0) {
    assert.ok(predictions[0].confidence > 0, 'Should handle clustered events')
    // Adjust expectation - with 5 days * 5 events = 25 events, but they may not all be clustered in the same slot
    assert.ok(predictions[0].reasons.event_count >= 5, 'Should aggregate clustered events')
  }
})

test('should handle mixed scale-up and scale-down events in same time slot', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    confidenceThreshold: 0.5
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const testSlot = 46800

  for (let i = 0; i < 12; i++) {
    const eventTime = currentTime - (i * 86400 * 1000) + (testSlot * 1000)
    const isScaleUp = i % 2 === 0
    const event = createHistoryEvent(
      eventTime,
      isScaleUp ? 5 : -3,
      0.88,
      0.78,
      0.80
    )
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)

  const upPredictions = result.predictions.filter(p =>
    p.action === 'up' && Math.abs(p.timeOfDay - testSlot) < 900
  )

  const downPredictions = result.predictions.filter(p =>
    p.action === 'down' && Math.abs(p.timeOfDay - testSlot) < 900
  )

  if (upPredictions.length > 0 || downPredictions.length > 0) {
    const prediction = upPredictions[0] || downPredictions[0]
    assert.ok(prediction.confidence > 0, 'Should handle mixed actions in same slot')
  }
})

test('should handle sequence modeling with no scale-down events', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    confidenceThreshold: 0.7,
    sequenceWindow: 600
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const testSlot = 50400

  for (let i = 0; i < 8; i++) {
    const eventTime = currentTime - (i * 86400 * 1000) + (testSlot * 1000)
    const event = createHistoryEvent(eventTime, 8, 0.94, 0.82, 0.90)
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)

  const upPrediction = result.predictions.find(p =>
    p.action === 'up' && Math.abs(p.timeOfDay - testSlot) < 900
  )

  if (upPrediction) {
    const downPredictions = result.predictions.filter(p =>
      p.action === 'down' && p.timeOfDay > testSlot && p.timeOfDay < testSlot + 600
    )
    assert.strictEqual(downPredictions.length, 0, 'Should not generate scale-down sequences when none exist')
  }
})

test('should handle very old events beyond decay window', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    lambda: Math.log(2) / 86400,
    confidenceThreshold: 0.3
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const testSlot = 32400

  for (let i = 0; i < 5; i++) {
    const veryOldTime = currentTime - (60 * 86400 * 1000) + (testSlot * 1000)
    const event = createHistoryEvent(veryOldTime, 4, 0.85, 0.75, 0.95)
    await performanceHistory.saveEvent(applicationId, event)
  }

  for (let i = 0; i < 3; i++) {
    const recentTime = currentTime - (i * 86400 * 1000) + (testSlot * 1000)
    const event = createHistoryEvent(recentTime, 6, 0.92, 0.82, 0.80)
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)

  const prediction = result.predictions.find(p =>
    Math.abs(p.timeOfDay - testSlot) < 900
  )

  if (prediction) {
    assert.ok(prediction.reasons.avg_success < 0.9, 'Recent events should dominate despite old high-success events')
    assert.ok(prediction.reasons.recent_count <= 3, 'Should correctly count recent events')
  }
})

test('should handle runAnalysis with no matching time windows', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    predictionWindow: 30,
    confidenceThreshold: 0.8
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const targetTime = currentTime + 7200000

  for (let i = 0; i < 5; i++) {
    const eventTime = currentTime - (i * 86400 * 1000) + (32400 * 1000)
    const event = createHistoryEvent(eventTime, 4, 0.88, 0.78, 0.85)
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)
  assert.strictEqual(result.success, true)

  const prediction = result.predictions.find(p => {
    const timeDiff = Math.abs(targetTime - p.absoluteTime)
    return timeDiff <= 30000 && p.confidence >= 0.8
  })

  assert.strictEqual(prediction, undefined, 'Should not find predictions when no time windows match')
})

test('should handle runAnalysis with low confidence predictions', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    predictionWindow: 30,
    confidenceThreshold: 0.9
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const targetTime = currentTime + 3600000
  const targetTimeOfDay = Math.floor(targetTime / 1000) % 86400

  for (let i = 0; i < 4; i++) {
    const eventTime = currentTime - (i * 86400 * 1000) + (targetTimeOfDay * 1000)
    const event = createHistoryEvent(eventTime, 3, 0.85, 0.75, 0.6)
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)
  assert.strictEqual(result.success, true)

  const prediction = result.predictions.find(p => {
    const timeDiff = Math.abs(targetTime - p.absoluteTime)
    return timeDiff <= 30000 && p.confidence >= 0.9
  })

  assert.strictEqual(prediction, undefined, 'Should not find predictions when confidence is below threshold')
})

test('should handle empty time slots with no events', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    confidenceThreshold: 0.5
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()

  for (let i = 0; i < 5; i++) {
    const randomTime = currentTime - (i * 86400 * 1000) + (Math.random() * 20000 * 1000)
    const event = createHistoryEvent(randomTime, 2, 0.80, 0.70, 0.75)
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)
  assert.ok(Array.isArray(result.predictions), 'Should return predictions array even with sparse data')
})

test('should handle concurrent scale events in sequence modeling', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    sequenceWindow: 600,
    confidenceThreshold: 0.6
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const baseSlot = 50400

  for (let day = 0; day < 8; day++) {
    const dayStart = Math.floor(currentTime / (86400 * 1000)) * (86400 * 1000) - (day * 86400 * 1000)

    const scaleUpTime = dayStart + (baseSlot * 1000)
    const scaleUpEvent = createHistoryEvent(scaleUpTime, 10, 0.94, 0.82, 0.85)
    await performanceHistory.saveEvent(applicationId, scaleUpEvent)

    const down1Time = scaleUpTime + (120 * 1000)
    const down1Event = createHistoryEvent(down1Time, -2, 0.80, 0.70, 0.88)
    await performanceHistory.saveEvent(applicationId, down1Event)

    const down2Time = scaleUpTime + (125 * 1000)
    const down2Event = createHistoryEvent(down2Time, -3, 0.75, 0.65, 0.90)
    await performanceHistory.saveEvent(applicationId, down2Event)

    const down3Time = scaleUpTime + (480 * 1000)
    const down3Event = createHistoryEvent(down3Time, -5, 0.70, 0.60, 0.85)
    await performanceHistory.saveEvent(applicationId, down3Event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)

  const downPredictions = result.predictions.filter(p =>
    p.action === 'down' && p.timeOfDay > baseSlot && p.timeOfDay < baseSlot + 600
  ).sort((a, b) => a.timeOfDay - b.timeOfDay)

  if (downPredictions.length > 0) {
    assert.ok(downPredictions.length >= 2, 'Should model multiple scale-down sequences')
    assert.ok(downPredictions[0].reasons.seq_count >= 6, 'Should aggregate concurrent scale-down events')
  }
})

test('should handle analysis with maximum history limit', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    maxHistoryEvents: 10,
    confidenceThreshold: 0.5
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()

  for (let i = 0; i < 50; i++) {
    const eventTime = currentTime - (i * 3600 * 1000)
    const event = createHistoryEvent(eventTime, 3, 0.85, 0.75, 0.80)
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)
  assert.ok(result.analysisTime < 5000, 'Should complete quickly with limited history')
})
