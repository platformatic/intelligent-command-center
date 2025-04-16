'use strict'

const { buildServer } = require('../helper')
const { test } = require('node:test')
const { once, EventEmitter } = require('events')
const { equal, deepEqual } = require('node:assert/strict')
const Fastify = require('fastify')
const same = deepEqual

test('happy path', async (t) => {
  const ee = new EventEmitter()
  const server1 = await buildServer(t)
  const server2 = await buildServer(t)

  const target = Fastify()
  target.post('/', async (req, reply) => {
    same(req.body, { message: 'HELLO FOLKS!' }, 'message is equal')
    ee.emit('called')
    return { ok: true }
  })

  t.after(() => target.close())
  await target.listen({ port: 0 })
  const targetUrl = `http://localhost:${target.server.address().port}`

  let jobId
  {
    const res = await server1.inject({
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
    equal(res.statusCode, 200)
    const body = res.json()
    const { data } = body
    jobId = data.saveJob.id
    equal(jobId, '1')
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

    const res = await server2.inject({
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
    equal(res.statusCode, 200)

    const { data } = body
    const when = new Date(data.saveMessage.when)
    equal(when.getTime() - now >= 0, true)
  }

  await p
})

test('re-election', async (t) => {
  const ee = new EventEmitter()
  const server1 = await buildServer(t)
  const server2 = await buildServer(t)

  const target = Fastify()
  target.post('/', async (req, reply) => {
    same(req.body, { message: 'HELLO FOLKS!' }, 'message is equal')
    ee.emit('called')
    return { ok: true }
  })

  t.after(() => target.close())
  await target.listen({ port: 0 })
  const targetUrl = `http://localhost:${target.server.address().port}`

  let jobId
  {
    const res = await server1.inject({
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
    equal(res.statusCode, 200)
    const body = res.json()
    const { data } = body
    jobId = data.saveJob.id
    equal(jobId, '1')
  }

  await server1.close()

  const p = once(ee, 'called')
  {
    const msg = JSON.stringify({
      message: 'HELLO FOLKS!'
    })
    const now = Date.now()
    const query = `
      mutation($body: String!, $jobId: ID) {
        saveMessage(input: { jobId: $jobId, headers: "{ \\"content-type\\": \\"application/json\\" }", body: $body, method: "POST" }) {
          id
          when
        }
      }
    `

    const res = await server2.inject({
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
    equal(res.statusCode, 200)

    const { data } = body
    const when = new Date(data.saveMessage.when)
    equal(when.getTime() - now >= 0, true)
  }

  await p
})
