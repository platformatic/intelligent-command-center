'use strict'

const { buildServer } = require('../helper')
const { test } = require('node:test')
const { once, EventEmitter } = require('events')
const Fastify = require('fastify')
const tspl = require('@matteo.collina/tspl')
const { setTimeout: sleep } = require('node:timers/promises')

test('retries on failure', async (t) => {
  const plan = tspl(t, { plan: 6 })
  const ee = new EventEmitter()
  const server = await buildServer(t, { PLT_CRON_DISABLE_ICC_JOBS: true })

  const target = Fastify()
  let called = 0
  target.post('/', async (req, reply) => {
    plan.deepStrictEqual(req.body, { message: 'HELLO FOLKS!' }, 'message is plan.strictEqual')
    ee.emit('called')
    if (called++ === 0) {
      throw new Error('first call')
    }
    return { ok: true }
  })

  t.after(() => target.close())
  await target.listen({ port: 0 })
  const targetUrl = `http://localhost:${target.server.address().port}`

  let jobId
  {
    const res = await server.inject({
      method: 'POST',
      url: '/graphql',

      payload: {
        query: `
          mutation($callbackUrl: String!) {
            saveJob(input: { name: "test", callbackUrl: $callbackUrl, method: "POST" }) {
              id
            }
          }
        `,
        variables: {
          callbackUrl: targetUrl
        }
      }
    })
    plan.strictEqual(res.statusCode, 200)
    const body = res.json()
    const { data } = body
    jobId = data.saveJob.id
    plan.ok(jobId) // Just verify we got a job ID
  }

  let p = once(ee, 'called')
  {
    const msg = JSON.stringify({
      message: 'HELLO FOLKS!'
    })
    const now = Date.now()
    const query = `
      mutation($body: String!, $jobId: ID, $method: String!) {
        saveMessage(input: { jobId: $jobId, body: $body, method: $method }) {
          id
          when
        }
      }
    `

    const res = await server.inject({
      method: 'POST',
      url: '/graphql',

      payload: {
        query,
        variables: {
          body: msg,
          jobId,
          method: 'POST'
        }
      }
    })
    const body = res.json()
    plan.strictEqual(res.statusCode, 200)

    const { data } = body
    const when = new Date(data.saveMessage.when)
    plan.strictEqual(when.getTime() - now >= 0, true)
  }

  await p
  p = once(ee, 'called')
  await p
})

test('see the message as failed after the retries are done', async (t) => {
  const plan = tspl(t, { plan: 12 })
  const server = await buildServer(t, { PLT_CRON_DISABLE_ICC_JOBS: true })

  const target = Fastify()
  target.post('/', async (req, reply) => {
    plan.deepStrictEqual(req.body, { message: 'HELLO FOLKS!' }, 'message is plan.strictEqual')
    throw new Error('This is down')
  })

  t.after(() => target.close())
  await target.listen({ port: 0 })
  const targetUrl = `http://localhost:${target.server.address().port}`

  let jobId
  {
    const res = await server.inject({
      method: 'POST',
      url: '/graphql',

      payload: {
        query: `
          mutation($callbackUrl: String!, $method: String!) {
            saveJob(input: { name: "test", callbackUrl: $callbackUrl, method: $method, maxRetries: 2 }) {
              id
            }
          }
        `,
        variables: {
          callbackUrl: targetUrl,
          method: 'POST'
        }
      }
    })
    plan.strictEqual(res.statusCode, 200)
    const body = res.json()
    const { data } = body
    jobId = data.saveJob.id
  }

  {
    const msg = JSON.stringify({
      message: 'HELLO FOLKS!'
    })
    const now = Date.now()
    const query = `
      mutation($body: String!, $jobId: ID, $method: String!) {
        saveMessage(input: { jobId: $jobId, body: $body, method: $method }) {
          id
          when
        }
      }
    `

    const res = await server.inject({
      method: 'POST',
      url: '/graphql',

      payload: {
        query,
        variables: {
          body: msg,
          jobId,
          method: 'POST'
        }
      }
    })
    const body = res.json()
    plan.strictEqual(res.statusCode, 200)

    const { data } = body
    const when = new Date(data.saveMessage.when)
    plan.strictEqual(when.getTime() - now >= 0, true)
  }

  // We wait for the retries to be done
  await sleep(800)

  const messages = await server.platformatic.entities.message.find({ where: { jobId: { eq: jobId } } })
  plan.strictEqual(messages.length, 1)
  const message = messages[0]
  plan.strictEqual(message.jobId, Number(jobId))
  plan.strictEqual(message.retries, 2)
  plan.strictEqual(message.failed, true)

  const jobs = await server.platformatic.entities.job.find({
    where: {
      id: {
        eq: jobId
      }
    }
  })
  const job = jobs[0]
  plan.deepEqual(job.status, 'failed')
  plan.deepEqual(job.lastRunAt, message.sentAt)
})
