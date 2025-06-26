'use strict'

const { buildServer } = require('../helper')
const { test } = require('node:test')
const { once, EventEmitter } = require('events')
const tspl = require('@matteo.collina/tspl')
const Fastify = require('fastify')

test('happy path', async (t) => {
  const plan = tspl(t, { plan: 12 })
  const ee = new EventEmitter()

  const server = await buildServer(t, { PLT_CRON_DISABLE_ICC_JOBS: true })

  const target = Fastify()
  target.post('/', async (req, reply) => {
    plan.deepStrictEqual(req.body, { message: 'HELLO FOLKS!' }, 'message is plan.strictEqual')
    ee.emit('called')
    return { ok: true }
  })

  t.after(() => target.close())
  await target.listen({ port: 0 })
  const targetUrl = `http://localhost:${target.server.address().port}`

  let jobId
  const msg = JSON.stringify({
    message: 'HELLO FOLKS!'
  })

  const schedule = '*/1 * * * * *'

  {
    const res = await server.inject({
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
    // plan.strictEqual(res.statusCode, 200)
    const body = res.json()
    const { data } = body
    jobId = data.saveJob.id

    plan.strictEqual(jobId, '1')
  }

  const p1 = once(ee, 'called')

  await p1

  const p2 = once(ee, 'called')
  await p2

  // We must have one sent and one scheduled message
  const messages = await server.platformatic.entities.message.find()
  plan.equal(messages.length, 2)
  const sentMessage = messages.filter((m) => m.sentAt !== null)[0]
  const unsentMessage = messages.filter((m) => m.sentAt === null)[0]
  plan.strictEqual(sentMessage.jobId, Number(jobId))
  plan.strictEqual(unsentMessage.jobId, Number(jobId))

  plan.deepEqual(sentMessage.headers, { 'content-type': 'application/json' })
  plan.deepEqual(sentMessage.responseBody, '{"ok":true}')
  plan.deepEqual(sentMessage.responseStatusCode, 200)

  const jobs = await server.platformatic.entities.job.find({
    where: {
      id: {
        eq: jobId
      }
    }
  })
  const job = jobs[0]
  plan.deepEqual(job.status, 'success')
  plan.deepEqual(job.lastRunAt, sentMessage.sentAt)
  plan.ok(job.nextRunAt - job.lastRunAt > 0)
})

test('invalid cron expression', async (t) => {
  const plan = tspl(t, { plan: 2 })
  const server = await buildServer(t, { PLT_CRON_DISABLE_ICC_JOBS: true })

  const targetUrl = 'http://localhost:4242'
  const schedule = 'hello world'
  const msg = JSON.stringify({
    message: 'HELLO FOLKS!'
  })

  {
    const res = await server.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `
          mutation($callbackUrl: String!, $method: String!, $schedule: String!,  $body: String!) {
            saveJob(input: { name: "test", callbackUrl: $callbackUrl, method: $method, schedule: $schedule, body: $body }) {
              id
            }
          }
        `,
        variables: {
          callbackUrl: targetUrl,
          method: 'POST',
          schedule,
          body: msg
        }
      }
    })
    const body = res.json()
    plan.strictEqual(res.statusCode, 200)
    plan.deepStrictEqual(body.errors[0].message, 'Invalid cron expression')
  }
})
