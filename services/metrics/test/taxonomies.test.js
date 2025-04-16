'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { startMetrics, startPrometheus, getControlPlane } = require('./helper')

test('application memory metrics', async (t) => {
  const appId = 'test-application-id'
  await startPrometheus(t)
  const server = await startMetrics(t)
  const res = await server.inject({
    method: 'GET',
    url: `/apps/${appId}/mem`
  })
  assert.equal(res.statusCode, 200)
  const metrics = res.json()

  const expected =
      [
        {
          date: '2024-07-16T09:38:06.143Z',
          rss: 2.721122686,
          totalHeap: 1.721122686,
          usedHeap: 3.721122686
        },
        {
          date: '2024-07-16T09:54:46.143Z',
          rss: 2.721122686,
          totalHeap: 1.721122686,
          usedHeap: 3.721122686
        },
        {
          date: '2024-07-16T10:11:26.143Z',
          rss: 2.721122686,
          totalHeap: 1.721122686,
          usedHeap: 3.721122686
        }
      ]
  assert.deepEqual(metrics, expected)
})

test('application CPU / event loop metrics', async (t) => {
  const appId = 'test-application-id'
  await startPrometheus(t)
  const server = await startMetrics(t)
  const res = await server.inject({
    method: 'GET',
    url: `/apps/${appId}/cpu`
  })
  assert.equal(res.statusCode, 200)
  const metrics = res.json()

  const expected = [
    {
      cpu: 2.71828,
      date: '2024-07-16T09:38:06.143Z',
      eventLoop: 46.1803
    },
    {
      cpu: 2.71828,
      date: '2024-07-16T09:54:46.143Z',
      eventLoop: 46.1803
    },
    {
      cpu: 2.71828,
      date: '2024-07-16T10:11:26.143Z',
      eventLoop: 46.1803
    }
  ]
  assert.deepEqual(metrics, expected)
})

test('application latency metrics', async (t) => {
  const appId = 'test-application-id'
  const controlPlane = getControlPlane()

  await startPrometheus(t)
  const server = await startMetrics(t, controlPlane)
  const res = await server.inject({
    method: 'GET',
    url: `/apps/${appId}/latency`
  })
  assert.equal(res.statusCode, 200)
  const metrics = res.json()

  const expected = [
    {
      date: '2024-07-16T09:38:06.143Z',
      p90: 222,
      p95: 333,
      p99: 444
    },
    {
      date: '2024-07-16T09:54:46.143Z',
      p90: 222,
      p95: 333,
      p99: 444
    },
    {
      date: '2024-07-16T10:11:26.143Z',
      p90: 222,
      p95: 333,
      p99: 444
    }
  ]
  assert.deepEqual(metrics, expected)
})

test('pod chart metrics', async (t) => {
  const appId = 'test-application-id'
  const podId = 'test-pod-id'
  const controlPlane = getControlPlane()

  await startPrometheus(t)
  const server = await startMetrics(t, controlPlane)
  const res = await server.inject({
    method: 'GET',
    url: `/apps/${appId}/pods/${podId}`
  })
  assert.equal(res.statusCode, 200)
  const metrics = res.json()
  const expected = [
    {
      date: '2024-07-16T09:38:06.143Z',
      cpu: 2.71828,
      elu: 0.461803,
      rss: 2721122686,
      usedHeapSize: 3721122686,
      totalHeapSize: 1721122686,
      newSpaceSize: 0,
      oldSpaceSize: 0,
      latencies: {
        p50: 0,
        p90: 222,
        p95: 333,
        p99: 444
      }
    },
    {
      date: '2024-07-16T09:54:46.143Z',
      cpu: 2.71828,
      elu: 0.461803,
      rss: 2721122686,
      usedHeapSize: 3721122686,
      totalHeapSize: 1721122686,
      newSpaceSize: 0,
      oldSpaceSize: 0,
      latencies: {
        p50: 0,
        p90: 222,
        p95: 333,
        p99: 444
      }
    },
    {
      date: '2024-07-16T10:11:26.143Z',
      cpu: 2.71828,
      elu: 0.461803,
      rss: 2721122686,
      usedHeapSize: 3721122686,
      totalHeapSize: 1721122686,
      newSpaceSize: 0,
      oldSpaceSize: 0,
      latencies: {
        p50: 0,
        p90: 222,
        p95: 333,
        p99: 444
      }
    }
  ]
  assert.deepEqual(metrics, expected)
})

test('pod service chart metrics', async (t) => {
  const appId = 'test-application-id'
  const podId = 'test-pod-id'
  const serviceId = 'test-service-id'
  const controlPlane = getControlPlane()

  await startPrometheus(t)
  const server = await startMetrics(t, controlPlane)
  const res = await server.inject({
    method: 'GET',
    url: `/apps/${appId}/pods/${podId}/services/${serviceId}`
  })
  assert.equal(res.statusCode, 200)
  const metrics = res.json()
  const expected = [
    {
      date: '2024-07-16T09:38:06.143Z',
      cpu: 3.71828,
      elu: 0.461803,
      rss: 2721122686,
      usedHeapSize: 3721122686,
      totalHeapSize: 1721122686,
      newSpaceSize: 0,
      oldSpaceSize: 0,
      latencies: {
        p50: 0,
        p90: 222,
        p95: 333,
        p99: 444
      }
    },
    {
      date: '2024-07-16T09:54:46.143Z',
      cpu: 3.71828,
      elu: 0.461803,
      rss: 2721122686,
      usedHeapSize: 3721122686,
      totalHeapSize: 1721122686,
      newSpaceSize: 0,
      oldSpaceSize: 0,
      latencies: {
        p50: 0,
        p90: 222,
        p95: 333,
        p99: 444
      }
    },
    {
      date: '2024-07-16T10:11:26.143Z',
      cpu: 3.71828,
      elu: 0.461803,
      rss: 2721122686,
      usedHeapSize: 3721122686,
      totalHeapSize: 1721122686,
      newSpaceSize: 0,
      oldSpaceSize: 0,
      latencies: {
        p50: 0,
        p90: 222,
        p95: 333,
        p99: 444
      }
    }
  ]
  assert.deepEqual(metrics, expected)
})
