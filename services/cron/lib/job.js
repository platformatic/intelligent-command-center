'use strict'

const { CronExpressionParser: cronParser } = require('cron-parser')
const fp = require('fastify-plugin')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  app.platformatic.addEntityHooks('job', {
    save (original, args) {
      // This might fail if save is called from a transaction
      if (args.tx) {
        return runInTransaction(args.tx)
      } else {
        return app.platformatic.db.tx(runInTransaction)
      }

      async function runInTransaction (tx) {
        const job = await original({ input: args.input, tx })

        const { schedule, method, headers, body, paused } = job
        // If paused, we don't schedule anything, otherwise we schedule a message on every save
        // if "skipInitialMessage" is set to false, we don't schedule a message on save,
        // this is usefuel when the job is updated after an execution to aviod
        // scheduling messages twice
        if (schedule && !paused && !args.skipUpdateMessage) {
          let interval
          try {
            interval = cronParser.parse(schedule)
          } catch (err) {
            const _err = new Error('Invalid cron expression')
            _err.cause = err
            throw _err
          }

          const next = interval.next()
          const oldMessages = await app.platformatic.entities.message.find({
            where: {
              jobId: { eq: job.id },
              sentAt: { eq: null }
            },
            tx
          })

          const input = {
            jobId: job.id,
            when: next,
            method,
            headers,
            body
          }

          if (oldMessages.length > 0) {
            const oldMessage = oldMessages[0] // We only support one "scheduled" message per job
            input.id = oldMessage.id
          }
          await app.platformatic.entities.message.save({
            input,
            tx
          })

          await original({
            input: {
              id: job.id,
              nextRunAt: next
            },
            tx
          })
        }
        return job
      }
    }
  })
})
