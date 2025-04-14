/// <reference path="../global.d.ts" />

'use strict'

const fp = require('fastify-plugin')
const errors = require('./errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  app.decorate('getApplicationById', async (applicationId, ctx) => {
    const applications = await app.platformatic.entities.application.find({
      where: { id: { eq: applicationId } },
      tx: ctx?.tx
    })
    return applications.length === 1 ? applications[0] : null
  })

  app.decorate('getApplicationByName', async (name, ctx) => {
    const applications = await app.platformatic.entities.application.find({
      where: { name: { eq: name } },
      tx: ctx?.tx
    })
    return applications.length === 1 ? applications[0] : null
  })

  app.decorate('saveApplication', async (name, ctx) => {
    const { entities } = app.platformatic
    const tx = ctx?.tx

    const locked = await app.checkGenerationLockTx(tx)
    if (!locked) {
      ctx.logger.error({ name }, 'Cannot create application without generation lock')
      throw new errors.CannotCreateApplicationWithoutGenerationLock()
    }

    ctx.logger.info({ name }, 'Creating a new application')

    const application = await entities.application.save({
      input: { name }, tx
    })

    ctx.logger.info({ application }, 'Saved new application')
    ctx.logger.info('Saving default application config')

    const defaultResources = app.getDefaultApplicationResources()
    const defaultConfig = await entities.applicationsConfig.save({
      input: {
        applicationId: application.id,
        version: 1,
        resources: JSON.stringify(defaultResources)
      },
      tx
    })

    ctx.logger.info({ defaultConfig }, 'Saved default application config')

    return application
  })
})
