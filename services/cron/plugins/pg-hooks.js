'use strict'

const fp = require('fastify-plugin')

// Needed to work with dates & postgresql
// See https://node-postgres.com/features/types/
process.env.TZ = 'UTC'

const jobPlugin = require('../lib/job')
const Executor = require('../lib/executor')
const { scheduler } = require('timers/promises')
const { on } = require('events')

async function plugin (app, options) {
  const lock = Number(options.lock) || 42
  /* c8 ignore next 1 */
  const leaderPoll = Number(options.leaderPoll) || 10000

  app.log.info('Locking cron plugin to advisory lock %d', lock)

  const dummyExecutor = {
    execute () {},
    updateTimer () {
      const { db, sql } = app.platformatic
      db.query(sql`
        NOTIFY "update_timer";
      `)
        /* c8 ignore next 3 */
        .catch((err) => {
          app.log.error({ err }, 'Error in dummy updateTimer')
        })
    },
    stop () {}
  }

  let executor = dummyExecutor
  let elected = false

  const abortController = new AbortController()

  async function amITheLeader () {
    const { db, sql } = app.platformatic
    await db.task(async (t) => {
      while (!abortController.signal.aborted) {
        const [{ leader }] = await t.query(sql`
          SELECT pg_try_advisory_lock(${lock}) as leader;
        `)
        if (leader && !elected) {
          app.log.info('This instance is the leader')
          executor = new Executor(app)
          executor.execute()
          elected = true
          ;(async () => {
            await t.query(sql`
              LISTEN "update_timer";
            `)
            for await (const notification of on(t._driver.client, 'notification', { signal: abortController.signal })) {
              app.log.debug({ notification }, 'Received notification')
              try {
                await executor.execute()
                /* c8 ignore next 3 */
              } catch (err) {
                app.log.warn({ err }, 'error while processing notification')
              }
              // TODO: write automated tests for this
            }
            /* c8 ignore next 19 */
          })()
            .catch((err) => {
              if (err.name !== 'AbortError') {
              // an error occurred, and it's expected
                app.log.error({ err }, 'Error in notification loop')
              } else {
                abortController.abort()
              }
            })
        } else if (leader && elected) {
          app.log.debug('This instance is still the leader')
        } else if (!leader && elected) {
          // this should never happen
          app.log.warn('This instance was the leader but is not anymore')
          await executor.stop()
          executor = dummyExecutor
          elected = false
        } else {
          app.log.debug('This instance is not the leader')
          executor = dummyExecutor
        }
        try {
          await scheduler.wait(leaderPoll, { signal: abortController.signal })
        } catch {
          break
        }
      }
    })
    app.log.debug('leader loop stopped')
  }

  let leaderLoop = amITheLeader()

  retryLeaderLoop(leaderLoop)

  /* c8 ignore next 10 */
  function retryLeaderLoop () {
    leaderLoop.catch((err) => {
      app.log.error({ err }, 'Error in leader loop')
      return executor.stop()
    }).then(() => {
      if (!abortController.signal.aborted) {
        leaderLoop = amITheLeader()
        retryLeaderLoop(leaderLoop)
      }
    })
  }

  app.platformatic.addEntityHooks('message', {
    // We need skipUpdateTimer otherside we call update timer every time
    // we save something on the message (e.g. the response).
    // It's hackish, TODO: refactoring
    async insert (original, { inputs, ...rest }) {
      const now = new Date() // now
      for (const input of inputs) {
        input.when = now
      }

      const res = await original({ inputs, ...rest })

      for (const input of inputs) {
        if (!rest.skipUpdateTimer) {
          const date = new Date(input.when)
          executor.updateTimer(date)
        }
      }

      return res
    },

    async save (original, { input, ...rest }) {
      if (!input.when) {
        input.when = new Date() // now
      }

      const res = await original({ input, ...rest })

      if (!rest.skipUpdateTimer) {
        const date = new Date(input.when)
        executor.updateTimer(date)
      }

      return res
    }
  })

  await app.register(jobPlugin)

  await executor.execute()

  app.addHook('onClose', async () => {
    abortController.abort()
    await leaderLoop
    await executor.stop()
  })

  app.decorate('notifyUpdateTimer', async function () {
    const { db, sql } = app.platformatic
    await db.query(sql`NOTIFY "update_timer";`)
  })

  app.decorate('runNow', async function (jobId) {
    app.log.info({ jobId }, 'triggered running job now')
    const job = (await app.platformatic.entities.job.find({
      where: {
        id: {
          eq: jobId
        }
      }
    }))?.[0]

    if (!job) {
      app.log.error({ jobId }, 'job not found')
      throw new Error(`job not found with id ${jobId}`)
    }
    const { method, headers, body } = job
    // The message is saved with noReschedule to avoid the executor to reschedule it,
    // which is what we don't want in "run now".
    await app.platformatic.entities.message.save({
      input: {
        jobId,
        when: new Date(),
        method,
        headers,
        body,
        noReschedule: true
      }
    })
    await app.notifyUpdateTimer()
  })

  app.decorate('pause', async function (jobId) {
    app.log.info({ jobId }, 'pausing running job')

    await app.platformatic.db.tx(async (tx) => {
      const job = (await app.platformatic.entities.job.find({
        where: {
          id: {
            eq: jobId
          }
        },
        tx
      }))?.[0]

      if (!job) {
        app.log.error({ jobId }, 'job not found')
        throw new Error(`job not found with id ${jobId}`)
      }

      // We get the messages that are scheduled for the job and we remove them
      await app.platformatic.entities.message.delete({
        where: {
          jobId: {
            eq: jobId
          },
          sentAt: {
            eq: null
          }
        },
        tx
      })

      // mark the job as paused
      await app.platformatic.entities.job.save({
        input: {
          id: jobId,
          paused: true,
          nextRunAt: null
        },
        tx
      })
    })
  })

  app.decorate('resume', async function (jobId) {
    app.log.info({ jobId }, 'resuming job now')

    await app.platformatic.db.tx(async (tx) => {
      const job = (await app.platformatic.entities.job.find({
        where: {
          id: {
            eq: jobId
          }
        },
        tx
      }))?.[0]

      if (!job) {
        app.log.error({ jobId }, 'job not found')
        throw new Error(`job not found with id ${jobId}`)
      }

      // mark the job as nott paused
      await app.platformatic.entities.job.save({
        input: {
          id: jobId,
          paused: false
        },
        tx
      })
    })
  })

  app.decorate('cancelRetryingMessage', async function (messageId) {
    app.log.info({ messageId }, 'cancel retrying message sending now')
    await app.platformatic.entities.message.save({
      input: {
        id: messageId,
        failed: true
      }
    })
  })
}

module.exports = fp(plugin, { name: 'pg-hooks' })
