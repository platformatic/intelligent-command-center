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

  app.decorate('getApplicationConfig', async (application, ctx) => {
    ctx.logger.debug({ application }, 'Getting application config')

    const configs = await app.platformatic.entities.applicationsConfig.find({
      where: { applicationId: { eq: application.id } },
      orderBy: [{ field: 'version', direction: 'DESC' }],
      limit: 1,
      tx: ctx?.tx
    })

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

    let newApplicationConfig = null
    await app.getGenerationLockTx(async (tx) => {
      const newCtx = { ...ctx, tx }

      const applicationConfig = await app.getApplicationConfig(application, newCtx)

      await app.createGeneration(async () => {
        newApplicationConfig = await app.platformatic.entities.applicationsConfig.save({
          input: {
            ...applicationConfig,
            ...configUpdates,
            version: applicationConfig.version + 1
          },
          tx
        })
        ctx.logger.info({ config: newApplicationConfig }, 'Saved new application config')
      }, newCtx)
    }, ctx)

    await app.emitWattproConfig(application, ctx)
  })

  app.decorate('getWattproConfig', async (application, ctx) => {
    const [config, httpCacheConfig] = await Promise.all([
      app.getApplicationConfig(application, ctx),
      app.getHttpCacheConfig(application, ctx)
    ])
    return { resources: config.resources, httpCacheConfig }
  })

  app.decorate('emitWattproConfig', async (application, ctx) => {
    const wattproConfig = await app.getWattproConfig(application, ctx)
    await app.emitUpdate(`applications/${application.id}`, {
      topic: 'config',
      type: 'config-updated',
      data: wattproConfig
    }).catch((err) => {
      ctx.logger.error({ err }, 'Failed to send notification to app instance')
    })
  })

  app.decorate('getHttpCacheConfig', async (application, ctx) => {
    try {
      const cacheConfigs = await ctx.req.trafficante.getInterceptorConfigs({
        'where.applicationId.eq': application.id,
        'where.applied.eq': true,
        'orderby.createdAt': 'desc',
        limit: 1
      })

      if (cacheConfigs.error) {
        ctx.logger.error({ error: cacheConfigs }, 'Failed to get cache config')
        return null
      }

      if (cacheConfigs.length === 0) {
        ctx.logger.error('No cache config found')
        return null
      }

      const cacheConfig = cacheConfigs[0].config
      return cacheConfig
    } catch (error) {
      ctx.logger.error({ error }, 'Failed to get cache config')
      return null
    }
  })
}, {
  name: 'application-config',
  dependencies: ['env']
})

module.exports = plugin
