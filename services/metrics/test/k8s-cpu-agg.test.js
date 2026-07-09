'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const fastify = require('fastify')
const formBody = require('@fastify/formbody')
const { startMetrics } = require('./helper')

const TS = 1721122686.143
const APP = 'app-1'

// The per-app CPU queries return one series per pod. This mock returns TWO pods
// for the app so we can assert getAppCPUMetrics sums them (previously it read
// result[0] and reported only the first pod).
async function startPrometheusCpuPods (t) {
  const prometheus = fastify({ keepAliveTimeout: 1 })
  prometheus.register(formBody)
  t.after(() => prometheus.close())

  prometheus.post('/api/v1/query', async (req) => {
    const { query } = req.body
    let result = [{ metric: {}, value: [TS, 0] }]
    if (query.includes('container_cpu_usage_seconds_total')) {
      // `!=` must be checked first: `="app-1"` is a substring of `!="app-1"`.
      if (query.includes(`label_platformatic_dev_application_id!="${APP}"`)) {
        result = [{ metric: { pod: 'other-1' }, value: [TS, 10] }]
      } else if (query.includes(`label_platformatic_dev_application_id="${APP}"`)) {
        result = [
          { metric: { pod: 'app-pod-1' }, value: [TS, 30] },
          { metric: { pod: 'app-pod-2' }, value: [TS, 45] }
        ]
      } else {
        result = [{ metric: { pod: 'any-1' }, value: [TS, 50] }]
      }
    }
    return { status: 'success', data: { resultType: 'vector', result } }
  })

  await prometheus.listen({ port: 4005 })
  return prometheus
}

test('k8s app CPU sums every pod (not just result[0])', async (t) => {
  await startPrometheusCpuPods(t)
  const server = await startMetrics(t)

  const res = await server.inject({ method: 'GET', url: `/kubernetes/apps/${APP}` })
  assert.strictEqual(res.statusCode, 200)
  const { cpu } = res.json()

  // Two app pods at 30 and 45 -> 75, not 30 (the old result[0]).
  assert.strictEqual(cpu.cpuAppUsage, 75)
  assert.strictEqual(cpu.cpuAllAppsUsage, 50)
  assert.strictEqual(cpu.cpuAllAppsUsageButApp, 10)
})
