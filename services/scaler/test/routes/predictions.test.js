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
