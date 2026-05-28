'use strict'

const { buildServer } = require('../helper')
const { test } = require('node:test')
const { once, EventEmitter } = require('events')
const tspl = require('@matteo.collina/tspl')
const Fastify = require('fastify')

// In v3, only the Runtime binds the Prometheus HTTP endpoint; standalone
// capabilities just register metrics on globalThis.platformatic.prometheus.
// Read the prom registry off globalThis instead of querying HTTP.
async function readMetrics () {
  const reg = globalThis.platformatic?.prometheus?.registry
  if (!reg) throw new Error('prometheus registry not initialized')
  return reg.metrics()
}

// Poll the registry until a counter reaches `target`. Used to bridge the
// race between target.post's `ee.emit('called')` (which the test awaits)
// and the executor's downstream increment of the same counter (which only
// runs after makeCallback's HTTP response resolves).
async function waitForMetric (name, target, { timeout = 5000 } = {}) {
  const reg = globalThis.platformatic?.prometheus?.registry
  if (!reg) throw new Error('prometheus registry not initialized')
  const metric = reg.getSingleMetric(name)
  if (!metric) throw new Error(`metric ${name} not registered`)
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const { values } = await metric.get()
    const total = values.reduce((acc, v) => acc + v.value, 0)
    if (total >= target) return
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error(`metric ${name} did not reach ${target} within ${timeout}ms`)
}

test('happy path', async (t) => {
  const plan = tspl(t, { plan: 10 })
  const ee = new EventEmitter()

  const server = await buildServer(t)

  const target = Fastify()
  target.post('/', async (req, _reply) => {
    plan.deepStrictEqual(req.body, { message: 'HELLO FOLKS!' }, 'message is plan.strictEqual')
    ee.emit('called')
    return { ok: true }
  })

  t.after(() => target.close())
  await target.listen({ port: 0 })
  const targetUrl = `http://localhost:${target.server.address().port}`

  const msg = JSON.stringify({
    message: 'HELLO FOLKS!'
  })

  const schedule = '*/1 * * * * *'

  await server.inject({
    method: 'POST',
    url: '/graphql',
    payload: {
      query: `
          mutation($body: String!, $callbackUrl: String!, $schedule: String!) {
            saveJob(input: { name: "test", callbackUrl: $callbackUrl, method: "POST",  headers: "{ \\"content-type\\": \\"application/json\\" }", body: $body, schedule: $schedule  }) {
              id
            }
          }
        `,
      variables: {
        body: msg,
        callbackUrl: targetUrl,
        schedule
      }
    }
  })

  const p1 = once(ee, 'called')
  await p1

  const p2 = once(ee, 'called')
  await p2

  // Bridge the race between target.post's ee.emit and the executor's
  // messagesSent.inc() — the inc only runs after `await makeCallback`
  // resolves on the response, which is later than the emit.
  await waitForMetric('icc_jobs_messages_sent', 1)

  const metrics = await readMetrics()

  const metricsNames = metrics
    .split('\n')
    .filter(line => line && line.startsWith('# TYPE'))
    .map(line => line.split(' ')[2])

  const expectedMetricNames = [
    'icc_jobs_messages_sent',
    'icc_jobs_messages_failed',
    'icc_jobs_messages_retries',
    'icc_jobs_messages_execution_time_sum'
  ]
  for (const metricName of expectedMetricNames) {
    plan.ok(metricsNames.includes(metricName), `Expected metric ${metricName} to be present`)
  }

  const jobsMessagesSentMetrics = metrics.split('\n').filter(line => line && line.startsWith('icc_jobs_messages_sent'))
  const jobsMessagesFailedMetrics = metrics.split('\n').filter(line => line && line.startsWith('icc_jobs_messages_failed'))
  const jobsMessagesRetriesMetrics = metrics.split('\n').filter(line => line && line.startsWith('icc_jobs_messages_retries'))
  const jobsMessagesExecutionTimeMetrics = metrics.split('\n').filter(line => line && line.startsWith('icc_jobs_messages_execution_time_sum'))

  plan.equal(jobsMessagesSentMetrics.length, 1)
  plan.equal(jobsMessagesFailedMetrics.length, 0)
  plan.equal(jobsMessagesRetriesMetrics.length, 0)
  const executionTime = Number(jobsMessagesExecutionTimeMetrics[0].split(' ')[1])
  plan.ok(executionTime > 0, `Expected execution time to be greater than 0, got ${executionTime}`)
})

test('message failures', async (t) => {
  const plan = tspl(t, { plan: 10 })
  const ee = new EventEmitter()

  const server = await buildServer(t)

  const target = Fastify()
  target.post('/', async (req, _reply) => {
    plan.deepStrictEqual(req.body, { message: 'HELLO FOLKS!' }, 'message is plan.strictEqual')
    ee.emit('called')
    throw new Error('BOOM')
  })

  t.after(() => target.close())
  await target.listen({ port: 0 })
  const targetUrl = `http://localhost:${target.server.address().port}`

  const msg = JSON.stringify({
    message: 'HELLO FOLKS!'
  })

  const schedule = '*/1 * * * * *'

  await server.inject({
    method: 'POST',
    url: '/graphql',
    payload: {
      query: `
          mutation($body: String!, $callbackUrl: String!, $schedule: String!) {
            saveJob(input: { name: "test", callbackUrl: $callbackUrl, method: "POST",  headers: "{ \\"content-type\\": \\"application/json\\" }", body: $body, schedule: $schedule  }) {
              id
            }
          }
        `,
      variables: {
        body: msg,
        callbackUrl: targetUrl,
        schedule
      }
    }
  })

  // The 5 retries
  for (let i = 0; i < 5; i++) {
    const p1 = once(ee, 'called')
    await p1
  }

  // The executor's `messagesFailed.inc()` happens AFTER target.post emits
  // (await makeCallback resolves only when the HTTP 500 response lands).
  // Wait for the counter to actually catch up before reading metrics.
  await waitForMetric('icc_jobs_messages_failed', 5)

  const metrics = await readMetrics()

  const jobsMessagesSentMetrics = metrics.split('\n').filter(line => line && line.startsWith('icc_jobs_messages_sent'))
  const jobsMessagesFailedMetrics = metrics.split('\n').filter(line => line && line.startsWith('icc_jobs_messages_failed'))
  const jobsMessagesRetriesMetrics = metrics.split('\n').filter(line => line && line.startsWith('icc_jobs_messages_retries'))

  plan.equal(jobsMessagesSentMetrics.length, 0)
  plan.equal(jobsMessagesFailedMetrics.length, 1)
  plan.equal(jobsMessagesRetriesMetrics.length, 1)
  const failedMessages = Number(jobsMessagesFailedMetrics[0].split(' ')[1])
  const retries = Number(jobsMessagesRetriesMetrics[0].split(' ')[1])
  plan.ok(failedMessages >= 5)
  plan.ok(retries >= 4)
})
