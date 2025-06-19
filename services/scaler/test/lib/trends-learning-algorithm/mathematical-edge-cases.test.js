'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { randomUUID } = require('node:crypto')
const { buildServer } = require('../../helper')
const TrendsLearningAlgorithm = require('../../../lib/trends-learning-algorithm')
const PerformanceHistory = require('../../../lib/performance-history')

function createHistoryEvent (timestamp, podsAdded, preEluMean, preHeapMean, successScore = 0.9) {
  return {
    timestamp,
    podsAdded,
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

test('should handle decay calculation with zero time difference', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    lambda: Math.log(2) / 259200,
    confidenceThreshold: 0.5
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const testSlot = 43200

  const event = createHistoryEvent(currentTime + (testSlot * 1000), 5, 0.90, 0.80, 0.85)
  await performanceHistory.saveEvent(applicationId, event)

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)

  const prediction = result.predictions.find(p =>
    Math.abs(p.timeOfDay - testSlot) < 900
  )

  if (prediction) {
    assert.ok(isFinite(prediction.confidence), 'Confidence should be finite with zero time difference')
    assert.ok(prediction.confidence <= 1.0, 'Confidence should not exceed 1.0')
  }
})

test('should handle division by zero in confidence calculations', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    confidenceThreshold: 0.1
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const testSlot = 36000

  for (let i = 0; i < 5; i++) {
    const eventTime = currentTime - (i * 86400 * 1000) + (testSlot * 1000)
    const event = createHistoryEvent(eventTime, 3, 0.85, 0.75, 0.0)
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)

  const prediction = result.predictions.find(p =>
    Math.abs(p.timeOfDay - testSlot) < 900
  )

  if (prediction) {
    assert.ok(!isNaN(prediction.confidence), 'Confidence should not be NaN')
    assert.ok(isFinite(prediction.confidence), 'Confidence should be finite')
    assert.ok(prediction.confidence >= 0, 'Confidence should be non-negative')
  }
})

test('should handle extremely large lambda values', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    lambda: 1000,
    confidenceThreshold: 0.1
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const testSlot = 39600

  for (let i = 0; i < 8; i++) {
    const eventTime = currentTime - (i * 86400 * 1000) + (testSlot * 1000)
    const event = createHistoryEvent(eventTime, 4, 0.88, 0.78, 0.80)
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)

  const prediction = result.predictions.find(p =>
    Math.abs(p.timeOfDay - testSlot) < 900
  )

  if (prediction) {
    assert.ok(prediction.confidence >= 0, 'Should handle extreme decay gracefully')
    assert.ok(prediction.reasons.recent_count >= 0, 'Recent count should be valid')
  }
})

test('should handle extremely small lambda values', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    lambda: 1e-10,
    confidenceThreshold: 0.5
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const testSlot = 32400

  for (let i = 0; i < 6; i++) {
    const eventTime = currentTime - (i * 86400 * 1000) + (testSlot * 1000)
    const event = createHistoryEvent(eventTime, 7, 0.91, 0.81, 0.85)
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)

  const prediction = result.predictions.find(p =>
    Math.abs(p.timeOfDay - testSlot) < 900
  )

  if (prediction) {
    assert.ok(prediction.confidence <= 1.0, 'Should not exceed maximum confidence with minimal decay')
    assert.ok(isFinite(prediction.reasons.avg_success), 'Average success should be finite')
  }
})

test('should handle floating point precision in time calculations', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    timeSlotWindow: 1800.5,
    confidenceThreshold: 0.5
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const testSlot = 43200.7

  for (let i = 0; i < 5; i++) {
    const eventTime = currentTime - (i * 86400 * 1000) + (Math.floor(testSlot) * 1000)
    const event = createHistoryEvent(eventTime, 4, 0.89, 0.79, 0.82)
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)
  assert.ok(Array.isArray(result.predictions), 'Should handle floating point precision gracefully')
})

test('should handle sequence modeling with identical timestamps', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    sequenceWindow: 600,
    confidenceThreshold: 0.5
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const baseSlot = 50400

  for (let day = 0; day < 5; day++) {
    const dayStart = Math.floor(currentTime / (86400 * 1000)) * (86400 * 1000) - (day * 86400 * 1000)
    const scaleUpTime = dayStart + (baseSlot * 1000)

    const scaleUpEvent = createHistoryEvent(scaleUpTime, 8, 0.93, 0.83, 0.85)
    await performanceHistory.saveEvent(applicationId, scaleUpEvent)

    const identicalTime = scaleUpTime + (180 * 1000)
    const down1Event = createHistoryEvent(identicalTime, -3, 0.75, 0.65, 0.88)
    await performanceHistory.saveEvent(applicationId, down1Event)

    const down2Event = createHistoryEvent(identicalTime, -2, 0.72, 0.62, 0.90)
    await performanceHistory.saveEvent(applicationId, down2Event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)

  const downPredictions = result.predictions.filter(p =>
    p.action === 'down' && p.timeOfDay > baseSlot && p.timeOfDay < baseSlot + 600
  )

  if (downPredictions.length > 0) {
    assert.ok(downPredictions[0].pods > 0, 'Should handle identical timestamps in sequences')
    assert.ok(isFinite(downPredictions[0].reasons.avg_offset), 'Average offset should be finite')
  }
})

test('should handle weight sum approaching zero', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    lambda: Math.log(2) / 86400,
    confidenceThreshold: 0.01
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const testSlot = 46800

  for (let i = 0; i < 3; i++) {
    const veryOldTime = currentTime - (100 * 86400 * 1000) + (testSlot * 1000)
    const event = createHistoryEvent(veryOldTime, 2, 0.80, 0.70, 0.001)
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)

  const prediction = result.predictions.find(p =>
    Math.abs(p.timeOfDay - testSlot) < 900
  )

  if (prediction) {
    assert.ok(!isNaN(prediction.confidence), 'Should handle near-zero weights gracefully')
    assert.ok(isFinite(prediction.reasons.avg_elu), 'Average ELU should be finite')
    assert.ok(isFinite(prediction.reasons.avg_heap), 'Average HEAP should be finite')
  }
})

test('should handle mathematical overflow in large pod counts', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    confidenceThreshold: 0.5
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const testSlot = 39600

  for (let i = 0; i < 6; i++) {
    const eventTime = currentTime - (i * 86400 * 1000) + (testSlot * 1000)
    const event = createHistoryEvent(eventTime, 9999, 0.95, 0.85, 0.90)
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)

  const prediction = result.predictions.find(p =>
    Math.abs(p.timeOfDay - testSlot) < 900
  )

  if (prediction) {
    assert.ok(isFinite(prediction.pods), 'Pod count should be finite')
    assert.ok(prediction.pods > 0, 'Pod count should be positive')
    assert.ok(!isNaN(prediction.confidence), 'Confidence should not be NaN with large numbers')
  }
})

test('should handle edge case where all events have same timestamp modulo', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    timeSlotWindow: 86400,
    confidenceThreshold: 0.3
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const exactSlot = 43200

  for (let i = 0; i < 10; i++) {
    const eventTime = currentTime - (i * 86400 * 1000) + (exactSlot * 1000)
    const event = createHistoryEvent(eventTime, 3, 0.86, 0.76, 0.80)
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)

  const prediction = result.predictions.find(p => p.timeOfDay === exactSlot)

  if (prediction) {
    assert.strictEqual(prediction.reasons.event_count, 10, 'Should count all events in same slot')
    assert.ok(prediction.confidence > 0, 'Should have positive confidence')
  }
})

test('should handle confidence threshold edge cases', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)

  const trendsAlgorithm1 = new TrendsLearningAlgorithm(server, {
    confidenceThreshold: 0.0
  })

  const trendsAlgorithm2 = new TrendsLearningAlgorithm(server, {
    confidenceThreshold: 1.0
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const testSlot = 36000

  for (let i = 0; i < 4; i++) {
    const eventTime = currentTime - (i * 86400 * 1000) + (testSlot * 1000)
    const event = createHistoryEvent(eventTime, 4, 0.88, 0.78, 0.85)
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result1 = await trendsAlgorithm1.runAnalysis(applicationId)
  const result2 = await trendsAlgorithm2.runAnalysis(applicationId)

  assert.strictEqual(result1.success, true)
  assert.strictEqual(result2.success, true)

  const pred1 = await trendsAlgorithm1.getCurrentPrediction(applicationId, currentTime + (testSlot * 1000))
  const pred2 = await trendsAlgorithm2.getCurrentPrediction(applicationId, currentTime + (testSlot * 1000))

  if (pred1) {
    assert.ok(pred1.confidence >= 0, 'Should accept predictions with zero threshold')
  }

  assert.strictEqual(pred2, null, 'Should reject all predictions with perfect threshold')
})

test('should handle precision errors in time slot boundaries', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    timeSlotWindow: 1800,
    confidenceThreshold: 0.5
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const slotBoundary = 43200

  const boundaryEvent1 = createHistoryEvent(
    currentTime + ((slotBoundary - 900) * 1000),
    5, 0.90, 0.80, 0.85
  )
  const boundaryEvent2 = createHistoryEvent(
    currentTime + ((slotBoundary + 900) * 1000),
    5, 0.90, 0.80, 0.85
  )
  const centerEvent = createHistoryEvent(
    currentTime + (slotBoundary * 1000),
    5, 0.90, 0.80, 0.85
  )

  await performanceHistory.saveEvent(applicationId, boundaryEvent1)
  await performanceHistory.saveEvent(applicationId, boundaryEvent2)
  await performanceHistory.saveEvent(applicationId, centerEvent)

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)

  const predictions = result.predictions.filter(p =>
    Math.abs(p.timeOfDay - slotBoundary) <= 900
  )

  if (predictions.length > 0) {
    assert.ok(predictions[0].reasons.event_count >= 1, 'Should handle boundary events correctly')
  }
})
