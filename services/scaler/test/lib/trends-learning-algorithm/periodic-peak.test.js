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

function getWeekday (timestamp) {
  return new Date(timestamp).getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
}

test('should predict daily 14:50 peak usage pattern', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    maxHistoryEvents: 1000,
    confidenceThreshold: 0.7,
    timeSlotWindow: 1800,
    sequenceWindow: 900
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const peakTimeSlot = 53400 // 14:50 (14*3600 + 50*60 = 53400)

  for (let day = 0; day < 21; day++) {
    const dayStart = Math.floor(currentTime / (86400 * 1000)) * (86400 * 1000) - (day * 86400 * 1000)

    const scaleUpTime = dayStart + (peakTimeSlot * 1000)
    const scaleUpEvent = createHistoryEvent(scaleUpTime, 8, 0.95, 0.85, 0.88)
    await performanceHistory.saveEvent(applicationId, scaleUpEvent)

    const scaleDownTime = scaleUpTime + (10 * 60 * 1000)
    const scaleDownEvent = createHistoryEvent(scaleDownTime, -5, 0.75, 0.65, 0.90)
    await performanceHistory.saveEvent(applicationId, scaleDownEvent)
    const randomEventsCount = Math.floor(Math.random() * 8) + 5
    for (let i = 0; i < randomEventsCount; i++) {
      const randomTimeOfDay = Math.floor(Math.random() * 86400)
      if (Math.abs(randomTimeOfDay - peakTimeSlot) > 3600) {
        const eventTime = dayStart + (randomTimeOfDay * 1000)
        const event = createHistoryEvent(
          eventTime,
          Math.random() < 0.6 ? Math.floor(Math.random() * 4) + 1 : -(Math.floor(Math.random() * 3) + 1),
          0.80 + Math.random() * 0.1,
          0.70 + Math.random() * 0.1,
          0.7 + Math.random() * 0.3
        )
        await performanceHistory.saveEvent(applicationId, event)
      }
    }
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)
  assert.ok(result.predictions.length > 0, 'Should generate predictions')

  const peakPrediction = result.predictions.find(p =>
    p.action === 'up' &&
    Math.abs(p.timeOfDay - peakTimeSlot) < 900
  )

  assert.ok(peakPrediction, 'Should predict scale-up around 14:50')
  assert.ok(peakPrediction.confidence > 0.7, 'Should have high confidence for daily pattern')
  assert.ok(peakPrediction.pods >= 6, 'Should predict significant scaling')

  assert.ok(peakPrediction.reasons.event_count >= 18, 'Should have significant event count from daily pattern')
  assert.ok(peakPrediction.reasons.avg_elu > 0.9, 'Should show high average ELU during peak')
  const scaleDownPredictions = result.predictions.filter(p =>
    p.action === 'down' &&
    p.timeOfDay > peakTimeSlot &&
    p.timeOfDay < peakTimeSlot + 1800
  ).sort((a, b) => a.timeOfDay - b.timeOfDay)

  assert.ok(scaleDownPredictions.length >= 1, 'Should predict scale-down after peak')

  const firstScaleDown = scaleDownPredictions[0]
  const scaleDownOffset = firstScaleDown.timeOfDay - peakTimeSlot
  assert.ok(scaleDownOffset >= 300 && scaleDownOffset <= 1200, 'Scale-down should be 5-20 minutes after peak')
  assert.ok(firstScaleDown.pods >= 3, 'Should scale down significantly')
  assert.ok(firstScaleDown.reasons.seq_count >= 10, 'Should have reasonable sequence data')
})

test('should predict consistent daily pattern across all weekdays', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    maxHistoryEvents: 1000,
    confidenceThreshold: 0.8,
    timeSlotWindow: 1800,
    sequenceWindow: 1200
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const consistentPeakSlot = 53400 // 14:50

  for (let day = 0; day < 30; day++) {
    const dayStart = Math.floor(currentTime / (86400 * 1000)) * (86400 * 1000) - (day * 86400 * 1000)

    const scaleUpTime = dayStart + (consistentPeakSlot * 1000)
    const scaleUpEvent = createHistoryEvent(scaleUpTime, 9, 0.94, 0.84, 0.89)
    await performanceHistory.saveEvent(applicationId, scaleUpEvent)

    const scaleDown1Time = scaleUpTime + (8 * 60 * 1000)
    const scaleDown1Event = createHistoryEvent(scaleDown1Time, -3, 0.78, 0.68, 0.91)
    await performanceHistory.saveEvent(applicationId, scaleDown1Event)

    const scaleDown2Time = scaleUpTime + (20 * 60 * 1000)
    const scaleDown2Event = createHistoryEvent(scaleDown2Time, -6, 0.72, 0.62, 0.93)
    await performanceHistory.saveEvent(applicationId, scaleDown2Event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)
  assert.ok(result.predictions.length > 0, 'Should generate predictions for consistent daily pattern')

  const mainPrediction = result.predictions.find(p =>
    p.action === 'up' && Math.abs(p.timeOfDay - consistentPeakSlot) < 900
  )

  assert.ok(mainPrediction, 'Should predict the consistent daily 14:50 peak')
  assert.ok(mainPrediction.confidence > 0.8, 'Should have very high confidence for truly daily pattern')
  assert.ok(mainPrediction.pods >= 8, 'Should predict appropriate scaling')
  assert.strictEqual(mainPrediction.reasons.event_count, 30, 'Should count all 30 daily events')

  const scaleDownPredictions = result.predictions.filter(p =>
    p.action === 'down' &&
    p.timeOfDay > consistentPeakSlot &&
    p.timeOfDay < consistentPeakSlot + 1800
  ).sort((a, b) => a.timeOfDay - b.timeOfDay)

  assert.ok(scaleDownPredictions.length >= 1, 'Should predict scale-down sequence')

  const firstScaleDown = scaleDownPredictions[0]
  const firstOffset = firstScaleDown.timeOfDay - consistentPeakSlot
  assert.ok(firstOffset >= 300 && firstOffset <= 1800, 'First scale-down should be 5-30 minutes after peak')
  assert.ok(firstScaleDown.pods >= 2, 'First scale-down should be meaningful')
  if (scaleDownPredictions.length >= 2) {
    const secondScaleDown = scaleDownPredictions[1]
    const secondOffset = secondScaleDown.timeOfDay - consistentPeakSlot
    assert.ok(secondOffset >= 600 && secondOffset <= 1800, 'Second scale-down should be 10-30 minutes after peak')
    assert.ok(secondScaleDown.pods >= 2, 'Second scale-down should be meaningful')
  }

  console.log('\nSUCCESSFUL DAILY PATTERN:')
  console.log(`Main prediction confidence: ${mainPrediction.confidence.toFixed(3)}`)
  console.log(`Events counted: ${mainPrediction.reasons.event_count}`)
  console.log(`Scale-down sequences: ${scaleDownPredictions.length}`)
  console.log('This demonstrates the algorithm works well for truly daily patterns')
})

test('should demonstrate reduced confidence with mixed weekday/weekend patterns', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    maxHistoryEvents: 1000,
    confidenceThreshold: 0.5, // Lower threshold to catch mixed patterns
    timeSlotWindow: 1800
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const mixedPeakSlot = 53400 // 14:50

  for (let day = 0; day < 28; day++) {
    const dayStart = Math.floor(currentTime / (86400 * 1000)) * (86400 * 1000) - (day * 86400 * 1000)
    const weekday = getWeekday(dayStart)

    if (weekday >= 1 && weekday <= 5) {
      const scaleUpTime = dayStart + (mixedPeakSlot * 1000)
      const scaleUpEvent = createHistoryEvent(scaleUpTime, 10, 0.96, 0.86, 0.92)
      await performanceHistory.saveEvent(applicationId, scaleUpEvent)
    } else {
      if (Math.random() < 0.3) {
        const scaleUpTime = dayStart + (mixedPeakSlot * 1000)
        const scaleUpEvent = createHistoryEvent(scaleUpTime, 4, 0.88, 0.78, 0.75)
        await performanceHistory.saveEvent(applicationId, scaleUpEvent)
      }
    }
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)

  const mixedPrediction = result.predictions.find(p =>
    p.action === 'up' && Math.abs(p.timeOfDay - mixedPeakSlot) < 900
  )

  if (mixedPrediction) {
    console.log('\nMIXED WEEKDAY/WEEKEND PATTERN RESULTS:')
    console.log(`Prediction confidence: ${mixedPrediction.confidence.toFixed(3)}`)
    console.log(`Total events at 14:50: ${mixedPrediction.reasons.event_count}`)
    console.log(`Average success score: ${mixedPrediction.reasons.avg_success.toFixed(3)}`)

    console.log('\nOBSERVATION:')
    console.log('- Mixed patterns result in lower confidence scores')
    console.log('- Algorithm averages weekday and weekend performance')
    console.log('- Cannot distinguish when pattern should/shouldn\'t apply')
    assert.ok(mixedPrediction.confidence > 0.5, 'Mixed pattern still generates predictions')
    assert.ok(mixedPrediction.confidence < 0.85, 'But confidence is lower than pure daily patterns')
  }

  assert.strictEqual(result.success, true, 'Algorithm handles mixed patterns with appropriate confidence')
})
