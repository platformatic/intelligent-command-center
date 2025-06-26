'use strict'

const { test } = require('node:test')
const { EventEmitter, once } = require('node:events')
const Fastify = require('fastify')
const { buildServer } = require('../helper')
const tspl = require('@matteo.collina/tspl')
const { setTimeout: sleep } = require('timers/promises')

test('cancel retry message', async (t) => {
  const plan = tspl(t, { plan: 7 })
  const ee = new EventEmitter()

  const server = await buildServer(t)

  const target = Fastify()
  target.post('/', async (req, reply) => {
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

  const jobId = res.json().data.saveJob.id

  await once(ee, 'called')
  await once(ee, 'called')
  await once(ee, 'called')
  await sleep(200) // we need to wait for the message to be saved

  // We have 2 messages, one scheduled (unsent yet) and one sent "now".
  const messages = await server.platformatic.entities.message.find({ where: { jobId: { eq: jobId } } })
  plan.equal(messages.length, 1)
  const message = messages[0]
  plan.ok(message.retries >= 2)

  const id = message.id

  await server.inject({
    method: 'GET',
    url: `/messages/${id}/cancel`
  })

  const messagesAfter = await server.platformatic.entities.message.find({ where: { jobId: { eq: jobId } } })
  plan.equal(messagesAfter.length, 1)
  const messageAfter = messagesAfter[0]
  plan.equal(messageAfter.failed, true)
})
