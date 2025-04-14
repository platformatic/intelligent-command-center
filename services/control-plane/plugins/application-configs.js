'use strict'

const fp = require('fastify-plugin')
const errors = require('./errors')

const plugin = fp(async function (app) {
  const defaultResources = {
    threads: app.env.PLT_CONTROL_PLANE_DEFAULT_THREADS,
    heap: app.env.PLT_CONTROL_PLANE_DEFAULT_HEAP,
    services: []
  }

  app.decorate('getDefaultApplicationResources', () => defaultResources)

  app.decorate('getGenerationApplicationsConfigs', async (generationId, ctx) => {
    const { db, sql } = app.platformatic

    const configs = await db.query(sql`
      SELECT
        ac.id,
        ac.application_id as "applicationId",
        ac.version,
        ac.resources,
        ac.created_at as "createdAt"
      FROM applications_configs ac
      JOIN generations_applications_configs gac ON ac.id = gac.config_id
      WHERE gac.generation_id = ${generationId}
    `)

    return configs
  })

  app.decorate('getApplicationConfig', async (application, opts, ctx) => {
    const findOpts = {
      where: { applicationId: { eq: application.id } },
      orderBy: [{ field: 'version', direction: 'DESC' }],
      limit: 1,
      tx: ctx?.tx
    }

    if (opts?.fields) {
      findOpts.fields = ['version']
    }

    ctx.logger.debug({ application, findOpts }, 'Getting application config')

    const configs = await app.platformatic.entities.applicationsConfig.find(findOpts)
    if (configs.length === 0) {
      ctx.logger.error({ application }, 'Application config not found')
      throw new errors.ApplicationConfigNotFound(application.name)
    }

    ctx.logger.debug({ configs }, 'Got application config')

    return configs[0]
  })

  app.decorate('setApplicationConfig', async (application, configUpdates, ctx) => {
    const resources = configUpdates.resources
    if (resources) {
      for (const service of resources.services) {
        service.heap ??= defaultResources.heap
        service.threads ??= defaultResources.threads
      }
    }

    ctx.logger.info({ configUpdates }, 'Setting application config')

    await app.getGenerationLockTx(async (tx) => {
      ctx = { ...ctx, tx }

      const applicationConfig = await app.getApplicationConfig(application, null, ctx)

      await app.createGeneration(async () => {
        const newApplicationConfig = await app.platformatic.entities.applicationsConfig.save({
          input: {
            ...applicationConfig,
            ...configUpdates,
            version: applicationConfig.version + 1
          },
          tx
        })
        ctx.logger.info({ config: newApplicationConfig }, 'Saved new application config')
      }, ctx)
    }, ctx)
  })
}, {
  name: 'application-config',
  dependencies: ['env']
})

module.exports = plugin
