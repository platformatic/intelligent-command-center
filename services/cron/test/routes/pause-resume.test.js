'use strict'

const test = require('node:test')
const { buildServer } = require('../helper')
const tspl = require('@matteo.collina/tspl')

test('pause and then resume', async (t) => {
  const plan = tspl(t, { plan: 12 })
  let jobId
  const server = await buildServer(t, { PLT_CRON_ICC_JOBS_INIT: false })
  const targetUrl = 'http://localhost:12345'

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

  let next
  {
    const messages = await server.platformatic.entities.message.find()
    plan.equal(messages.length, 1)
    const unsentMessage = messages[0]
    plan.strictEqual(unsentMessage.jobId, Number(jobId))
    plan.strictEqual(unsentMessage.sentAt, null)
    next = unsentMessage.when
  }

  // Pause
  {
    await server.inject({
      method: 'GET',
      url: `/jobs/${jobId}/pause`
    })

    const job = await server.platformatic.entities.job.find({
      where: {
        id: { eq: jobId }
      }
    })
    plan.equal(job[0].paused, true)
    plan.strictEqual(job[0].nextRunAt, null)

    const messages = await server.platformatic.entities.message.find()
    plan.equal(messages.length, 0)
  }

  // Resume
  {
    await server.inject({
      method: 'GET',
      url: `/jobs/${jobId}/resume`
    })

    const job = await server.platformatic.entities.job.find({
      where: {
        id: { eq: jobId }
      }
    })
    plan.equal(job[0].paused, false)
    plan.ok(job[0].nextRunAt !== null)

    const messages = await server.platformatic.entities.message.find()
    plan.equal(messages.length, 1)
    plan.strictEqual(messages[0].sentAt, null)
    plan.deepEqual(messages[0].when, next)
  }
})
