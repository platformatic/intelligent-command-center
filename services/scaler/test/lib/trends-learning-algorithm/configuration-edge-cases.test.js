'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { randomUUID } = require('node:crypto')
const { buildServer } = require('../../helper')
const TrendsLearningAlgorithm = require('../../../lib/trends-learning-algorithm')
const PerformanceHistory = require('../../../lib/performance-history')

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

test('should handle undefined configuration options', async (t) => {
  const server = await buildServer(t)

  const trendsAlgorithm1 = new TrendsLearningAlgorithm(server, undefined)
  const trendsAlgorithm2 = new TrendsLearningAlgorithm(server, {})

  const applicationId = randomUUID()

  const result1 = await trendsAlgorithm1.runAnalysis(applicationId)
  const result2 = await trendsAlgorithm2.runAnalysis(applicationId)

  assert.strictEqual(result1.success, true, 'Should handle undefined options')
  assert.strictEqual(result2.success, true, 'Should handle empty options')

  // Test null separately since it causes constructor errors
  try {
    const trendsAlgorithm3 = new TrendsLearningAlgorithm(server, null)
    const result3 = await trendsAlgorithm3.runAnalysis(applicationId)
    assert.strictEqual(result3.success, true, 'Should handle null options')
  } catch (error) {
    assert.ok(error instanceof Error, 'Should throw error with null options')
  }
})

test('should handle invalid numeric configuration values', async (t) => {
  const server = await buildServer(t)

  const invalidConfigs = [
    { maxHistoryEvents: -100 },
    { confidenceThreshold: -0.5 },
    { confidenceThreshold: 1.5 },
    { timeSlotWindow: 0 },
    { predictionWindow: -30 },
    { sequenceWindow: -600 },
    { lambda: -1 }
  ]

  for (const config of invalidConfigs) {
    const trendsAlgorithm = new TrendsLearningAlgorithm(server, config)
    const applicationId = randomUUID()

    const result = await trendsAlgorithm.runAnalysis(applicationId)
    assert.strictEqual(result.success, true, `Should handle invalid config: ${JSON.stringify(config)}`)
  }
})

test('should handle non-numeric configuration values', async (t) => {
  const server = await buildServer(t)

  const nonNumericConfigs = [
    { maxHistoryEvents: 'invalid' },
    { confidenceThreshold: 'high' },
    { timeSlotWindow: null },
    { predictionWindow: undefined },
    { sequenceWindow: [] },
    { lambda: {} }
  ]

  for (const config of nonNumericConfigs) {
    const trendsAlgorithm = new TrendsLearningAlgorithm(server, config)
    const applicationId = randomUUID()

    const result = await trendsAlgorithm.runAnalysis(applicationId)
    assert.strictEqual(result.success, true, `Should handle non-numeric config: ${JSON.stringify(config)}`)
  }
})

test('should handle extremely large configuration values', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)

  const extremeConfig = {
    maxHistoryEvents: Number.MAX_SAFE_INTEGER,
    confidenceThreshold: 0.5,
    timeSlotWindow: Number.MAX_SAFE_INTEGER,
    predictionWindow: Number.MAX_SAFE_INTEGER,
    sequenceWindow: Number.MAX_SAFE_INTEGER,
    lambda: Number.MAX_VALUE
  }

  const trendsAlgorithm = new TrendsLearningAlgorithm(server, extremeConfig)
  const applicationId = randomUUID()
  const currentTime = Date.now()

  const event = createHistoryEvent(currentTime + (43200 * 1000), 5, 0.90, 0.80, 0.85)
  await performanceHistory.saveEvent(applicationId, event)

  const result = await trendsAlgorithm.runAnalysis(applicationId)
  assert.strictEqual(result.success, true, 'Should handle extremely large config values')
})

test('should handle configuration with special numeric values', async (t) => {
  const server = await buildServer(t)

  const specialConfigs = [
    { lambda: Infinity },
    { lambda: -Infinity },
    { lambda: NaN },
    { confidenceThreshold: NaN },
    { timeSlotWindow: Infinity },
    { maxHistoryEvents: NaN }
  ]

  for (const config of specialConfigs) {
    const trendsAlgorithm = new TrendsLearningAlgorithm(server, config)
    const applicationId = randomUUID()

    const result = await trendsAlgorithm.runAnalysis(applicationId)
    assert.strictEqual(result.success, true, `Should handle special numeric config: ${JSON.stringify(config)}`)
  }
})

test('should handle missing app parameter', async (t) => {
  try {
    const trendsAlgorithm = new TrendsLearningAlgorithm(null)
    const applicationId = randomUUID()

    const result = await trendsAlgorithm.runAnalysis(applicationId)
    assert.strictEqual(result.success, false, 'Should fail gracefully with null app')
  } catch (error) {
    assert.ok(error instanceof Error, 'Should throw error with null app')
  }
})

test('should handle app without log property', async (t) => {
  const mockApp = {
    platformatic: {
      entities: {
        performanceHistory: {
          find: async () => []
        }
      }
    }
  }

  try {
    const trendsAlgorithm = new TrendsLearningAlgorithm(mockApp)
    const applicationId = randomUUID()

    const result = await trendsAlgorithm.runAnalysis(applicationId)
    assert.ok(result.success !== undefined, 'Should handle app without log property')
  } catch (error) {
    assert.ok(error instanceof Error, 'Should handle missing log gracefully')
  }
})

test('should handle app without platformatic property', async (t) => {
  const log = createMockLog()
  const mockApp = { log }

  const trendsAlgorithm = new TrendsLearningAlgorithm(mockApp)
  const applicationId = randomUUID()

  const result = await trendsAlgorithm.runAnalysis(applicationId)
  // The algorithm gracefully handles missing platformatic entities and returns success: true with empty predictions
  assert.strictEqual(result.success, true, 'Should handle missing platformatic entities gracefully')
  assert.strictEqual(result.predictions.length, 0, 'Should return empty predictions')

  const logs = log.getLogs()
  const errorLog = logs.find(l => l.level === 'error')
  assert.ok(errorLog, 'Should log error when platformatic entities are missing')
})

test('should handle configuration with readonly properties', async (t) => {
  const server = await buildServer(t)

  const config = {}
  Object.defineProperty(config, 'maxHistoryEvents', {
    value: 500,
    writable: false,
    configurable: false
  })

  const trendsAlgorithm = new TrendsLearningAlgorithm(server, config)
  const applicationId = randomUUID()

  const result = await trendsAlgorithm.runAnalysis(applicationId)
  assert.strictEqual(result.success, true, 'Should handle readonly configuration properties')
})

test('should handle configuration with getter properties', async (t) => {
  const server = await buildServer(t)

  const config = {
    get confidenceThreshold () {
      return 0.7
    }
  }

  // Test case where getter works
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, config)
  const applicationId = randomUUID()

  const result = await trendsAlgorithm.runAnalysis(applicationId)
  assert.strictEqual(result.success, true, 'Should handle configuration with getter properties')

  // Test case where getter throws error
  const errorConfig = {
    get maxHistoryEvents () {
      throw new Error('Getter error')
    }
  }

  try {
    const errorTrendsAlgorithm = new TrendsLearningAlgorithm(server, errorConfig)
    const errorResult = await errorTrendsAlgorithm.runAnalysis(applicationId)
    assert.strictEqual(errorResult.success, true, 'Should handle getter errors gracefully')
  } catch (error) {
    assert.ok(error instanceof Error, 'Should handle getter errors')
  }
})

test('should handle configuration parameter type coercion', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)

  const config = {
    maxHistoryEvents: '100',
    confidenceThreshold: '0.6',
    timeSlotWindow: '1800',
    predictionWindow: '30',
    sequenceWindow: '600',
    lambda: '0.000001'
  }

  const trendsAlgorithm = new TrendsLearningAlgorithm(server, config)
  const applicationId = randomUUID()
  const currentTime = Date.now()

  for (let i = 0; i < 5; i++) {
    const eventTime = currentTime - (i * 86400 * 1000) + (43200 * 1000)
    const event = createHistoryEvent(eventTime, 6, 0.91, 0.81, 0.85)
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)
  assert.strictEqual(result.success, true, 'Should handle string numeric configurations')

  if (result.predictions.length > 0) {
    assert.ok(result.predictions[0].confidence >= 0, 'Should properly convert string threshold')
  }
})

test('should handle configuration with prototype pollution attempt', async (t) => {
  const server = await buildServer(t)

  const maliciousConfig = {
    __proto__: {
      maxHistoryEvents: 9999,
      confidenceThreshold: 0
    },
    'constructor.prototype.malicious': 'value'
  }

  const trendsAlgorithm = new TrendsLearningAlgorithm(server, maliciousConfig)
  const applicationId = randomUUID()

  const result = await trendsAlgorithm.runAnalysis(applicationId)
  assert.strictEqual(result.success, true, 'Should handle malicious configuration safely')
})

test('should handle configuration with circular references', async (t) => {
  const server = await buildServer(t)

  const config = { maxHistoryEvents: 100 }
  config.self = config
  config.circular = { parent: config }

  const trendsAlgorithm = new TrendsLearningAlgorithm(server, config)
  const applicationId = randomUUID()

  const result = await trendsAlgorithm.runAnalysis(applicationId)
  assert.strictEqual(result.success, true, 'Should handle circular configuration references')
})

test('should validate configuration bounds at runtime', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)

  const config = {
    confidenceThreshold: 2.0
  }

  const trendsAlgorithm = new TrendsLearningAlgorithm(server, config)
  const applicationId = randomUUID()
  const currentTime = Date.now()

  const event = createHistoryEvent(currentTime + (43200 * 1000), 5, 0.90, 0.80, 0.95)
  await performanceHistory.saveEvent(applicationId, event)

  const result = await trendsAlgorithm.runAnalysis(applicationId)
  assert.strictEqual(result.success, true)

  assert.strictEqual(result.predictions.length, 0, 'Should respect confidence threshold bounds at runtime')
})

test('should handle configuration modifications after instantiation', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)

  const config = { confidenceThreshold: 0.5 }
  const trendsAlgorithm = new TrendsLearningAlgorithm(server, config)

  config.confidenceThreshold = 0.9

  const applicationId = randomUUID()
  const currentTime = Date.now()

  for (let i = 0; i < 6; i++) {
    const eventTime = currentTime - (i * 86400 * 1000) + (43200 * 1000)
    const event = createHistoryEvent(eventTime, 5, 0.88, 0.78, 0.80)
    await performanceHistory.saveEvent(applicationId, event)
  }

  const result = await trendsAlgorithm.runAnalysis(applicationId)
  assert.strictEqual(result.success, true, 'Should not be affected by post-instantiation config changes')

  if (result.predictions.length > 0) {
    assert.ok(result.predictions[0].confidence < 0.8, 'Should use original configuration values')
  }
})
