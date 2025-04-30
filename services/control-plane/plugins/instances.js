/// <reference path="../global.d.ts" />

'use strict'

const fp = require('fastify-plugin')
const errors = require('./errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  app.decorate('getInstanceByPodId', async (podId) => {
    const instances = await app.platformatic.entities.instance.find({
      where: { podId: { eq: podId } }
    })
    return instances.length === 1 ? instances[0] : null
  })

  app.decorate('getDeploymentInstances', async (deploymentId, ctx) => {
    const instances = await app.platformatic.entities.instance.find({
      where: { deploymentId: { eq: deploymentId } },
      tx: ctx?.tx
    })
    return instances
  })

  app.decorate('initApplicationInstance', async (
    applicationName,
    podId,
    podNamespace,
    ctx
  ) => {
    let application = null
    let deployment = null

    ctx.logger.debug({ podId }, 'Getting application instance')

    const { image: imageId } = await app.machinist.getPodDetails(
      podId,
      podNamespace,
      ctx
    )

    const instance = await app.getInstanceByPodId(podId)
    if (instance !== null) {
      ([application, deployment] = await Promise.all([
        app.getApplicationById(instance.applicationId),
        app.getDeploymentById(instance.deploymentId)
      ]))
      if (applicationName !== application.name) {
        throw new errors.PodAssignedToDifferentApplication(
          instance.podId,
          application.name
        )
      }
      if (imageId !== deployment.imageId) {
        throw new errors.PodAssignedToDifferentImage(
          instance.podId,
          deployment.imageId
        )
      }
      ctx.logger.debug({ instance }, 'Got app instance with the same pod id')
    } else {
      const result = await app.saveInstance(
        applicationName, imageId, podId, ctx
      )

      if (result.isNewApplication) {
        await app.sendSuccessfulApplicationCreateActivity(
          result.application.id,
          result.application.name,
          ctx
        ).catch((err) => {
          ctx.logger.error({ err }, 'Failed to send activity')
        })
        // create compliance rule
        await app.createComplianceRule(result.application.id, ctx)
          .catch((err) => {
            ctx.logger.error({ err }, 'Failed to create compliance rule')
          })

        // send notification to ui
        await app.emitUpdate('icc', {
          topic: 'ui-updates/applications',
          type: 'application-created',
          data: {
            applicationId: result.application.id,
            applicationName: result.application.name
          }
        }).catch((err) => {
          ctx.logger.error({ err }, 'Failed to send notification to ui')
        })
      }
      if (result.isNewDeployment) {
        await app.sendSuccessfulApplicationDeployActivity(
          result.application.id,
          result.application.name,
          result.deployment.imageId,
          ctx
        ).catch((err) => {
          ctx.logger.error({ err }, 'Failed to send activity')
        })
      }

      application = result.application
      deployment = result.deployment
    }

    const [config, httpCacheClientOpts] = await Promise.all([
      app.getApplicationConfig(application, null, ctx),
      app.getValkeyClientOpts(application.id, ctx)
    ])

    const httpCache = { clientOpts: httpCacheClientOpts }
    const iccServices = app.getICCServicesConfigs()

    return { application, config, httpCache, iccServices }
  })

  app.decorate('saveInstance', async (applicationName, imageId, podId, ctx) => {
    const { entities } = app.platformatic

    ctx.logger.debug('Saving a new application instance')

    return app.getGenerationLockTx(async (tx) => {
      ctx = { ...ctx, tx }

      let isNewApplication = false
      let isNewDeployment = false

      let [application, generation] = await Promise.all([
        app.getApplicationByName(applicationName, ctx),
        app.getLatestGeneration(ctx)
      ])

      let deployment = null

      if (application !== null && generation !== null) {
        deployment = await app.getDeploymentByImageId(
          generation.id,
          application.id,
          imageId,
          ctx
        )
      }

      if (application === null) {
        isNewApplication = true
        application = await app.saveApplication(applicationName, ctx)
      }

      if (deployment === null) {
        isNewDeployment = true
        await app.createGeneration(async (newGeneration) => {
          deployment = await entities.deployment.save({
            input: {
              applicationId: application.id,
              applicationStateId: null,
              imageId,
              status: 'starting'
            },
            tx: ctx?.tx
          })
          generation = newGeneration
        }, ctx)
      }

      const instance = await entities.instance.save({
        input: {
          deploymentId: deployment.id,
          applicationId: application.id,
          podId,
          status: 'starting'
        },
        tx
      })

      return {
        isNewApplication,
        isNewDeployment,
        application,
        generation,
        deployment,
        instance
      }
    }, ctx)
  })

  app.decorate('getApplicationInstanceConfig', async (instance, opts, ctx) => {
    const application = await app.getApplicationById(instance.applicationId)
    if (application === null) {
      throw new errors.ApplicationNotFound(instance.applicationId)
    }
    return app.getApplicationConfig(application, opts, ctx)
  })

  app.decorate('saveApplicationInstanceStatus', async (instance, status, ctx) => {
    if (instance.status === status) return

    ctx.logger.debug({ status }, 'Saving app instance status')

    const deployment = await app.getDeploymentById(instance.deploymentId)
    if (deployment === null) {
      throw new errors.DeploymentNotFound(instance.deploymentId)
    }

    const { entities, db } = app.platformatic

    await db.tx(async (tx) => {
      ctx = { ...ctx, tx }

      const updatedInstance = await entities.instance.save({
        input: { id: instance.id, status },
        tx
      })
      ctx.logger.debug(
        { instance: updatedInstance },
        'Saved app instance with a new status'
      )

      await app.updateDeploymentStatus(deployment, ctx)
    })
  })

  app.decorate('saveApplicationInstanceState', async (instance, state, ctx) => {
    ctx.logger.debug({ state }, 'Saving app instance state')

    const deployment = await app.getDeploymentById(instance.deploymentId)
    if (deployment === null) {
      throw new errors.DeploymentNotFound(instance.deploymentId)
    }

    if (deployment.applicationStateId !== null) {
      ctx.logger.debug('Deployment already has an application state')
      return
    }

    const {
      metadata: runtimeMetadata,
      services: servicesMetadata
    } = state

    const services = []
    for (const serviceMetadata of servicesMetadata) {
      services.push({
        id: serviceMetadata.id,
        type: serviceMetadata.type,
        version: serviceMetadata.version,
        entrypoint: serviceMetadata.entrypoint
      })
    }

    const { entities } = app.platformatic

    await app.platformatic.db.tx(async (tx) => {
      const applicationState = await entities.applicationState.save({
        input: {
          applicationId: deployment.applicationId,
          pltVersion: runtimeMetadata.platformaticVersion,
          state: JSON.stringify({ services })
        },
        tx
      })

      ctx.logger.debug({ applicationState }, 'Saved application state')

      await entities.deployment.save({
        input: {
          id: deployment.id,
          applicationStateId: applicationState.id
        },
        tx
      })
    })
  })

  app.decorate('getICCServicesConfigs', () => {
    const { iccServicesUrls } = app
    const iccServicesConfigs = {}

    for (const [name, url] of Object.entries(iccServicesUrls)) {
      iccServicesConfigs[name] = { url }
    }
    return iccServicesConfigs
  })
}, {
  name: 'instances',
  dependencies: ['env', 'cache']
})
