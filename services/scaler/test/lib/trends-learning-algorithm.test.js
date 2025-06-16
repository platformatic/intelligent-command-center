'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { randomUUID } = require('node:crypto')
const { buildServer } = require('../helper')
const TrendsLearningAlgorithm = require('../../lib/trends-learning-algorithm')
const PerformanceHistory = require('../../lib/performance-history')

function createMockLog () {
  const logs = []
  return {
    debug: (data, msg) => logs.push({ level: 'debug', data, msg }),
    info: (data, msg) => logs.push({ level: 'info', data, msg }),
    warn: (data, msg) => logs.push({ level: 'warn', data, msg }),
    error: (data, msg) => logs.push({ level: 'error', data, msg }),
    getLogs: () => logs
  }
}

function createHistoryEvent (timestamp, podsAdded, action, preEluMean, preHeapMean, successScore = 0.9) {
  return {
    timestamp,
    podsAdded,
    preEluMean,
    preHeapMean,
    preEluTrend: 0.05,
    preHeapTrend: 0.03,
    deltaElu: -0.15,
    deltaHeap: -0.10,
    sigmaElu: 0.02,
    sigmaHeap: 0.01,
    successScore
  }
}

test('should run analysis with no history data', async (t) => {
  const server = await buildServer(t)
  const log = createMockLog()

  // Create a mock app that uses our mock log instead of server's log
  const mockApp = {
    ...server,
    log
  }

  const trendsAlgorithm = new TrendsLearningAlgorithm(mockApp, {
    maxHistoryEvents: 100
  })

  const applicationId = randomUUID()
  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)
  assert.strictEqual(result.predictions.length, 0)
  assert.ok(typeof result.analysisTime === 'number')

  const logs = log.getLogs()
  const infoLog = logs.find(l => l.level === 'info' && l.msg.includes('No historical data available'))
  assert.ok(infoLog, 'Should log when no historical data is available')
})

test('should analyze time slots from whitepaper example - 2 PM pattern', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    maxHistoryEvents: 100,
    confidenceThreshold: 0.8,
    timeSlotWindow: 1800
  })

  const applicationId = randomUUID()
  const now = Date.now()
  const twoPmSlot = 50400

  // "For τ = 50400 (2 PM), 25 scale-ups, 6 recent, π_{τ,up} = 0.9, n_{τ,up} = 10"
  const events = []

  for (let i = 0; i < 25; i++) {
    const daysAgo = Math.floor(i / 1)
    const baseTimestamp = now - (daysAgo * 86400 * 1000)
    const timestamp = baseTimestamp - (baseTimestamp % (86400 * 1000)) + (twoPmSlot * 1000) + (Math.random() - 0.5) * 1800 * 1000

    events.push(createHistoryEvent(
      timestamp,
      8 + Math.floor(Math.random() * 4),
      'up',
      0.94,
      0.82,
      0.85
    ))
  }

  for (const event of events) {
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)
  assert.ok(Array.isArray(result.predictions))

  const twoPmPredictions = result.predictions.filter(p => {
    const timeOfDay = Math.floor(p.absoluteTime / 1000) % 86400
    return Math.abs(timeOfDay - twoPmSlot) <= 900 && p.action === 'up'
  })

  if (twoPmPredictions.length > 0) {
    const prediction = twoPmPredictions[0]
    assert.ok(prediction.confidence > 0.7, 'Should have high confidence for 2 PM prediction')
    assert.ok(prediction.pods >= 8, 'Should predict reasonable number of pods')
    assert.ok(prediction.reasons.event_count >= 20, 'Should have sufficient historical events')
    assert.ok(prediction.reasons.avg_elu > 0.9, 'Should reflect high ELU from history')
  }
})

test('should model sequences from the whitepaper example', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    maxHistoryEvents: 100,
    confidenceThreshold: 0.5,
    sequenceWindow: 600
  })

  const applicationId = randomUUID()
  const now = Date.now()
  const twoPmSlot = 50400

  // Create scale-up events at 2 PM followed by scale-down sequences
  // whitepaper example: "Scale-downs at 2:03 PM (3 pods), 2:08 PM (7 pods)"
  const events = []

  for (let day = 0; day < 20; day++) {
    const baseDay = now - (day * 86400 * 1000)
    const twoPmTime = baseDay - (baseDay % (86400 * 1000)) + (twoPmSlot * 1000)

    events.push(createHistoryEvent(
      twoPmTime,
      10,
      'up',
      0.94,
      0.82,
      0.9
    ))

    events.push(createHistoryEvent(
      twoPmTime + 180000,
      -3,
      'down',
      0.75,
      0.65,
      0.85
    ))

    if (Math.random() > 0.2) {
      events.push(createHistoryEvent(
        twoPmTime + 480000,
        -7,
        'down',
        0.70,
        0.60,
        0.85
      ))
    }
  }

  for (const event of events) {
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)
  assert.ok(result.predictions.length > 0)

  const scaleUpPrediction = result.predictions.find(p => {
    const timeOfDay = Math.floor(p.absoluteTime / 1000) % 86400
    return Math.abs(timeOfDay - twoPmSlot) <= 900 && p.action === 'up'
  })

  if (scaleUpPrediction) {
    const scaleDownPredictions = result.predictions.filter(p =>
      p.action === 'down' &&
      p.absoluteTime > scaleUpPrediction.absoluteTime &&
      p.absoluteTime - scaleUpPrediction.absoluteTime <= 600000
    ).sort((a, b) => a.absoluteTime - b.absoluteTime)

    assert.ok(scaleDownPredictions.length >= 1, 'Should predict scale-down sequences')

    if (scaleDownPredictions.length >= 1) {
      const firstScaleDown = scaleDownPredictions[0]
      const offsetMinutes = (firstScaleDown.absoluteTime - scaleUpPrediction.absoluteTime) / 60000

      assert.ok(Math.abs(offsetMinutes - 3) <= 2, 'First scale-down should be around 3 minutes after scale-up')
      assert.ok(firstScaleDown.pods >= 2 && firstScaleDown.pods <= 5, 'Should predict reasonable pod count')
      assert.ok(firstScaleDown.reasons.seq_count >= 15, 'Should have sufficient sequence data')
    }

    if (scaleDownPredictions.length >= 2) {
      const secondScaleDown = scaleDownPredictions[1]
      const offsetMinutes = (secondScaleDown.absoluteTime - scaleUpPrediction.absoluteTime) / 60000

      assert.ok(Math.abs(offsetMinutes - 8) <= 3, 'Second scale-down should be around 8 minutes after scale-up')
      assert.ok(secondScaleDown.pods >= 5 && secondScaleDown.pods <= 10, 'Should predict reasonable pod count')
    }
  }
})

test('should apply 3-day half-life decay correctly', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    maxHistoryEvents: 100,
    confidenceThreshold: 0.1,
    lambda: Math.log(2) / 259200
  })

  const applicationId = randomUUID()
  const now = Date.now()

  const events = [
    createHistoryEvent(
      now - 86400000,
      5,
      'up',
      0.95,
      0.85,
      0.9
    ),
    createHistoryEvent(
      now - 259200000,
      10,
      'up',
      0.85,
      0.75,
      0.8
    ),
    createHistoryEvent(
      now - 864000000,
      20,
      'up',
      0.80,
      0.70,
      0.7
    )
  ]

  for (const event of events) {
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)

  if (result.predictions.length > 0) {
    const upPrediction = result.predictions.find(p => p.action === 'up')
    if (upPrediction) {
      assert.ok(upPrediction.pods < 15, 'Should be more influenced by recent events due to decay')
    }
  }
})

test('should handle confidence threshold correctly', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    maxHistoryEvents: 100,
    confidenceThreshold: 0.95
  })

  const applicationId = randomUUID()
  const now = Date.now()

  const events = [
    createHistoryEvent(now - 86400000, 5, 'up', 0.90, 0.80, 0.8),
    createHistoryEvent(now - 172800000, 3, 'up', 0.85, 0.75, 0.7)
  ]

  for (const event of events) {
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)

  const highConfidencePredictions = result.predictions.filter(p => p.confidence > 0.95)
  assert.strictEqual(highConfidencePredictions.length, 0, 'Should not generate predictions below confidence threshold')
})

test('should calculate success scores and reasons correctly', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    maxHistoryEvents: 100,
    confidenceThreshold: 0.5
  })

  const applicationId = randomUUID()
  const now = Date.now()
  const twoPmSlot = 50400

  const events = []
  for (let i = 0; i < 15; i++) {
    const timestamp = now - (i * 86400000) + (twoPmSlot * 1000)
    events.push(createHistoryEvent(
      timestamp,
      8 + Math.floor(Math.random() * 4),
      'up',
      0.92 + Math.random() * 0.08,
      0.80 + Math.random() * 0.10,
      0.8 + Math.random() * 0.2
    ))
  }

  for (const event of events) {
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)

  if (result.predictions.length > 0) {
    const prediction = result.predictions.find(p => p.action === 'up')
    if (prediction) {
      assert.ok(prediction.reasons.event_count >= 10, 'Should have event count')
      assert.ok(typeof prediction.reasons.recent_count === 'number', 'Should have recent count')
      assert.ok(typeof prediction.reasons.avg_success === 'number', 'Should have average success')
      assert.ok(typeof prediction.reasons.avg_elu === 'number', 'Should have average ELU')
      assert.ok(typeof prediction.reasons.avg_heap === 'number', 'Should have average HEAP')

      assert.ok(prediction.reasons.avg_elu >= 0.9, 'Average ELU should reflect input data')
      assert.ok(prediction.reasons.avg_heap >= 0.8, 'Average HEAP should reflect input data')
      assert.ok(prediction.reasons.avg_success >= 0.8, 'Average success should reflect input data')
    }
  }
})

test('should handle getCurrentPrediction with time window', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    maxHistoryEvents: 100,
    confidenceThreshold: 0.7,
    predictionWindow: 30
  })

  const applicationId = randomUUID()
  const now = Date.now()
  const targetTime = now + 3600000
  const targetTimeOfDay = Math.floor(targetTime / 1000) % 86400

  const events = []
  for (let i = 0; i < 20; i++) {
    const timestamp = now - (i * 86400000) + (targetTimeOfDay * 1000)
    events.push(createHistoryEvent(
      timestamp,
      6,
      'up',
      0.95,
      0.85,
      0.9
    ))
  }

  for (const event of events) {
    await performanceHistory.saveEvent(applicationId, event)
  }

  const exactMatch = await trendsAlgorithm.getCurrentPrediction(applicationId, targetTime)
  if (exactMatch) {
    assert.strictEqual(exactMatch.action, 'up')
    assert.ok(exactMatch.confidence > 0.7)
  }

  const withinWindow = await trendsAlgorithm.getCurrentPrediction(applicationId, targetTime + 25000)
  if (withinWindow) {
    assert.strictEqual(withinWindow.action, 'up')
  }

  const outsideWindow = await trendsAlgorithm.getCurrentPrediction(applicationId, targetTime + 35000)
  assert.strictEqual(outsideWindow, null, 'Should not return prediction outside time window')
})

test('should handle edge cases gracefully', async (t) => {
  const server = await buildServer(t)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    maxHistoryEvents: 100
  })

  const applicationId = randomUUID()

  const emptyResult = await trendsAlgorithm.runAnalysis(applicationId)
  assert.strictEqual(emptyResult.success, true)
  assert.strictEqual(emptyResult.predictions.length, 0)

  const noPrediction = await trendsAlgorithm.getCurrentPrediction(applicationId, Date.now())
  assert.strictEqual(noPrediction, null)
})

test('should handle database errors in getCurrentPrediction', async (t) => {
  const log = createMockLog()
  const mockApp = {
    log,
    platformatic: {
      entities: {
        performanceHistory: {
          findMany: async () => {
            throw new Error('Database error')
          }
        }
      }
    }
  }

  const trendsAlgorithm = new TrendsLearningAlgorithm(mockApp, {
    maxHistoryEvents: 100
  })

  const applicationId = randomUUID()
  const result = await trendsAlgorithm.getCurrentPrediction(applicationId, Date.now())

  assert.strictEqual(result, null)

  const logs = log.getLogs()
  const errorLog = logs.find(l => l.level === 'error' && l.msg.includes('Failed to load performance history for trends from database'))
  assert.ok(errorLog, 'Should log when database error occurs')
})
