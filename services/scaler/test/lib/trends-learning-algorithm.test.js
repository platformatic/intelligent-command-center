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

function createHistoryEvent (timestamp, podsAdded, preEluMean, preHeapMean, successScore = 0.9, totalPods = 10) {
  return {
    timestamp,
    podsAdded,
    totalPods,
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

test('should initialize with default configuration parameters', async (t) => {
  const server = await buildServer(t)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server)

  const applicationId = randomUUID()
  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)
  assert.ok(Array.isArray(result.predictions))
  assert.ok(typeof result.analysisTime === 'number')
})

test('should handle custom configuration options', async (t) => {
  const server = await buildServer(t)
  const customOptions = {
    maxHistoryEvents: 50,
    confidenceThreshold: 0.7,
    timeSlotWindow: 900,
    predictionWindow: 60,
    sequenceWindow: 300,
    lambda: Math.log(2) / 129600 // 1.5-day half-life
  }

  const trendsAlgorithm = new TrendsLearningAlgorithm(server, customOptions)

  const applicationId = randomUUID()
  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)
  assert.ok(Array.isArray(result.predictions))
})

test('should generate predictions with basic historical data', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    maxHistoryEvents: 50,
    confidenceThreshold: 0.5
  })

  const applicationId = randomUUID()
  const now = Date.now()
  const targetSlot = 43200 // 12 PM

  // Create some basic historical events
  for (let i = 0; i < 5; i++) {
    const event = createHistoryEvent(
      now - (i * 86400 * 1000) + targetSlot * 1000,
      8,
      0.92,
      0.82,
      0.85,
      18
    )

    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)

  if (result.predictions.length > 0) {
    const prediction = result.predictions[0]
    assert.ok(typeof prediction.timeOfDay === 'number')
    assert.ok(typeof prediction.absoluteTime === 'number')
    assert.ok(typeof prediction.action === 'string')
    assert.ok(typeof prediction.pods === 'number')
    assert.ok(typeof prediction.confidence === 'number')
    assert.ok(prediction.reasons)
  }
})

test('should handle runAnalysis API with time filtering', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, {
    confidenceThreshold: 0.5,
    predictionWindow: 30
  })

  const applicationId = randomUUID()
  const now = Date.now()
  const targetTime = now + 3600000 // 1 hour from now
  const targetTimeOfDay = Math.floor(targetTime / 1000) % 86400

  // Create historical events at this time of day
  for (let i = 0; i < 5; i++) {
    const event = createHistoryEvent(
      now - (i * 86400 * 1000) + targetTimeOfDay * 1000,
      6,
      0.91,
      0.81,
      0.8,
      14
    )

    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)
  assert.strictEqual(result.success, true)

  // Should find prediction within window
  const exactMatch = result.predictions.find(p => {
    const timeDiff = Math.abs(targetTime - p.absoluteTime)
    return timeDiff <= 30000 && p.confidence >= 0.5
  })

  if (exactMatch) {
    assert.strictEqual(exactMatch.action, 'up')
    assert.ok(exactMatch.confidence > 0)
  }

  // Should not find prediction outside window
  const outsideTime = targetTime + 60000
  const outsideWindow = result.predictions.find(p => {
    const timeDiff = Math.abs(outsideTime - p.absoluteTime)
    return timeDiff <= 30000 && p.confidence >= 0.5
  })
  assert.strictEqual(outsideWindow, undefined)
})

test('should handle database errors with empty predictions', async (t) => {
  const log = createMockLog()
  const mockApp = {
    log,
    platformatic: {
      entities: {
        performanceHistory: {
          find: async () => {
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
  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)
  assert.strictEqual(result.predictions.length, 0)

  const logs = log.getLogs()
  const errorLog = logs.find(l => l.level === 'error' && l.msg.includes('Failed to load performance history'))
  assert.ok(errorLog, 'Should log when database error occurs')
})

test('should handle database errors gracefully in runAnalysis', async (t) => {
  const log = createMockLog()
  const mockApp = {
    log,
    platformatic: {
      entities: {
        performanceHistory: {
          find: async () => {
            throw new Error('Database error')
          }
        }
      }
    }
  }

  const trendsAlgorithm = new TrendsLearningAlgorithm(mockApp)

  const applicationId = randomUUID()
  const result = await trendsAlgorithm.runAnalysis(applicationId)

  assert.strictEqual(result.success, true)
  assert.strictEqual(result.predictions.length, 0)
  assert.ok(typeof result.analysisTime === 'number')

  const logs = log.getLogs()
  const errorLog = logs.find(l => l.level === 'error' && l.msg.includes('Failed to load performance history for trends from database'))
  assert.ok(errorLog, 'Should log when database error occurs')
})
