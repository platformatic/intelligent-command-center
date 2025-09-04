'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { randomUUID } = require('crypto')
const fastify = require('fastify')
const { buildServer, cleanValkeyData } = require('../helper')

async function createMockPrometheus (podId) {
  const server = fastify({ keepAliveTimeout: 1 })

  server.get('/api/v1/query_range', async (request, reply) => {
    const { query } = request.query

    if (query.includes('nodejs_eventloop_utilization') && query.includes(`instanceId="${podId}"`)) {
      return {
        status: 'success',
        data: {
          result: [{
            metric: { podId },
            values: [
              [1704110340, '0.85'],
              [1704110350, '0.87'],
              [1704110360, '0.89'],
              [1704110370, '0.91'],
              [1704110380, '0.93'],
              [1704110390, '0.95'],
              [1704110400, '0.97']
            ]
          }]
        }
      }
    } else if (query.includes('nodejs_heap_size_used_bytes') && query.includes(`instanceId="${podId}"`)) {
      return {
        status: 'success',
        data: {
          result: [{
            metric: { podId },
            values: [
              [1704110340, '104857600'],
              [1704110350, '110100480'],
              [1704110360, '115343360'],
              [1704110370, '120586240'],
              [1704110380, '125829120'],
              [1704110390, '131072000'],
              [1704110400, '136314880']
            ]
          }]
        }
      }
    } else if (query.includes('nodejs_heap_size_total_bytes') && query.includes(`instanceId="${podId}"`)) {
      return {
        status: 'success',
        data: {
          result: [{
            metric: { podId },
            values: [
              [1704110340, '157286400'],
              [1704110350, '157286400'],
              [1704110360, '157286400'],
              [1704110370, '167772160'],
              [1704110380, '167772160'],
              [1704110390, '167772160'],
              [1704110400, '178257920']
            ]
          }]
        }
      }
    }

    return reply.status(404).send({ status: 'error', error: 'No data found for query' })
  })

  const address = await server.listen({ port: 0 })
  return { server, address }
}

test('GET /scale-events/:scaleEventId/metrics - should return metrics for scale event', async (t) => {
  await cleanValkeyData()

  const applicationId = randomUUID()
  const scaleEventId = randomUUID()
  const alertId = randomUUID()
  const podId = 'test-pod-123'
  const alertTime = new Date('2024-01-01T12:00:00Z')

  // Create and start mock Prometheus
  const mockPrometheus = await createMockPrometheus(podId)
  process.env.PLT_METRICS_PROMETHEUS_URL = mockPrometheus.address

  t.after(async () => {
    await mockPrometheus.server.close()
    await cleanValkeyData()
  })

  const server = await buildServer(t)

  // Create scale event
  await server.platformatic.entities.scaleEvent.save({
    input: {
      id: scaleEventId,
      applicationId,
      direction: 'up',
      replicas: 3,
      replicasDiff: 1,
      reason: 'High ELU detected',
      createdAt: alertTime
    }
  })

  // Create alert associated with scale event
  await server.platformatic.entities.alert.save({
    input: {
      id: alertId,
      applicationId,
      serviceId: 'test-service',
      podId,
      elu: 0.95,
      heapUsed: 136314880,
      heapTotal: 178257920,
      unhealthy: true,
      scaleEventId,
      createdAt: alertTime
    }
  })

  // Test the endpoint
  const res = await server.inject({
    method: 'GET',
    url: `/scale-events/${scaleEventId}/metrics`
  })

  assert.strictEqual(res.statusCode, 200)

  const body = res.json()
  assert.strictEqual(body.scaleEventId, scaleEventId)
  assert.strictEqual(body.applicationId, applicationId)
  assert.strictEqual(body.podId, podId)
  assert.ok(body.metrics)
  assert.ok(Array.isArray(body.metrics.elu))
  assert.ok(Array.isArray(body.metrics.heapUsed))
  assert.ok(Array.isArray(body.metrics.heapTotal))

  // Verify ELU data
  assert.strictEqual(body.metrics.elu.length, 7)
  assert.strictEqual(body.metrics.elu[0].value, 0.85)
  assert.strictEqual(body.metrics.elu[6].value, 0.97)

  // Verify heap data
  assert.strictEqual(body.metrics.heapUsed.length, 7)
  assert.strictEqual(body.metrics.heapTotal.length, 7)
})

test('GET /scale-events/:scaleEventId/metrics - should return 404 if scale event not found', async (t) => {
  await cleanValkeyData()
  const server = await buildServer(t)
  const nonExistentId = randomUUID()

  t.after(async () => {
    await cleanValkeyData()
  })

  const res = await server.inject({
    method: 'GET',
    url: `/scale-events/${nonExistentId}/metrics`
  })

  assert.strictEqual(res.statusCode, 404)
  const body = res.json()
  assert.strictEqual(body.message, 'Scale event not found')
})

test('GET /scale-events/:scaleEventId/metrics - should return 404 if no alerts found', async (t) => {
  await cleanValkeyData()
  const server = await buildServer(t)
  const scaleEventId = randomUUID()
  const applicationId = randomUUID()

  t.after(async () => {
    await cleanValkeyData()
  })

  // Create scale event without alerts
  await server.platformatic.entities.scaleEvent.save({
    input: {
      id: scaleEventId,
      applicationId,
      direction: 'up',
      replicas: 3,
      replicasDiff: 1,
      reason: 'Manual scaling'
    }
  })

  const res = await server.inject({
    method: 'GET',
    url: `/scale-events/${scaleEventId}/metrics`
  })

  assert.strictEqual(res.statusCode, 404)
  const body = res.json()
  assert.strictEqual(body.message, 'No alerts found for this scale event')
})

test('GET /scale-events/:scaleEventId/metrics - should return 503 if Prometheus not configured', async (t) => {
  await cleanValkeyData()
  process.env.PLT_METRICS_PROMETHEUS_URL = ''
  const server = await buildServer(t)

  const scaleEventId = randomUUID()
  const applicationId = randomUUID()
  const alertId = randomUUID()

  t.after(async () => {
    await cleanValkeyData()
  })

  // Create scale event
  await server.platformatic.entities.scaleEvent.save({
    input: {
      id: scaleEventId,
      applicationId,
      direction: 'up',
      replicas: 3,
      replicasDiff: 1,
      reason: 'High ELU'
    }
  })

  // Create alert
  await server.platformatic.entities.alert.save({
    input: {
      id: alertId,
      applicationId,
      serviceId: 'test-service',
      podId: 'test-pod',
      elu: 0.95,
      heapUsed: 100000000,
      heapTotal: 150000000,
      unhealthy: true,
      scaleEventId
    }
  })

  const res = await server.inject({
    method: 'GET',
    url: `/scale-events/${scaleEventId}/metrics`
  })

  assert.strictEqual(res.statusCode, 503)
  const body = res.json()
  assert.ok(body.message.includes('Prometheus URL not configured') || body.message.includes('Metrics service not available'))
})
