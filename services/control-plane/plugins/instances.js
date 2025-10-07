/// <reference path="../global.d.ts" />

'use strict'

const fp = require('fastify-plugin')
const errors = require('./errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  const enableCacheRecommendations = app.env.PLT_FEATURE_CACHE_RECOMMENDATIONS

  app.decorate('getInstanceByPodId', async (podId, namespace) => {
    const instances = await app.platformatic.entities.instance.find({
      where: {
        podId: { eq: podId },
        namespace: { eq: namespace }
      }
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
    namespace,
    apiVersion,
    ctx
  ) => {
    let application = null
    let deployment = null

    ctx.logger.debug({ podId }, 'Getting application instance')

    // Check if pod already exists in database first
    const instance = await app.getInstanceByPodId(podId, namespace)
    if (instance !== null) {
      // Pod exists in DB, get application and deployment info
      ([application, deployment] = await Promise.all([
        app.getApplicationById(instance.applicationId),
        app.getDeploymentById(instance.deploymentId)
      ]))

      // If applicationName was provided in request, validate it matches DB
      if (applicationName && applicationName !== application.name) {
        throw new errors.PodAssignedToDifferentApplication(
          instance.podId,
          application.name
        )
      }

      // Get pod details to check image consistency
      const podDetails = await app.machinist.getPodDetails(
        podId,
        namespace,
        ctx
      )
      const { image: imageId } = podDetails

      if (imageId !== deployment.imageId) {
        throw new errors.PodAssignedToDifferentImage(
          instance.podId,
          deployment.imageId
        )
      }

      ctx.logger.debug({ instance }, 'Got app instance with the same pod id')
    } else {
      // Pod doesn't exist in DB, need to get pod details and resolve application name
      const podDetails = await app.machinist.getPodDetails(
        podId,
        namespace,
        ctx
      )
      const { image: imageId } = podDetails

      // If applicationName is not provided, get it from K8s pod details
      if (!applicationName) {
        ctx.logger.debug({ podId, namespace }, 'Application name not provided, fetching from Kubernetes')
        applicationName = await app.getApplicationNameFromPodDetails(podDetails, podId, ctx)
      } else {
        ctx.logger.debug({ podId, applicationName, method: 'request-body' }, 'Application name provided in request body')
      }

      const result = await app.saveInstance(
        applicationName, imageId, podId, namespace, ctx
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
        await ctx.req.scaler.savePodController({
          applicationId: result.application.id,
          deploymentId: result.deployment.id,
          namespace,
          podId
        }).catch((err) => {
          ctx.logger.error({ err }, 'Failed to save pod controller')
        })

        await app.sendSuccessfulApplicationDeployActivity(
          result.application.id,
          result.application.name,
          result.deployment.imageId,
          ctx
        ).catch((err) => {
          ctx.logger.error({ err }, 'Failed to send activity')
        })
      }

      await app.machinist.setPodLabels(
        podId,
        namespace,
        {
          'platformatic.dev/monitor': 'prometheus',
          'platformatic.dev/application-id': result.application.id,
          'platformatic.dev/deployment-id': result.deployment.id
        },
        ctx
      ).catch((err) => {
        ctx.logger.error({ err }, 'Failed to set pod labels')
      })

      application = result.application
      deployment = result.deployment
    }

    const [config, httpCacheClientOpts] = await Promise.all([
      app.getWattproConfig(application, ctx),
      app.getValkeyClientOpts(application.id, ctx)
    ])

    const httpCache = { clientOpts: httpCacheClientOpts }
    const iccServices = app.getICCServicesConfigs(apiVersion)

    const enableOpenTelemetry = enableCacheRecommendations ?? false
    const enableSlicerInterceptor = enableCacheRecommendations ?? false
    const enableTrafficInterceptor = enableCacheRecommendations ?? false

    return {
      application,
      config,
      httpCache,
      iccServices,
      enableOpenTelemetry,
      enableSlicerInterceptor,
      enableTrafficInterceptor
    }
  })

  app.decorate('saveInstance', async (
    applicationName,
    imageId,
    podId,
    namespace,
    ctx
  ) => {
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
              namespace,
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
          namespace,
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
      const state = {
        id: serviceMetadata.id,
        type: serviceMetadata.type,
        version: serviceMetadata.version,
        entrypoint: serviceMetadata.entrypoint
      }
      if (serviceMetadata.minWorkers) {
        state.minWorkers = serviceMetadata.minWorkers
      }
      if (serviceMetadata.maxWorkers) {
        state.maxWorkers = serviceMetadata.maxWorkers
      }
      if (serviceMetadata.workers) {
        state.workers = serviceMetadata.workers
      }
      services.push(state)
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

      await app.emitUpdate('icc', {
        topic: 'ui-updates/applications',
        type: 'application-state-created',
        data: {
          applicationStateId: applicationState.id,
          state: applicationState.state,
          applicationId: deployment.applicationId
        }
      }).catch((err) => {
        ctx.logger.error({ err }, 'Failed to send notification to ui')
      })
    })
  })

  app.decorate('getICCServicesConfigs', (apiVersion = 'v2') => {
    const { iccServicesUrls } = app
    const iccServicesConfigs = {}

    for (const [name, url] of Object.entries(iccServicesUrls)) {
      // Handle traffic inspector naming based on API version
      if (name === 'trafficInspector') {
        if (apiVersion === 'v2') {
          // For v2, use 'trafficante' as the key name
          iccServicesConfigs.trafficante = { url }
        } else {
          // For v3, use 'trafficInspector' as the key name
          iccServicesConfigs[name] = { url }
        }
      } else {
        iccServicesConfigs[name] = { url }
      }
    }
    return iccServicesConfigs
  })

  app.decorate('getApplicationNameFromPodDetails', async (podDetails, podId, ctx) => {
    ctx.logger.debug({ podId }, 'Getting application name from pod details')

    // Try to get application name from the controller (Deployment/StatefulSet/etc.)
    if (podDetails.controller && podDetails.controller.name) {
      const controller = podDetails.controller
      ctx.logger.debug({
        podId,
        controllerName: controller.name,
        controllerKind: controller.kind,
        hasLabels: !!controller.metadata?.labels
      }, 'Found controller in pod details')

      // Use the controller name directly as the application name
      return controller.name
    } else {
      ctx.logger.debug({ podId }, 'No controller found in pod details')
    }

    ctx.logger.warn({ podId }, 'Could not determine application name from Kubernetes metadata')
    throw new errors.ApplicationNameNotFound(podId)
  })
}, {
  name: 'instances',
  dependencies: ['env', 'cache']
})
