'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { randomUUID } = require('node:crypto')
const { buildServer } = require('../helper')

test('GET /predictions/:applicationId should return prediction analysis', async (t) => {
  const server = await buildServer(t)
  const applicationId = randomUUID()

  const response = await server.inject({
    method: 'GET',
    url: `/predictions/${applicationId}`
  })

  assert.strictEqual(response.statusCode, 200)

  const result = JSON.parse(response.body)
  assert.strictEqual(typeof result.success, 'boolean')
  assert.ok(Array.isArray(result.predictions))
  assert.strictEqual(typeof result.analysisTime, 'number')

  assert.strictEqual(result.success, true)
  assert.strictEqual(result.predictions.length, 0)
})

test('GET /predictions/:applicationId/current should return current prediction', async (t) => {
  const server = await buildServer(t)
  const applicationId = randomUUID()

  const response = await server.inject({
    method: 'GET',
    url: `/predictions/${applicationId}/current`
  })

  assert.strictEqual(response.statusCode, 200)

  const result = JSON.parse(response.body)
  assert.strictEqual(result.applicationId, applicationId)
  assert.strictEqual(typeof result.requestedTime, 'number')
  assert.ok(result.prediction === null || typeof result.prediction === 'object')
})

test('GET /predictions/:applicationId/current with custom time should use provided timestamp', async (t) => {
  const server = await buildServer(t)
  const applicationId = randomUUID()
  const customTime = Date.now() + 3600000 // 1 hour from now

  const response = await server.inject({
    method: 'GET',
    url: `/predictions/${applicationId}/current?time=${customTime}`
  })

  assert.strictEqual(response.statusCode, 200)

  const result = JSON.parse(response.body)
  assert.strictEqual(result.requestedTime, customTime)
  assert.strictEqual(result.applicationId, applicationId)
})

test('GET /predictions/:applicationId/summary should return prediction summary', async (t) => {
  const server = await buildServer(t)
  const applicationId = randomUUID()

  const response = await server.inject({
    method: 'GET',
    url: `/predictions/${applicationId}/summary`
  })

  assert.strictEqual(response.statusCode, 200)

  const result = JSON.parse(response.body)
  assert.strictEqual(typeof result.success, 'boolean')
  assert.strictEqual(result.applicationId, applicationId)
  assert.strictEqual(typeof result.totalPredictions, 'number')
  assert.strictEqual(typeof result.highConfidencePredictions, 'number')
  assert.strictEqual(typeof result.averageConfidence, 'number')
  assert.strictEqual(typeof result.totalPodsToAdd, 'number')
  assert.strictEqual(typeof result.analysisTime, 'number')
  assert.ok(result.nextPrediction === null || typeof result.nextPrediction === 'object')

  assert.strictEqual(result.success, true)
  assert.strictEqual(result.totalPredictions, 0)
  assert.strictEqual(result.highConfidencePredictions, 0)
  assert.strictEqual(result.averageConfidence, 0)
  assert.strictEqual(result.totalPodsToAdd, 0)
  assert.strictEqual(result.nextPrediction, null)
})

test('prediction routes should handle invalid application IDs gracefully', async (t) => {
  const server = await buildServer(t)

  const nonExistentId = randomUUID()
  const response = await server.inject({
    method: 'GET',
    url: `/predictions/${nonExistentId}`
  })

  assert.strictEqual(response.statusCode, 200)
  const result = JSON.parse(response.body)
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.predictions.length, 0)
})
