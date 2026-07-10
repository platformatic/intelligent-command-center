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

  // Create an application (plus its default config) with no deployment yet.
  // saveApplication needs the generation lock, so acquire it here.
  app.decorate('createApplicationWithoutDeployment', async (name, ctx) => {
    const application = await app.getGenerationLockTx(async (tx) => {
      return app.saveApplication(name, { ...ctx, tx })
    }, ctx)

    await app.emitUpdate('icc', {
      topic: 'ui-updates/applications',
      type: 'application-created',
      data: { applicationId: application.id, applicationName: application.name }
    }).catch((err) => {
      ctx.logger.error({ err }, 'Failed to send notification to ui')
    })

    return application
  })

  app.decorate('getApplicationK8sState', async (application, ctx) => {
    const deployment = await app.getLatestDeployment(application.id, ctx)
    if (deployment === null) {
      throw new errors.DeploymentNotFound(application.id)
    }

    const namespace = deployment.namespace
    const labels = {
      'platformatic.dev/application-id': application.id
    }

    const machines = await app.machinist.getMachines(namespace, labels, ctx)

    // Resolve each pod's version by its workload (app.kubernetes.io/instance = the
    // Deployment/Service name) via the version registry, which records controllerName
    // per version. Authoritative and image-format independent, and it works for
    // non-versioned pods (which carry no plt.dev/version label) -- otherwise the
    // version-filtered pods view (autoscaler) drops every pod and shows 0.
    const versions = await app.listVersions(application.id)
    const versionByController = new Map()
    for (const v of versions) {
      if (v.controllerName) versionByController.set(v.controllerName, v.versionLabel)
      if (v.serviceName) versionByController.set(v.serviceName, v.versionLabel)
    }

    const pods = []
    for (const machine of machines) {
      const instance = machine.labels?.['app.kubernetes.io/instance']
      pods.push({
        id: machine.id,
        status: machine.status,
        startTime: machine.startTime,
        resources: machine.resources,
        versionLabel: machine.labels?.['plt.dev/version'] || versionByController.get(instance)
      })
    }

    return { pods }
  })
})
