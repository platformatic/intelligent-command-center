'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { randomUUID } = require('node:crypto')
const PerformanceHistory = require('../../lib/performance-history')

test('should handle errors in postScalingEvaluation', async (t) => {
  const logs = []
  const mockLog = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: (data, msg) => logs.push({ level: 'error', data, msg })
  }

  // Use the same timestamp for mock and evaluation
  const scalingTimestamp = Date.now()

  const mockStore = {
    loadPerfHistory: async () => [{
      timestamp: scalingTimestamp,
      podsAdded: 1,
      totalPods: 6,
      preEluMean: 0.80,
      preHeapMean: 0.75
    }],
    savePerfHistory: async () => {},
    loadClusters: async () => []
  }

  const mockMetrics = {
    getApplicationMetrics: async () => { throw new Error('Metrics error') }
  }

  const mockApp = {
    log: mockLog,
    store: mockStore
  }

  const performanceHistory = new PerformanceHistory(mockApp)

  await performanceHistory.postScalingEvaluation({
    applicationId: randomUUID(),
    scalingTimestamp,
    store: mockStore,
    log: mockLog,
    metrics: mockMetrics
  })

  assert.strictEqual(logs.length, 1)
  assert.strictEqual(logs[0].level, 'error')
  assert.strictEqual(logs[0].msg, 'Error fetching metrics for post-scaling evaluation')
})
