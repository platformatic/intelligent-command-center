/// <reference path="../global.d.ts" />

'use strict'

const fp = require('fastify-plugin')
const errors = require('./errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  app.decorate('getDetectedPodByPodId', async (podId) => {
    const detectedPods = await app.platformatic.entities.detectedPod.find({
      where: { podId: { eq: podId } }
    })
    return detectedPods.length === 1 ? detectedPods[0] : null
  })

  app.decorate('getDeploymentDetectedPods', async (deploymentId, ctx) => {
    const detectedPods = await app.platformatic.entities.detectedPod.find({
      where: { deploymentId: { eq: deploymentId } },
      tx: ctx?.tx
    })
    return detectedPods
  })

  app.decorate('initZioPod', async (applicationName, imageId, podId, ctx) => {
    let application = null
    let deployment = null

    ctx.logger.debug({ podId }, 'Getting detected pod')

    const detectedPod = await app.getDetectedPodByPodId(podId)
    if (detectedPod !== null) {
      ([application, deployment] = await Promise.all([
        app.getApplicationById(detectedPod.applicationId),
        app.getDeploymentById(detectedPod.deploymentId)
      ]))
      if (applicationName !== application.name) {
        throw new errors.PodAssignedToDifferentApplication(
          detectedPod.podId,
          application.name
        )
      }
      if (imageId !== deployment.imageId) {
        throw new errors.PodAssignedToDifferentImage(
          detectedPod.podId,
          deployment.imageId
        )
      }
      ctx.logger.debug({ detectedPod }, 'Got detected with the same pod id')
    } else {
      ({ application, deployment } = await app.saveDetectedPod(
        applicationName, imageId, podId, ctx
      ))
    }

    const [config, httpCacheClientOpts] = await Promise.all([
      app.getApplicationConfig(application, null, ctx),
      app.getRedisCacheClientOpts(application.id, imageId, ctx)
    ])

    const httpCache = { clientOpts: httpCacheClientOpts }
    const iccServices = app.getICCServicesConfigs()

    return { application, config, httpCache, iccServices }
  })

  app.decorate('saveDetectedPod', async (applicationName, imageId, podId, ctx) => {
    const { entities } = app.platformatic

    ctx.logger.debug('Saving a new detected pod')

    return app.getGenerationLockTx(async (tx) => {
      ctx = { ...ctx, tx }

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
        application = await app.saveApplication(applicationName, ctx)
      }

      if (deployment === null) {
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

      const detectedPod = await entities.detectedPod.save({
        input: {
          deploymentId: deployment.id,
          applicationId: application.id,
          podId,
          status: 'starting'
        },
        tx
      })

      return { application, generation, deployment, detectedPod }
    }, ctx)
  })

  app.decorate('getZioConfig', async (detectedPod, opts, ctx) => {
    const application = await app.getApplicationById(detectedPod.applicationId)
    if (application === null) {
      throw new errors.ApplicationNotFound(detectedPod.applicationId)
    }
    return app.getApplicationConfig(application, opts, ctx)
  })

  app.decorate('saveZioStatus', async (detectedPod, status, ctx) => {
    if (detectedPod.status === status) return

    ctx.logger.debug({ status }, 'Saving detected pod status')

    const deployment = await app.getDeploymentById(detectedPod.deploymentId)
    if (deployment === null) {
      throw new errors.DeploymentNotFound(detectedPod.deploymentId)
    }

    const { entities, db } = app.platformatic

    await db.tx(async (tx) => {
      ctx = { ...ctx, tx }

      const updatedPod = await entities.detectedPod.save({
        input: { id: detectedPod.id, status },
        tx
      })
      ctx.logger.debug(
        { detectedPod: updatedPod },
        'Saved detected pod with a new status'
      )

      await app.updateDeploymentStatus(deployment, ctx)
    })
  })

  app.decorate('saveZioState', async (detectedPod, state, ctx) => {
    ctx.logger.debug({ state }, 'Saving detected pod state')

    const deployment = await app.getDeploymentById(detectedPod.deploymentId)
    if (deployment === null) {
      throw new errors.DeploymentNotFound(detectedPod.deploymentId)
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
}, { name: 'detected-pods' })
