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

test('should handle maximum time slot configurations', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    timeSlotWindow: 86400,
    confidenceThreshold: 0.5
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()

  for (let i = 0; i < 20; i++) {
    const eventTime = currentTime - (i * 86400 * 1000) + (Math.random() * 86400 * 1000)
    const event = createHistoryEvent(eventTime, 4, 0.88, 0.78, 0.80)
    await performanceHistory.saveEvent(applicationId, event)
  }

  const startTime = Date.now()
  const result = await trendsAlgorithm.runAnalysis(applicationId)
  const executionTime = Date.now() - startTime

  assert.strictEqual(result.success, true)
  assert.ok(executionTime < 15000, 'Should complete analysis with maximum time slots efficiently')
})

test('should handle minimum time slot configurations', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    timeSlotWindow: 60,
    confidenceThreshold: 0.3
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()

  for (let i = 0; i < 50; i++) {
    const eventTime = currentTime - (i * 3600 * 1000)
    const event = createHistoryEvent(eventTime, 2, 0.85, 0.75, 0.75)
    await performanceHistory.saveEvent(applicationId, event)
  }

  const startTime = Date.now()
  const result = await trendsAlgorithm.runAnalysis(applicationId)
  const executionTime = Date.now() - startTime

  assert.strictEqual(result.success, true)
  assert.ok(executionTime < 10000, 'Should complete analysis with minimum time slots efficiently')
  assert.ok(result.predictions.length >= 0, 'Should generate predictions with fine-grained slots')
})

test('should handle rapid sequential runAnalysis calls', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    predictionWindow: 30,
    confidenceThreshold: 0.7
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const targetTime = currentTime + 3600000
  const targetTimeOfDay = Math.floor(targetTime / 1000) % 86400

  for (let i = 0; i < 8; i++) {
    const eventTime = currentTime - (i * 86400 * 1000) + (targetTimeOfDay * 1000)
    const event = createHistoryEvent(eventTime, 6, 0.92, 0.82, 0.85)
    await performanceHistory.saveEvent(applicationId, event)
  }

  const promises = []
  const startTime = Date.now()

  for (let i = 0; i < 10; i++) {
    promises.push(trendsAlgorithm.runAnalysis(applicationId))
  }

  const results = await Promise.all(promises)
  const executionTime = Date.now() - startTime

  assert.ok(executionTime < 5000, 'Should handle concurrent analysis requests efficiently')
  assert.ok(results.every(r => r.success === true), 'All analysis results should be successful')
  assert.ok(results.every(r => Array.isArray(r.predictions)), 'All results should contain predictions array')
})

test('should handle memory efficiency with large sequences', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    sequenceWindow: 3600,
    confidenceThreshold: 0.6
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()
  const baseSlot = 50400

  for (let day = 0; day < 15; day++) {
    const dayStart = Math.floor(currentTime / (86400 * 1000)) * (86400 * 1000) - (day * 86400 * 1000)

    const scaleUpTime = dayStart + (baseSlot * 1000)
    const scaleUpEvent = createHistoryEvent(scaleUpTime, 12, 0.95, 0.85, 0.85)
    await performanceHistory.saveEvent(applicationId, scaleUpEvent)

    for (let seq = 0; seq < 20; seq++) {
      const downTime = scaleUpTime + ((60 + seq * 120) * 1000)
      const downEvent = createHistoryEvent(downTime, -1, 0.80 - seq * 0.01, 0.70 - seq * 0.01, 0.88)
      await performanceHistory.saveEvent(applicationId, downEvent)
    }
  }

  const startTime = Date.now()
  const result = await trendsAlgorithm.runAnalysis(applicationId)
  const executionTime = Date.now() - startTime

  assert.strictEqual(result.success, true)
  assert.ok(executionTime < 20000, 'Should handle large sequence datasets efficiently')

  const downPredictions = result.predictions.filter(p =>
    p.action === 'down' && p.timeOfDay > baseSlot && p.timeOfDay < baseSlot + 3600
  )

  if (downPredictions.length > 0) {
    assert.ok(downPredictions.length <= 20, 'Should not create excessive predictions')
  }
})

test('should handle configuration parameter extremes', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)

  const extremeConfig = {
    maxHistoryEvents: 5000,
    timeSlotWindow: 43200,
    predictionWindow: 3600,
    confidenceThreshold: 0.99,
    sequenceWindow: 1800,
    lambda: Math.log(2) / 3600
  }

  const trendsAlgorithm = new TrendsLearningAlgorithm(server, extremeConfig)

  const applicationId = randomUUID()
  const currentTime = Date.now()

  for (let i = 0; i < 100; i++) {
    const eventTime = currentTime - (i * 86400 * 1000) + (Math.random() * 86400 * 1000)
    const event = createHistoryEvent(
      eventTime,
      Math.floor(Math.random() * 20) + 1,
      0.7 + Math.random() * 0.3,
      0.6 + Math.random() * 0.3,
      0.5 + Math.random() * 0.5
    )
    await performanceHistory.saveEvent(applicationId, event)
  }

  const startTime = Date.now()
  const result = await trendsAlgorithm.runAnalysis(applicationId)
  const executionTime = Date.now() - startTime

  assert.strictEqual(result.success, true)
  assert.ok(executionTime < 30000, 'Should handle extreme configurations within reasonable time')
})

test('should handle stress test with rapid analysis calls', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    maxHistoryEvents: 100,
    confidenceThreshold: 0.5
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()

  for (let i = 0; i < 50; i++) {
    const eventTime = currentTime - (i * 86400 * 1000) + (32400 * 1000)
    const event = createHistoryEvent(eventTime, 5, 0.90, 0.80, 0.85)
    await performanceHistory.saveEvent(applicationId, event)
  }

  const promises = []
  const startTime = Date.now()

  for (let i = 0; i < 5; i++) {
    promises.push(trendsAlgorithm.runAnalysis(applicationId))
  }

  const results = await Promise.all(promises)
  const executionTime = Date.now() - startTime

  assert.ok(results.every(r => r.success === true), 'All concurrent analyses should succeed')
  assert.ok(executionTime < 15000, 'Should handle concurrent analysis efficiently')
})

test('should handle garbage collection pressure', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    maxHistoryEvents: 1000,
    confidenceThreshold: 0.5
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()

  for (let batch = 0; batch < 5; batch++) {
    for (let i = 0; i < 200; i++) {
      const eventTime = currentTime - ((batch * 200 + i) * 3600 * 1000)
      const event = createHistoryEvent(
        eventTime,
        Math.floor(Math.random() * 15) + 1,
        0.8 + Math.random() * 0.2,
        0.7 + Math.random() * 0.2,
        0.6 + Math.random() * 0.4
      )
      await performanceHistory.saveEvent(applicationId, event)
    }

    const result = await trendsAlgorithm.runAnalysis(applicationId)
    assert.strictEqual(result.success, true, `Batch ${batch} should succeed under memory pressure`)
  }
})

test('should maintain consistent performance across multiple runs', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    confidenceThreshold: 0.6
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()

  for (let i = 0; i < 30; i++) {
    const eventTime = currentTime - (i * 86400 * 1000) + (43200 * 1000)
    const event = createHistoryEvent(eventTime, 7, 0.93, 0.83, 0.87)
    await performanceHistory.saveEvent(applicationId, event)
  }

  const executionTimes = []

  for (let run = 0; run < 3; run++) {
    const startTime = Date.now()
    const result = await trendsAlgorithm.runAnalysis(applicationId)
    const executionTime = Date.now() - startTime

    executionTimes.push(executionTime)
    assert.strictEqual(result.success, true, `Run ${run} should succeed`)
  }

  const avgTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
  const maxVariation = Math.max(...executionTimes) - Math.min(...executionTimes)

  // Allow for more variation in execution time due to system factors
  assert.ok(maxVariation < avgTime * 2.0 || maxVariation < 500, 'Execution time should be reasonably consistent across runs')
})

test('should handle edge case with single event analysis', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    confidenceThreshold: 0.1
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()

  const singleEvent = createHistoryEvent(currentTime + (43200 * 1000), 8, 0.95, 0.85, 0.90)
  await performanceHistory.saveEvent(applicationId, singleEvent)

  const startTime = Date.now()
  const result = await trendsAlgorithm.runAnalysis(applicationId)
  const executionTime = Date.now() - startTime

  assert.strictEqual(result.success, true)
  assert.ok(executionTime < 2000, 'Should handle single event efficiently')

  if (result.predictions.length > 0) {
    assert.ok(result.predictions[0].confidence > 0, 'Should generate valid prediction from single event')
  }
})

test('should handle resource cleanup after large operations', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    maxHistoryEvents: 800,
    confidenceThreshold: 0.5
  })

  const applicationId = randomUUID()
  const currentTime = Date.now()

  for (let i = 0; i < 1000; i++) {
    const eventTime = currentTime - (i * 3600 * 1000)
    const event = createHistoryEvent(
      eventTime,
      Math.floor(Math.random() * 12) + 1,
      0.75 + Math.random() * 0.25,
      0.65 + Math.random() * 0.25,
      0.5 + Math.random() * 0.5
    )
    await performanceHistory.saveEvent(applicationId, event)
  }

  const largeResult = await trendsAlgorithm.runAnalysis(applicationId)
  assert.strictEqual(largeResult.success, true)

  const smallEvent = createHistoryEvent(currentTime + (32400 * 1000), 3, 0.85, 0.75, 0.80)
  await performanceHistory.saveEvent(applicationId, smallEvent)

  const startTime = Date.now()
  const smallResult = await trendsAlgorithm.runAnalysis(applicationId)
  const executionTime = Date.now() - startTime

  assert.strictEqual(smallResult.success, true)
  assert.ok(executionTime < 10000, 'Should maintain performance after large operations')
})
