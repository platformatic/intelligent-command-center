'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { startMetrics, startPrometheus } = require('./helper')

test('pod memory metrics', async (t) => {
  const appId = 'test-application-id'
  const podId = 'pod-id'
  await startPrometheus(t)
  const server = await startMetrics(t)
  const res = await server.inject({
    method: 'GET',
    url: `/apps/${appId}/pods/${podId}/mem`
  })
  assert.equal(res.statusCode, 200)
  const metrics = res.json()

  const expected = {
    rss: 3.721122686,
    totalHeap: 2.721122686,
    usedHeap: 1.721122686,
    podMemoryLimit: 4.721122686
  }
  assert.deepEqual(metrics, expected)
})

test('pod CPU / event loop metrics', async (t) => {
  const appId = 'test-application-id'
  const podId = 'pod-id'
  await startPrometheus(t)
  const server = await startMetrics(t)
  const res = await server.inject({
    method: 'GET',
    url: `/apps/${appId}/pods/${podId}/cpu`
  })
  assert.equal(res.statusCode, 200)
  const metrics = res.json()

  const expected = {
    cpu: 25,
    eventLoop: 46.1803,
    podCores: 2
  }
  assert.deepEqual(metrics, expected)
})
