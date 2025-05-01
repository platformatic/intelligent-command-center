/// <reference path="../global.d.ts" />

'use strict'

const { setTimeout: sleep } = require('node:timers/promises')
const fp = require('fastify-plugin')
const errors = require('./errors')

const GenerationLockSymbol = Symbol('createGenerationLock')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  const lockMinTimeout = app.env.PLT_CONTROL_PLANE_DB_LOCK_MIN_TIMEOUT

  app.decorate('getGenerationById', async (generationId) => {
    const generations = await app.platformatic.entities.generation.find({
      where: { id: { eq: generationId } }
    })
    return generations.length === 1 ? generations[0] : null
  })

  app.decorate('getLatestGeneration', async () => {
    const generations = await app.platformatic.entities.generation.find({
      orderBy: [{ field: 'version', direction: 'DESC' }],
      limit: 1
    })
    return generations.length === 1 ? generations[0] : null
  })

  app.decorate('createGeneration', async (callback, ctx) => {
    const tx = ctx?.tx

    const locked = await app.checkGenerationLockTx(ctx?.tx)
    if (!locked) {
      throw new errors.CannotCreateGenerationWithoutGenerationLock()
    }

    ctx.logger.info('Creating new generation')

    const { sql } = app.platformatic

    const lastGeneration = await app.getLatestGeneration(ctx)
    const [newGeneration] = await tx.query(sql`
      INSERT INTO generations (version)
      SELECT COALESCE(MAX(version), 0) + 1 FROM generations
      RETURNING id, version, created_at as "createdAt"
    `)

    ctx.logger.info({ generation: newGeneration }, 'Saved new generation')

    // Add a new deployment or application config here
    await callback(newGeneration, ctx)

    ctx.logger.debug('Generating new generation refs')

    if (lastGeneration !== null) {
      app.getBaseGraph(lastGeneration, ctx)
        .catch((err) => {
          ctx.logger.error({ err }, 'Failed to get base graph')
        })
    }

    await Promise.all([
      generateGenerationDeploymentsRefs(newGeneration.id, tx),
      generateGenerationConfigsRefs(newGeneration.id, tx)
    ])
  })

  app.decorate('getGenerationLockTx', async (callback, ctx, attempt = 0) => {
    let result = null
    try {
      ctx.logger.debug('Getting generation lock')

      await app.platformatic.db.tx(async (tx) => {
        const lock = await getCreateGenerationLock(tx)
        if (!lock) throw new errors.FailedToGetLock()

        ctx.logger.debug('Got generation lock')

        tx[GenerationLockSymbol] = true
        result = await callback(tx)
      })
    } catch (err) {
      if (err instanceof errors.FailedToGetLock && attempt < 30) {
        const baseTimeout = lockMinTimeout * attempt
        const diffTimeout = lockMinTimeout * (Math.random() - 0.5)
        const timeout = baseTimeout + diffTimeout

        ctx.logger.warn(
          { err, attempt, timeout },
          'Failed to get generation lock, retrying'
        )

        await sleep(timeout)
        return app.getGenerationLockTx(callback, ctx, attempt + 1)
      }
      throw err
    }
    return result
  })

  app.decorate('checkGenerationLockTx', async (tx) => {
    return tx?.[GenerationLockSymbol] === true
  })

  async function getCreateGenerationLock (tx) {
    const { sql } = app.platformatic
    const res = await tx.query(sql`SELECT pg_try_advisory_xact_lock(1)`)
    return res[0].pg_try_advisory_xact_lock === true
  }

  async function generateGenerationDeploymentsRefs (generationId, tx) {
    const { sql } = app.platformatic

    await tx.query(sql`
      INSERT INTO generations_deployments (generation_id, deployment_id)
      SELECT ${generationId}, last_deployments.id FROM (
        SELECT DISTINCT ON (application_id) id FROM deployments
        ORDER BY application_id, created_at DESC
      ) as last_deployments
    `)
  }

  async function generateGenerationConfigsRefs (generationId, tx) {
    const { sql } = app.platformatic

    await tx.query(sql`
      INSERT INTO generations_applications_configs (generation_id, config_id)
      SELECT ${generationId}, latest_configs.id FROM (
        SELECT DISTINCT ON (application_id) id FROM applications_configs
        ORDER BY application_id, created_at DESC
      ) as latest_configs
    `)
  }
})
