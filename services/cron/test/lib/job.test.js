'use strict'

const { buildServer } = require('../helper')
const { test } = require('node:test')
const { once, EventEmitter } = require('events')
const tspl = require('@matteo.collina/tspl')
const Fastify = require('fastify')

test('happy path', async (t) => {
  const plan = tspl(t, { plan: 5 })
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
    plan.strictEqual(jobId, '1')
  }

  const p = once(ee, 'called')
  {
    const msg = JSON.stringify({
      message: 'HELLO FOLKS!'
    })
    const now = Date.now()
    const query = `
      mutation($body: String!, $jobId: ID) {
        saveMessage(input: { jobId: $jobId, headers: "{ \\"content-type\\": \\"application/json\\" }", body: $body  }) {
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
          jobId
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
})

test('`text plain` content type', async (t) => {
  const plan = tspl(t, { plan: 5 })
  const ee = new EventEmitter()
  const server = await buildServer(t, { PLT_CRON_DISABLE_ICC_JOBS: true })

  const target = Fastify()
  target.post('/', async (req, reply) => {
    plan.deepStrictEqual(req.body, 'HELLO FOLKS!', 'message is plan.strictEqual')
    ee.emit('called')
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
    plan.strictEqual(jobId, '1')
  }

  const p = once(ee, 'called')
  {
    const msg = 'HELLO FOLKS!'
    const now = Date.now()
    const res = await server.inject({
      method: 'POST',
      url: '/graphql',

      payload: {
        query: `
          mutation($body: String!, $jobId: ID) {
            saveMessage(input: { jobId: $jobId, body: $body, headers: "{ \\"content-type\\": \\"text/plain\\" }" } ) {
              id
              when
            }
          }
        `,
        variables: {
          body: msg,
          jobId
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
})

test('future when', async (t) => {
  const plan = tspl(t, { plan: 6 })

  const ee = new EventEmitter()

  const server = await buildServer(t, { PLT_CRON_DISABLE_ICC_JOBS: true })

  const target = Fastify()
  target.post('/', async (req, reply) => {
    plan.deepStrictEqual(req.body, { message: 'HELLO FOLKS!' }, 'message is plan.strictEqual')
    ee.emit('called', Date.now())
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
    plan.strictEqual(jobId, '1')
  }

  const p = once(ee, 'called')
  const now = Date.now()

  {
    const msg = JSON.stringify({
      message: 'HELLO FOLKS!'
    })
    const afterOneSecond = new Date(now + 1000).toISOString()
    const query = `
      mutation($body: String!, $jobId: ID, $when: DateTime!) {
        saveMessage(input: { jobId: $jobId, body: $body, when: $when  }) {
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
          callbackUrl: targetUrl,
          when: afterOneSecond
        }
      }
    })
    const body = res.json()
    plan.strictEqual(res.statusCode, 200)

    const { data } = body
    plan.strictEqual(data.saveMessage.when, afterOneSecond)
  }

  const [calledAt] = await p
  plan.strictEqual(calledAt - now >= 1000, true)
})

test('`text plain` content type header in the job', async (t) => {
  const plan = tspl(t, { plan: 5 })
  const ee = new EventEmitter()

  const server = await buildServer(t, { PLT_CRON_DISABLE_ICC_JOBS: true })

  const target = Fastify()
  target.post('/', async (req, reply) => {
    plan.deepStrictEqual(req.body, 'HELLO FOLKS!', 'message is plan.strictEqual')
    ee.emit('called')
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
            saveJob(input: { name: "test", callbackUrl: $callbackUrl, method: "POST", headers: "{ \\"content-type\\": \\"text/plain\\" }" }) {
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
    plan.strictEqual(jobId, '1')
  }

  const p = once(ee, 'called')
  {
    const msg = 'HELLO FOLKS!'
    const now = Date.now()
    const res = await server.inject({
      method: 'POST',
      url: '/graphql',

      payload: {
        query: `
          mutation($body: String!, $jobId: ID) {
            saveMessage(input: { jobId: $jobId, body: $body } ) {
              id
              when
            }
          }
        `,
        variables: {
          body: msg,
          jobId
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
})
