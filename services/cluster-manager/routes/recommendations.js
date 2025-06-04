/// <reference path="../global.d.ts" />
'use strict'

const { InvalidStatus, InvalidStatusFlow } = require('../lib/errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app, opts) {
  app.decorate('getRecommendationsCount', async () => {
    const { db, sql } = app.platformatic
    const queryCount = sql`SELECT COUNT(*) FROM recommendations`
    const res = await db.query(queryCount)
    return parseInt(res[0].count)
  })

  app.get('/recommendations/count', async () => {
    return await app.getRecommendationsCount()
  })

  app.platformatic.addEntityHooks('recommendation', {
    save: async (save, opts) => {
      if (opts.input.id) {
        const recommendation = await app.getRecommendationById(opts.input.id)
        const newStatus = opts.input.status
        if (newStatus !== recommendation.status) {
          switch (newStatus) {
            case 'calculating':
              // Can not update status to "calculating", it can only begin there
              throw new InvalidStatus(newStatus)
            case 'new':
              // Can only transition to "new" from "calculating"
              if (recommendation.status !== 'calculating') {
                throw new InvalidStatusFlow(newStatus, recommendation.status)
              }
              break
            case 'expired':
              // Can only transition to "expired" from "new"
              if (recommendation.status !== 'new') {
                throw new InvalidStatus(newStatus)
              }
              break
            case 'skipped':
              // Can only transition to "skipped" from "new"
              if (recommendation.status !== 'new') {
                throw new InvalidStatusFlow(newStatus, recommendation.status)
              }
              break
            case 'in_progress':
              // Can only transition to "in_progress" from "new" or "skipped"
              if (recommendation.status !== 'skipped' && recommendation.status !== 'new') {
                throw new InvalidStatusFlow(newStatus, recommendation.status)
              }
              break
            case 'done':
            case 'aborted':
              // Can only transition to "done" or "aborted" from "in_progress"
              if (recommendation.status !== 'in_progress') {
                throw new InvalidStatusFlow(newStatus, recommendation.status)
              }
              break
            default:
              throw new InvalidStatus(newStatus)
          }
        }

        try {
          const result = await save({
            input: {
              id: recommendation.id,
              status: newStatus
            }
          })
          return result
        } catch (err) {
          if (err.message.startsWith('invalid input value for enum recommendation_status')) {
            throw new InvalidStatus(newStatus)
          }
          throw err
        }
      } else {
        console.log(opts)
        await save(opts)
      }
    }
  })
}
