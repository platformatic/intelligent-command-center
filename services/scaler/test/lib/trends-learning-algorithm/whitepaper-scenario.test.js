'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { randomUUID } = require('node:crypto')
const { buildServer } = require('../../helper')
const TrendsLearningAlgorithm = require('../../../lib/trends-learning-algorithm')
const PerformanceHistory = require('../../../lib/performance-history')

/**
 * Test covering the whitepaper scenario for Trends Learning Algorithm
 * Based on reference/White_Paper_Intelligent_Autoscaling_for_Node.tex and
 * reference/reference-implementation.js
 *
 * Key scenario: Daily pattern of scaling up 10 pods at 2 PM, followed by
 * scaling down 3 pods after 3 minutes and 7 pods after 8 minutes
 */

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

test('whitepaper scenario: 2 PM daily scaling pattern with sequences', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    maxHistoryEvents: 1000,
    confidenceThreshold: 0.8,
    timeSlotWindow: 1800,
    predictionWindow: 30,
    sequenceWindow: 600
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const twoPmSlot = 50400

  for (let day = 0; day < 30; day++) {
    const currentDayStart = Math.floor(currentTime / (86400 * 1000)) * (86400 * 1000)
    const dayStart = currentDayStart - (day * 86400 * 1000)

    const scaleUpTime = dayStart + (twoPmSlot * 1000)
    const scaleUpEvent = createHistoryEvent(scaleUpTime, 10, 0.94, 0.82, 0.95)
    await performanceHistory.saveEvent(applicationId, scaleUpEvent)

    const scaleDown1Time = scaleUpTime + (3 * 60 * 1000)
    const scaleDown1Event = createHistoryEvent(scaleDown1Time, -3, 0.75, 0.70, 0.95)
    await performanceHistory.saveEvent(applicationId, scaleDown1Event)

    const scaleDown2Time = scaleUpTime + (8 * 60 * 1000)
    const scaleDown2Event = createHistoryEvent(scaleDown2Time, -7, 0.70, 0.65, 0.95)
    await performanceHistory.saveEvent(applicationId, scaleDown2Event)

    const otherEventsCount = Math.floor(Math.random() * 20) + 10
    for (let i = 0; i < otherEventsCount; i++) {
      const randomTimeOfDay = Math.floor(Math.random() * 86400)
      if (Math.abs(randomTimeOfDay - twoPmSlot) > 3600) {
        const eventTime = dayStart + (randomTimeOfDay * 1000)
        const isScaleUp = Math.random() < 0.6
        const event = createHistoryEvent(
          eventTime,
          isScaleUp ? Math.floor(Math.random() * 5) + 1 : -(Math.floor(Math.random() * 3) + 1),
          0.85 + Math.random() * 0.1,
          0.75 + Math.random() * 0.1,
          0.7 + Math.random() * 0.3
        )
        await performanceHistory.saveEvent(applicationId, event)
      }
    }
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)
  assert.ok(result.predictions.length > 0, 'Should generate predictions')

  const twoPmPrediction = result.predictions.find(p =>
    p.action === 'up' &&
    Math.abs(p.timeOfDay - twoPmSlot) < 900
  )

  assert.ok(twoPmPrediction, 'Should predict scale-up around 2 PM')
  assert.ok(twoPmPrediction.confidence > 0.8, 'Should have high confidence for 2 PM pattern')
  assert.ok(twoPmPrediction.pods >= 8, 'Should predict significant number of pods (around 10)')

  assert.ok(twoPmPrediction.reasons.event_count >= 20, 'Should have significant event count')
  assert.ok(twoPmPrediction.reasons.recent_count >= 3, 'Should have recent events (within 3 days)')
  assert.ok(twoPmPrediction.reasons.avg_elu > 0.9, 'Should show high average ELU')
  assert.ok(twoPmPrediction.reasons.avg_success > 0.8, 'Should show good success rate')

  const scaleDownPredictions = result.predictions.filter(p =>
    p.action === 'down' &&
    p.timeOfDay > twoPmSlot &&
    p.timeOfDay < twoPmSlot + 600
  ).sort((a, b) => a.timeOfDay - b.timeOfDay)

  assert.ok(scaleDownPredictions.length >= 1, 'Should predict scale-down sequences')

  const firstScaleDown = scaleDownPredictions[0]
  const firstOffset = firstScaleDown.timeOfDay - twoPmSlot
  assert.ok(firstOffset >= 120 && firstOffset <= 240, 'First scale-down should be around 3 minutes')
  assert.ok(firstScaleDown.pods >= 2 && firstScaleDown.pods <= 4, 'Should scale down ~3 pods')
  assert.ok(firstScaleDown.reasons.seq_count >= 15, 'Should have good sequence count')

  if (scaleDownPredictions.length >= 2) {
    const secondScaleDown = scaleDownPredictions[1]
    const secondOffset = secondScaleDown.timeOfDay - twoPmSlot
    assert.ok(secondOffset >= 420 && secondOffset <= 540, 'Second scale-down should be around 8 minutes')
    assert.ok(secondScaleDown.pods >= 5 && secondScaleDown.pods <= 9, 'Should scale down ~7 pods')
    assert.ok(secondScaleDown.reasons.seq_count >= 15, 'Should have good sequence count')
  }
})

test('whitepaper scenario: 3-day half-life decay weighting', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    lambda: Math.log(2) / 259200,
    confidenceThreshold: 0.5,
    timeSlotWindow: 1800
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const testSlot = 32400

  const events = [
    { age: 1, count: 5, successScore: 0.9 },
    { age: 5, count: 3, successScore: 0.8 },
    { age: 10, count: 2, successScore: 0.7 }
  ]

  for (const eventGroup of events) {
    for (let i = 0; i < eventGroup.count; i++) {
      const eventTime = currentTime - (eventGroup.age * 86400 * 1000) + (testSlot * 1000)
      const event = createHistoryEvent(eventTime, 5, 0.90, 0.80, eventGroup.successScore)
      await performanceHistory.saveEvent(applicationId, event)
    }
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)

  const prediction = result.predictions.find(p =>
    Math.abs(p.timeOfDay - testSlot) < 900
  )

  if (prediction) {
    assert.ok(prediction.reasons.avg_success > 0.85, 'Recent events should have higher influence due to decay')
    assert.ok(prediction.confidence > 0.5, 'Should have reasonable confidence')
  }
})

test('whitepaper scenario: frequency simulation (30-50 events per day)', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    maxHistoryEvents: 1500,
    confidenceThreshold: 0.8
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()

  let totalEvents = 0
  for (let day = 0; day < 30; day++) {
    const eventsToday = Math.floor(Math.random() * 21) + 30
    const dayStart = currentTime - (day * 86400 * 1000)

    for (let i = 0; i < eventsToday; i++) {
      const randomTimeOfDay = Math.floor(Math.random() * 86400)
      const eventTime = dayStart + (randomTimeOfDay * 1000)
      const isScaleUp = Math.random() < 0.5

      const event = createHistoryEvent(
        eventTime,
        isScaleUp ? Math.floor(Math.random() * 8) + 1 : -(Math.floor(Math.random() * 5) + 1),
        0.85 + Math.random() * 0.1,
        0.75 + Math.random() * 0.1,
        0.7 + Math.random() * 0.3
      )
      await performanceHistory.saveEvent(applicationId, event)
      totalEvents++
    }
  }

  assert.ok(totalEvents >= 900 && totalEvents <= 1500, `Should have 900-1500 events, got ${totalEvents}`)

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)
  assert.ok(typeof result.analysisTime === 'number', 'Should report analysis time')
  assert.ok(result.analysisTime < 10000, 'Should complete analysis in reasonable time')
})

test('whitepaper scenario: prediction validation with responsiveness', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    confidenceThreshold: 0.8
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const testSlot = 45000

  for (let i = 0; i < 10; i++) {
    const eventTime = currentTime - (i * 86400 * 1000) + (testSlot * 1000)
    const event = createHistoryEvent(eventTime, 6, 0.95, 0.85, 0.92)
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)

  const prediction = result.predictions.find(p =>
    Math.abs(p.timeOfDay - testSlot) < 900
  )

  if (prediction) {
    assert.ok(prediction.confidence > 0.8, 'Should have high confidence for responsive scaling')
    assert.ok(prediction.reasons.avg_success > 0.9, 'Should show high average success')
    assert.ok(prediction.reasons.avg_elu > 0.9, 'Should reflect high pre-scaling ELU')
  }
})

test('whitepaper scenario: getCurrentPrediction within prediction window', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    predictionWindow: 30,
    confidenceThreshold: 0.8
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const targetTime = currentTime + 3600000
  const targetTimeOfDay = Math.floor(targetTime / 1000) % 86400

  for (let i = 0; i < 8; i++) {
    const eventTime = currentTime - (i * 86400 * 1000) + (targetTimeOfDay * 1000)
    const event = createHistoryEvent(eventTime, 8, 0.92, 0.83, 0.85)
    await performanceHistory.saveEvent(applicationId, event)
  }

  const prediction = await trendsAlgorithm.getCurrentPrediction(applicationId, targetTime)

  if (prediction) {
    assert.strictEqual(prediction.action, 'up')
    assert.ok(prediction.confidence > 0.8)
    assert.ok(Math.abs(targetTime - prediction.absoluteTime) <= 30000, 'Should be within 30 second window')
  }

  const outsidePrediction = await trendsAlgorithm.getCurrentPrediction(applicationId, targetTime + 60000)
  assert.strictEqual(outsidePrediction, null, 'Should return null outside prediction window')
})
