'use strict'

const { CronExpressionParser: cronParser } = require('cron-parser')
const { computeBackoff } = require('./backoff')
const { request } = require('undici')

const getPromClient = (app) => {
  // When inside a runtime
  if (globalThis.platformatic && globalThis.platformatic.prometheus) {
    const { client, registry } = globalThis.platformatic.prometheus
    return { client, registry }
  }
  // When running as single service (e.g. in tests)
  if (app?.metrics) {
    const { client } = app.metrics
    const registry = client.register
    return { client, registry }
  }
  return null
}

class Executor {
  constructor (app) {
    this.app = app
    this.timer = null
    this._lastExecute = null
    this.stopped = false
    this.execute = () => {
      /* c8 ignore next 3 */
      this._lastExecute = this._execute().catch((err) => {
        app.log.error({ err })
      }).finally(() => {
        this._lastExecute = null
      })
    }

    const promClient = getPromClient(app)
    this.isMetricsEnabled = !!promClient

    if (this.isMetricsEnabled) {
      const { client, registry } = promClient
      const labelNames = ['jobId', 'jobName', 'applicationId']
      this.jobsMetrics = {
        messagesSent: new client.Counter({
          name: 'icc_jobs_messages_sent',
          help: 'Messages sent by jobs',
          registers: [registry],
          labelNames
        }),
        messagesFailed: new client.Counter({
          name: 'icc_jobs_messages_failed',
          help: 'Messages failed by jobs',
          registers: [registry],
          labelNames
        }),
        messagesRetries: new client.Counter({
          name: 'icc_jobs_messages_retries',
          help: 'Messages retried by jobs',
          registers: [registry],
          labelNames

        }),
        messagesExecutionTimeSum: new client.Counter({
          name: 'icc_jobs_messages_execution_time_sum',
          help: 'Time spent processing messages',
          registers: [registry],
          labelNames
        })
      }
    }
  }

  async _execute () {
    if (this.stopped) {
      return
    }

    const app = this.app
    const now = new Date()
    const { db, sql } = app.platformatic

    const messages = await db.query(sql`
      SELECT  jobs.callback_url AS "callbackUrl",
              jobs.name AS "jobName",
              messages.job_id AS "jobId",
              messages.body AS "body",
              messages.headers AS "headers",
              messages.method AS "method",
              messages.retries AS "retries",
              jobs.headers AS "jobHeaders",
              jobs.body AS "jobBody",
              jobs.method AS "jobMethod",
              jobs.max_retries AS "maxRetries",
              jobs.schedule AS "schedule",
              messages."when" AS "when",
              messages.id AS "id",
              messages.no_reschedule AS "noReschedule",
              jobs.application_id AS "applicationId"
      FROM    messages

      INNER JOIN jobs ON messages.job_id = jobs.id

      WHERE messages.sent_at IS NULL
      AND   messages.failed = false
      AND   messages."when" <= ${now}
      AND   jobs.deleted_at IS NULL
      AND   messages.deleted_at IS NULL

      LIMIT 10
    `)

    const res = await Promise.allSettled(messages.map(async (message) => {
      const { callbackUrl, method, body, maxRetries, jobName, applicationId, jobId } = message
      // We must JSON.parse(message.headers) because SQLite store JSON
      // as strings.
      const headers = {
        ...message.jobHeaders,
        ...message.headers
      }
      headers['content-type'] ||= 'application/json'

      const metricsLabels = {
        jobId,
        jobName
      }
      // Internal ICC jobs have no applications
      if (message.applicationId) {
        metricsLabels.applicationId = applicationId
      }

      // We do not want this call to be inside a transaction
      const callbackRes = await this.makeCallback(callbackUrl, method, headers, body, message, metricsLabels)
      const { success, body: responseBody, statusCode, headers: responseHeaders } = callbackRes

      if (this.isMetricsEnabled) {
        if (success) {
          this.jobsMetrics.messagesSent.labels(metricsLabels).inc()
        } else {
          this.jobsMetrics.messagesFailed.labels(metricsLabels).inc()
        }
      }

      // We are not handling this error right now, but we should
      await db.tx(async (tx) => {
        const now = new Date()
        if (success) {
          await app.platformatic.entities.message.save({
            input: {
              id: message.id,
              sentAt: now,
              responseBody,
              responseStatusCode: statusCode,
              callbackUrl: message.callbackUrl,
              responseHeaders: JSON.stringify(responseHeaders)
            },
            tx,
            skipUpdateTimer: true

          })

          await app.platformatic.entities.job.save({
            input: {
              id: message.jobId,
              lastRunAt: now,
              status: 'success'
            },
            tx,
            skipUpdateMessage: true
          })
          app.log.info({ callbackUrl, method, callbackRes }, 'callback succesful!')
        } else {
          const backoff = computeBackoff({ retries: message.retries, maxRetries })
          if (!backoff) {
            app.log.warn({ message, body }, 'callback failed')
            await app.platformatic.entities.message.save({
              input: {
                id: message.id,
                sentAt: now,
                failed: true,
                callbackUrl,
                responseBody,
                responseStatusCode: statusCode,
                responseHeaders: JSON.stringify(headers)
              },
              tx,
              skipUpdateTimer: true
            })

            await app.platformatic.entities.job.save({
              input: {
                id: message.jobId,
                lastRunAt: now,
                status: 'failed'
              },
              tx,
              skipUpdateMessage: true
            })
          } else {
            app.log.info({ callbackUrl, method }, 'callback failed, scheduling retry!')
            if (this.isMetricsEnabled) {
              this.jobsMetrics.messagesRetries.labels(metricsLabels).inc()
            }
            const newItem = {
              id: message.id,
              retries: backoff.retries,
              when: new Date(Date.now() + backoff.waitFor)
            }
            await app.platformatic.entities.message.save({ input: newItem, tx })
            // We don't want to reschedule the cron job, as a retry has been scheduled
            message.noReschedule = true
          }
        }
        // let's schedule the next call if it's a cron is not marked as "noReschedule"
        if (message.schedule && !message.noReschedule) {
          const interval = cronParser.parse(message.schedule)
          const next = interval.next()
          await app.platformatic.entities.message.save({
            input: {
              jobId: message.jobId,
              when: next,
              headers: message.jobHeaders,
              body: message.jobBody,
              method: message.jobMethod
            },
            tx
          })

          await app.platformatic.entities.job.save({
            input: {
              id: message.jobId,
              nextRunAt: next
            },
            tx,
            skipUpdateMessage: true
          })
        }
      })
    }))

    /* c8 ignore next 4 */
    for (const r of res) {
      if (r.status === 'rejected') {
        app.log.error({ err: r.reason }, 'error while executing message')
      }
    }

    if (this.stopped) {
      return
    }

    const rows = await db.query(
      sql`SELECT "when" FROM messages WHERE sent_at is null AND deleted_at is NULL ORDER BY "when" ASC LIMIT 1`)
    const nowTime = new Date(now).getTime()

    const [next] = rows
    if (next) {
      const whenTime = new Date(next.when).getTime()
      const delay = whenTime - nowTime
      clearTimeout(this.timer)
      this.timer = setTimeout(this.execute, delay)
      this.nextTime = nowTime + delay
    }
  }

  updateTimer (date) {
    if ((this.nextTime > 0 && date.getTime() < this.nextTime) || !this.timer) {
      clearTimeout(this.timer)
      this.nextTime = date.getTime()
      let delay = this.nextTime - Date.now()
      if (delay < 0) {
        delay = 0
      }
      this.timer = setTimeout(this.execute, delay)
    }
  }

  async stop () {
    clearTimeout(this.timer)
    await this._lastExecute
    this.stopped = true
  }

  async makeCallback (callbackUrl, method, headers, body, message, metricsLabels) {
    const startTime = process.hrtime()
    try {
      const res = await request(callbackUrl, {
        method,
        headers,
        body
      })
      let resBody = null
      if (res.headers['content-type']?.indexOf('application/json') === 0) {
        resBody = await res.body.json()
      } else if (res.headers['content-type'] === 'text/plain') {
        resBody = await res.body.text()
      }

      if (res.statusCode >= 200 && res.statusCode < 300) {
        return {
          success: true,
          statusCode: res.statusCode,
          body: resBody,
          headers: res.headers
        }
      } else {
        res.body.resume()
        // not interested in the errors
        res.body.on('error', () => {})

        this.app.log.warn({ message, statusCode: res.statusCode, body }, 'callback unsuccessful, maybe retry')
        return {
          success: false,
          body: resBody,
          statusCode: res.statusCode,
          headers: res.headers
        }
      }
      /* c8 ignore next 4 */
    } catch (err) {
      this.app.log.warn({ err }, 'error processing callback')
      return {
        success: false
      }
    } finally {
      const diff = process.hrtime(startTime)
      const seconds = diff[0] + diff[1] / 1e9
      if (this.isMetricsEnabled) {
        this.jobsMetrics.messagesExecutionTimeSum.labels(metricsLabels).inc(seconds)
      }
    }
  }
}

module.exports = Executor
