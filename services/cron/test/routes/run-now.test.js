'use strict'

const { test } = require('node:test')
const { EventEmitter, once } = require('node:events')
const Fastify = require('fastify')
const { buildServer } = require('../helper')
const tspl = require('@matteo.collina/tspl')
const { setTimeout: sleep } = require('timers/promises')

test('run now', async (t) => {
  const plan = tspl(t, { plan: 10 })
  const ee = new EventEmitter()

  const server = await buildServer(t)

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

  const schedule = '0 0 * * *' // this won't start during the test

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
    const body = res.json()
    const { data } = body
    jobId = data.saveJob.id

    plan.strictEqual(jobId, '1')
  }

  await server.inject({
    method: 'GET',
    url: `/jobs/${jobId}/run`
  })

  await once(ee, 'called')
  await sleep(500) // we need to wait for the message to be saved

  // We have 2 messages, one scheduled (unsent yet) and one sent "now".
  const messages = await server.platformatic.entities.message.find()
  plan.equal(messages.length, 2)
  const sentMessage = messages.filter((m) => m.sentAt !== null)[0]
  const unsentMessage = messages.filter((m) => m.sentAt === null)[0]
  plan.strictEqual(sentMessage.jobId, Number(jobId))
  plan.strictEqual(unsentMessage.jobId, Number(jobId))

  plan.deepEqual(sentMessage.headers, { 'content-type': 'application/json' })
  plan.deepEqual(sentMessage.responseBody, '{"ok":true}')
  plan.deepEqual(sentMessage.responseStatusCode, 200)
  plan.equal(sentMessage.noReschedule, true)
})
