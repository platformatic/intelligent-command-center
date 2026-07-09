'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const fastify = require('fastify')
const formBody = require('@fastify/formbody')
const { startMetrics } = require('./helper')

// CPU (cAdvisor rate[1m] + kube-state-metrics) and ELU (the app's own gauge)
// are scraped from different targets, so at cold start their range results have
// different timestamp sets: ELU is present from boot while CPU lags ~1m. This
// mock reproduces that skew -- ELU returns all three buckets, CPU only the last
// two -- so we can assert getCpuEventMetrics merges on the timestamp (not the
// array index) and renders whenever EITHER series has a value.
const TS1 = 1721122686.143
const TS2 = 1721123686.143
const TS3 = 1721124686.143

async function startPrometheusCpuElu (t, { cpuValues, eluValues }) {
  const prometheus = fastify({ keepAliveTimeout: 1 })
  prometheus.register(formBody)
  t.after(() => prometheus.close())

  prometheus.post('/api/v1/query_range', async (req) => {
    const { query } = req.body
    let values = []
    if (query.includes('container_cpu_usage_seconds_total')) {
      values = cpuValues
    } else if (query.includes('nodejs_eventloop_utilization')) {
      values = eluValues
    }
    const result = values.length ? [{ metric: {}, values }] : []
    return { status: 'success', data: { resultType: 'matrix', result } }
  })

  await prometheus.listen({ port: 4005 })
  return prometheus
}

test('cpu metrics: ELU-only buckets are kept with cpu=null (no "No Data" during CPU cold start)', async (t) => {
  await startPrometheusCpuElu(t, {
    // CPU misses the first bucket (rate[1m] has no history yet).
    cpuValues: [[TS2, 40], [TS3, 55]],
    // ELU is present from boot for all three buckets (raw [0,1] fraction).
    eluValues: [[TS1, 0.1], [TS2, 0.2], [TS3, 0.3]]
  })
  const server = await startMetrics(t)

  const res = await server.inject({ method: 'GET', url: '/apps/test-application-id/cpu' })
  assert.strictEqual(res.statusCode, 200)
  const data = res.json()

  // Union of timestamps -> three rows, not gated on the shorter CPU series.
  assert.strictEqual(data.length, 3)

  // First bucket: CPU missing -> null (a gap), ELU aligned to its own timestamp.
  assert.strictEqual(data[0].cpu, null)
  assert.strictEqual(data[0].eventLoop, 10) // 0.1 * 100

  // Overlapping buckets: both metrics present and aligned by timestamp.
  assert.strictEqual(data[1].cpu, 40)
  assert.strictEqual(data[1].eventLoop, 20)
  assert.strictEqual(data[2].cpu, 55)
  assert.strictEqual(data[2].eventLoop, 30)
})

test('cpu metrics: renders on ELU alone when CPU has no data at all', async (t) => {
  await startPrometheusCpuElu(t, {
    cpuValues: [],
    eluValues: [[TS1, 0.1], [TS2, 0.2], [TS3, 0.3]]
  })
  const server = await startMetrics(t)

  const res = await server.inject({ method: 'GET', url: '/apps/test-application-id/cpu' })
  assert.strictEqual(res.statusCode, 200)
  const data = res.json()

  assert.strictEqual(data.length, 3)
  for (const point of data) {
    assert.strictEqual(point.cpu, null)
  }
  assert.deepStrictEqual(data.map(p => p.eventLoop), [10, 20, 30])
})
