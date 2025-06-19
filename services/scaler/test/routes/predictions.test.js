'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { randomUUID } = require('node:crypto')
const { buildServer } = require('../helper')

test('GET /predictions/:applicationId should return predictions from store', async (t) => {
  const server = await buildServer(t)
  const applicationId = randomUUID()

  const testPredictions = [
    {
      applicationId,
      timeOfDay: 28800,
      absoluteTime: Date.now() + 3600000,
      action: 'up',
      pods: 3,
      confidence: 0.85,
      reasons: ['High traffic pattern detected']
    },
    {
      applicationId,
      timeOfDay: 32400,
      absoluteTime: Date.now() + 7200000,
      action: 'down',
      pods: 1,
      confidence: 0.75,
      reasons: ['Traffic reduction expected']
    }
  ]

  await server.store.replaceApplicationPredictions(applicationId, testPredictions)

  const response = await server.inject({
    method: 'GET',
    url: `/predictions/${applicationId}`
  })

  assert.strictEqual(response.statusCode, 200)

  const result = JSON.parse(response.body)
  assert.strictEqual(result.applicationId, applicationId)
  assert.ok(Array.isArray(result.predictions))
  assert.strictEqual(result.predictions.length, 2)

  assert.strictEqual(result.predictions[0].action, 'up')
  assert.strictEqual(result.predictions[0].pods, 3)
  assert.strictEqual(result.predictions[0].confidence, 0.85)
  assert.deepStrictEqual(result.predictions[0].reasons, ['High traffic pattern detected'])
})

test('GET /predictions should return all predictions from store', async (t) => {
  const server = await buildServer(t)
  const appId1 = randomUUID()
  const appId2 = randomUUID()

  const predictions1 = [{
    applicationId: appId1,
    timeOfDay: 28800,
    absoluteTime: Date.now() + 3600000,
    action: 'up',
    pods: 2,
    confidence: 0.9,
    reasons: ['Pattern 1']
  }]

  const predictions2 = [{
    applicationId: appId2,
    timeOfDay: 32400,
    absoluteTime: Date.now() + 1800000,
    action: 'up',
    pods: 4,
    confidence: 0.8,
    reasons: ['Pattern 2']
  }]

  await server.store.replaceApplicationPredictions(appId1, predictions1)
  await server.store.replaceApplicationPredictions(appId2, predictions2)

  const response = await server.inject({
    method: 'GET',
    url: '/predictions'
  })

  assert.strictEqual(response.statusCode, 200)

  const result = JSON.parse(response.body)
  assert.ok(Array.isArray(result.predictions))
  assert.strictEqual(result.predictions.length, 2)
  assert.strictEqual(result.totalPredictions, 2)

  assert.strictEqual(result.predictions[0].applicationId, appId2)
  assert.strictEqual(result.predictions[1].applicationId, appId1)

  assert.ok(result.nextPrediction)
  assert.strictEqual(result.nextPrediction.applicationId, appId2)
})

test('POST /predictions/calculate with no performance history', async (t) => {
  const server = await buildServer(t)

  const response = await server.inject({
    method: 'POST',
    url: '/predictions/calculate'
  })

  assert.strictEqual(response.statusCode, 200)

  const result = JSON.parse(response.body)
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.processedApplications, 0)
  assert.strictEqual(result.totalPredictions, 0)
  assert.deepStrictEqual(result.errors, [])
})

test('POST /predictions/calculate with performance history', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()

  // Create some performance history for the trends algorithm
  await server.platformatic.entities.performanceHistory.save({
    input: {
      applicationId: appId,
      eventTimestamp: new Date(Date.now() - 86400000).toISOString(),
      podsAdded: 2,
      preEluMean: 0.3,
      preHeapMean: 100,
      preEluTrend: 0.01,
      preHeapTrend: 1,
      deltaElu: -0.1,
      deltaHeap: -10,
      sigmaElu: 0.02,
      sigmaHeap: 5,
      successScore: 0.8,
      source: 'signal'
    }
  })

  const response = await server.inject({
    method: 'POST',
    url: '/predictions/calculate'
  })

  assert.strictEqual(response.statusCode, 200)

  const result = JSON.parse(response.body)
  assert.strictEqual(result.success, true)
  assert.ok(result.processedApplications >= 0)
  assert.ok(Array.isArray(result.errors))
})

test('Store predictions methods should work correctly', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()

  const predictions = [
    {
      applicationId: appId,
      timeOfDay: 28800,
      absoluteTime: Date.now() + 3600000,
      action: 'up',
      pods: 3,
      confidence: 0.85,
      reasons: ['Test reason']
    }
  ]

  await server.store.replaceApplicationPredictions(appId, predictions)

  const allPredictions = await server.store.getPredictions()
  assert.ok(allPredictions.length >= 1)

  const appPredictions = await server.store.getApplicationPredictions(appId)
  assert.strictEqual(appPredictions.length, 1)
  assert.strictEqual(appPredictions[0].applicationId, appId)

  const nextPrediction = await server.store.getNextPrediction()
  assert.ok(nextPrediction)

  const remaining = await server.store.removePrediction(nextPrediction)
  assert.ok(Array.isArray(remaining))

  const nextAfterRemove = await server.store.getNextPrediction()
  if (remaining.length === 0) {
    assert.strictEqual(nextAfterRemove, null)
  }
})

test('Predictions should be sorted by absoluteTime', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()

  const now = Date.now()
  const predictions = [
    {
      applicationId: appId,
      timeOfDay: 32400,
      absoluteTime: now + 7200000,
      action: 'down',
      pods: 1,
      confidence: 0.7,
      reasons: ['Later prediction']
    },
    {
      applicationId: appId,
      timeOfDay: 28800,
      absoluteTime: now + 3600000,
      action: 'up',
      pods: 3,
      confidence: 0.9,
      reasons: ['Earlier prediction']
    }
  ]

  await server.store.replaceApplicationPredictions(appId, predictions)

  const savedPredictions = await server.store.getPredictions()
  assert.ok(savedPredictions[0].absoluteTime < savedPredictions[1].absoluteTime)
  assert.strictEqual(savedPredictions[0].action, 'up')
  assert.strictEqual(savedPredictions[1].action, 'down')
})

test('GET /predictions/:applicationId should return empty array for non-existent app', async (t) => {
  const server = await buildServer(t)
  const nonExistentId = randomUUID()

  const response = await server.inject({
    method: 'GET',
    url: `/predictions/${nonExistentId}`
  })

  assert.strictEqual(response.statusCode, 200)
  const result = JSON.parse(response.body)
  assert.strictEqual(result.applicationId, nonExistentId)
  assert.deepStrictEqual(result.predictions, [])
})

test('removePrediction should remove specific prediction without affecting others', async (t) => {
  const server = await buildServer(t)
  const appId1 = randomUUID()
  const appId2 = randomUUID()

  const predictions = [
    {
      applicationId: appId1,
      timeOfDay: 28800,
      absoluteTime: Date.now() + 3600000,
      action: 'up',
      pods: 3,
      confidence: 0.85,
      reasons: ['First prediction']
    },
    {
      applicationId: appId2,
      timeOfDay: 32400,
      absoluteTime: Date.now() + 7200000,
      action: 'down',
      pods: 1,
      confidence: 0.75,
      reasons: ['Second prediction']
    }
  ]

  await server.store.replaceApplicationPredictions(appId1, [predictions[0]])
  await server.store.replaceApplicationPredictions(appId2, [predictions[1]])

  const beforeRemoval = await server.store.getPredictions()
  assert.strictEqual(beforeRemoval.length, 2)

  await server.store.removePrediction(predictions[0])

  const afterRemoval = await server.store.getPredictions()
  assert.strictEqual(afterRemoval.length, 1)
  assert.strictEqual(afterRemoval[0].applicationId, appId2)
  assert.strictEqual(afterRemoval[0].action, 'down')
})

test('GET /predictions/:applicationId should handle store errors gracefully', async (t) => {
  const server = await buildServer(t)
  const applicationId = randomUUID()

  const originalMethod = server.store.getApplicationPredictions
  server.store.getApplicationPredictions = async () => {
    throw new Error('Store connection failed')
  }

  t.after(() => {
    server.store.getApplicationPredictions = originalMethod
  })

  const response = await server.inject({
    method: 'GET',
    url: `/predictions/${applicationId}`
  })

  assert.strictEqual(response.statusCode, 500)
  const result = JSON.parse(response.body)
  assert.strictEqual(result.message, 'Failed to get application predictions')
})

test('GET /predictions should handle store errors gracefully', async (t) => {
  const server = await buildServer(t)

  const originalGetPredictions = server.store.getPredictions
  server.store.getPredictions = async () => {
    throw new Error('Store connection failed')
  }

  t.after(() => {
    server.store.getPredictions = originalGetPredictions
  })

  const response = await server.inject({
    method: 'GET',
    url: '/predictions'
  })

  assert.strictEqual(response.statusCode, 500)
  const result = JSON.parse(response.body)
  assert.strictEqual(result.message, 'Failed to get all predictions')
})

test('POST /predictions/calculate should handle database query errors', async (t) => {
  const server = await buildServer(t)

  const originalQuery = server.platformatic.db.query
  server.platformatic.db.query = async () => {
    throw new Error('Database connection failed')
  }

  t.after(() => {
    server.platformatic.db.query = originalQuery
  })

  const response = await server.inject({
    method: 'POST',
    url: '/predictions/calculate'
  })

  assert.strictEqual(response.statusCode, 500)
  const result = JSON.parse(response.body)
  assert.strictEqual(result.message, 'Failed to calculate predictions')
})

test('POST /predictions/calculate should handle trends algorithm errors', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()

  await server.platformatic.entities.performanceHistory.save({
    input: {
      applicationId: appId,
      eventTimestamp: new Date(Date.now() - 86400000).toISOString(),
      podsAdded: 1,
      preEluMean: 0.2,
      preHeapMean: 50,
      preEluTrend: 0.005,
      preHeapTrend: 0.5,
      deltaElu: -0.05,
      deltaHeap: -5,
      sigmaElu: 0.01,
      sigmaHeap: 2,
      successScore: 0.7,
      source: 'signal'
    }
  })

  const TrendsLearningAlgorithm = require('../../lib/trends-learning-algorithm')
  const originalRunAnalysis = TrendsLearningAlgorithm.prototype.runAnalysis
  TrendsLearningAlgorithm.prototype.runAnalysis = async () => {
    throw new Error('Trends analysis failed')
  }

  t.after(() => {
    TrendsLearningAlgorithm.prototype.runAnalysis = originalRunAnalysis
  })

  const response = await server.inject({
    method: 'POST',
    url: '/predictions/calculate'
  })

  assert.strictEqual(response.statusCode, 200)
  const result = JSON.parse(response.body)
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.processedApplications, 0)
  assert.strictEqual(result.totalPredictions, 0)
  assert.ok(Array.isArray(result.errors))
  assert.strictEqual(result.errors.length, 1)
  assert.strictEqual(result.errors[0].applicationId, appId)
  assert.strictEqual(result.errors[0].error, 'Trends analysis failed')
})

test('POST /predictions/calculate should handle store errors during prediction saving', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()

  await server.platformatic.entities.performanceHistory.save({
    input: {
      applicationId: appId,
      eventTimestamp: new Date(Date.now() - 86400000).toISOString(),
      podsAdded: 2,
      preEluMean: 0.4,
      preHeapMean: 80,
      preEluTrend: 0.02,
      preHeapTrend: 2,
      deltaElu: -0.2,
      deltaHeap: -20,
      sigmaElu: 0.03,
      sigmaHeap: 8,
      successScore: 0.9,
      source: 'signal'
    }
  })

  const TrendsLearningAlgorithm = require('../../lib/trends-learning-algorithm')
  const originalRunAnalysis = TrendsLearningAlgorithm.prototype.runAnalysis
  TrendsLearningAlgorithm.prototype.runAnalysis = async () => {
    return {
      success: true,
      predictions: [{
        timeOfDay: 28800,
        absoluteTime: Date.now() + 3600000,
        action: 'up',
        pods: 2,
        confidence: 0.8,
        reasons: ['Test prediction']
      }]
    }
  }

  const originalReplace = server.store.replaceApplicationPredictions
  server.store.replaceApplicationPredictions = async () => {
    throw new Error('Store save failed')
  }

  t.after(() => {
    TrendsLearningAlgorithm.prototype.runAnalysis = originalRunAnalysis
    server.store.replaceApplicationPredictions = originalReplace
  })

  const response = await server.inject({
    method: 'POST',
    url: '/predictions/calculate'
  })

  assert.strictEqual(response.statusCode, 200)
  const result = JSON.parse(response.body)
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.processedApplications, 0)
  assert.strictEqual(result.totalPredictions, 0)
  assert.ok(Array.isArray(result.errors))
  assert.strictEqual(result.errors.length, 1)
  assert.strictEqual(result.errors[0].applicationId, appId)
  assert.strictEqual(result.errors[0].error, 'Store save failed')
})

test('POST /predictions/calculate should handle trends algorithm returning empty predictions', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()

  await server.platformatic.entities.performanceHistory.save({
    input: {
      applicationId: appId,
      eventTimestamp: new Date(Date.now() - 86400000).toISOString(),
      podsAdded: 1,
      preEluMean: 0.1,
      preHeapMean: 30,
      preEluTrend: 0.001,
      preHeapTrend: 0.1,
      deltaElu: -0.01,
      deltaHeap: -1,
      sigmaElu: 0.005,
      sigmaHeap: 1,
      successScore: 0.5,
      source: 'signal'
    }
  })

  const TrendsLearningAlgorithm = require('../../lib/trends-learning-algorithm')
  const originalRunAnalysis = TrendsLearningAlgorithm.prototype.runAnalysis
  TrendsLearningAlgorithm.prototype.runAnalysis = async () => {
    return {
      success: true,
      predictions: []
    }
  }

  t.after(() => {
    TrendsLearningAlgorithm.prototype.runAnalysis = originalRunAnalysis
  })

  const response = await server.inject({
    method: 'POST',
    url: '/predictions/calculate'
  })

  assert.strictEqual(response.statusCode, 200)
  const result = JSON.parse(response.body)
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.processedApplications, 0)
  assert.strictEqual(result.totalPredictions, 0)
  assert.deepStrictEqual(result.errors, [])
})

test('POST /predictions/calculate should handle trends algorithm returning null predictions', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()

  await server.platformatic.entities.performanceHistory.save({
    input: {
      applicationId: appId,
      eventTimestamp: new Date(Date.now() - 86400000).toISOString(),
      podsAdded: 1,
      preEluMean: 0.15,
      preHeapMean: 40,
      preEluTrend: 0.002,
      preHeapTrend: 0.2,
      deltaElu: -0.02,
      deltaHeap: -2,
      sigmaElu: 0.007,
      sigmaHeap: 1.5,
      successScore: 0.6,
      source: 'signal'
    }
  })

  const TrendsLearningAlgorithm = require('../../lib/trends-learning-algorithm')
  const originalRunAnalysis = TrendsLearningAlgorithm.prototype.runAnalysis
  TrendsLearningAlgorithm.prototype.runAnalysis = async () => {
    return {
      success: true,
      predictions: null
    }
  }

  t.after(() => {
    TrendsLearningAlgorithm.prototype.runAnalysis = originalRunAnalysis
  })

  const response = await server.inject({
    method: 'POST',
    url: '/predictions/calculate'
  })

  assert.strictEqual(response.statusCode, 200)
  const result = JSON.parse(response.body)
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.processedApplications, 0)
  assert.strictEqual(result.totalPredictions, 0)
  assert.deepStrictEqual(result.errors, [])
})

test('POST /predictions/calculate should successfully process predictions and increment counters', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()

  await server.platformatic.entities.performanceHistory.save({
    input: {
      applicationId: appId,
      eventTimestamp: new Date(Date.now() - 86400000).toISOString(),
      podsAdded: 3,
      preEluMean: 0.5,
      preHeapMean: 120,
      preEluTrend: 0.03,
      preHeapTrend: 3,
      deltaElu: -0.3,
      deltaHeap: -30,
      sigmaElu: 0.04,
      sigmaHeap: 10,
      successScore: 0.95,
      source: 'signal'
    }
  })

  const TrendsLearningAlgorithm = require('../../lib/trends-learning-algorithm')
  const originalRunAnalysis = TrendsLearningAlgorithm.prototype.runAnalysis
  TrendsLearningAlgorithm.prototype.runAnalysis = async () => {
    return {
      success: true,
      predictions: [
        {
          timeOfDay: 28800,
          absoluteTime: Date.now() + 3600000,
          action: 'up',
          pods: 2,
          confidence: 0.85,
          reasons: ['High traffic expected']
        },
        {
          timeOfDay: 32400,
          absoluteTime: Date.now() + 7200000,
          action: 'down',
          pods: 1,
          confidence: 0.75,
          reasons: ['Traffic reduction expected']
        }
      ]
    }
  }

  t.after(() => {
    TrendsLearningAlgorithm.prototype.runAnalysis = originalRunAnalysis
  })

  const response = await server.inject({
    method: 'POST',
    url: '/predictions/calculate'
  })

  assert.strictEqual(response.statusCode, 200)
  const result = JSON.parse(response.body)
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.processedApplications, 1)
  assert.strictEqual(result.totalPredictions, 2)
  assert.deepStrictEqual(result.errors, [])

  const savedPredictions = await server.store.getApplicationPredictions(appId)
  assert.strictEqual(savedPredictions.length, 2)
  assert.strictEqual(savedPredictions[0].applicationId, appId)
  assert.strictEqual(savedPredictions[1].applicationId, appId)
})

test('POST /predictions/calculate should handle mixed results (some success, some errors)', async (t) => {
  const server = await buildServer(t)
  const appId1 = randomUUID()
  const appId2 = randomUUID()

  await server.platformatic.entities.performanceHistory.save({
    input: {
      applicationId: appId1,
      eventTimestamp: new Date(Date.now() - 86400000).toISOString(),
      podsAdded: 2,
      preEluMean: 0.3,
      preHeapMean: 70,
      preEluTrend: 0.01,
      preHeapTrend: 1.5,
      deltaElu: -0.1,
      deltaHeap: -10,
      sigmaElu: 0.02,
      sigmaHeap: 5,
      successScore: 0.8,
      source: 'signal'
    }
  })

  await server.platformatic.entities.performanceHistory.save({
    input: {
      applicationId: appId2,
      eventTimestamp: new Date(Date.now() - 86400000).toISOString(),
      podsAdded: 1,
      preEluMean: 0.4,
      preHeapMean: 90,
      preEluTrend: 0.02,
      preHeapTrend: 2,
      deltaElu: -0.15,
      deltaHeap: -15,
      sigmaElu: 0.025,
      sigmaHeap: 7,
      successScore: 0.85,
      source: 'signal'
    }
  })

  const TrendsLearningAlgorithm = require('../../lib/trends-learning-algorithm')
  const originalRunAnalysis = TrendsLearningAlgorithm.prototype.runAnalysis
  TrendsLearningAlgorithm.prototype.runAnalysis = async (applicationId) => {
    if (applicationId === appId1) {
      return {
        success: true,
        predictions: [{
          timeOfDay: 28800,
          absoluteTime: Date.now() + 3600000,
          action: 'up',
          pods: 2,
          confidence: 0.8,
          reasons: ['Success case']
        }]
      }
    } else {
      throw new Error('Analysis failed for app2')
    }
  }

  t.after(() => {
    TrendsLearningAlgorithm.prototype.runAnalysis = originalRunAnalysis
  })

  const response = await server.inject({
    method: 'POST',
    url: '/predictions/calculate'
  })

  assert.strictEqual(response.statusCode, 200)
  const result = JSON.parse(response.body)
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.processedApplications, 1)
  assert.strictEqual(result.totalPredictions, 1)
  assert.strictEqual(result.errors.length, 1)
  assert.strictEqual(result.errors[0].applicationId, appId2)
  assert.strictEqual(result.errors[0].error, 'Analysis failed for app2')
})

test('POST /predictions/calculate should handle database result format without .rows property', async (t) => {
  const server = await buildServer(t)
  const appId = randomUUID()

  // Mock database query to return result without .rows property (direct array format)
  const originalQuery = server.platformatic.db.query
  server.platformatic.db.query = async () => {
    // Return direct array format instead of { rows: [...] }
    return [{ application_id: appId }]
  }

  // Mock trends algorithm to return empty predictions
  const TrendsLearningAlgorithm = require('../../lib/trends-learning-algorithm')
  const originalRunAnalysis = TrendsLearningAlgorithm.prototype.runAnalysis
  TrendsLearningAlgorithm.prototype.runAnalysis = async () => {
    return {
      success: true,
      predictions: []
    }
  }

  t.after(() => {
    server.platformatic.db.query = originalQuery
    TrendsLearningAlgorithm.prototype.runAnalysis = originalRunAnalysis
  })

  const response = await server.inject({
    method: 'POST',
    url: '/predictions/calculate'
  })

  assert.strictEqual(response.statusCode, 200)
  const result = JSON.parse(response.body)
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.processedApplications, 0)
  assert.strictEqual(result.totalPredictions, 0)
  assert.deepStrictEqual(result.errors, [])
})
