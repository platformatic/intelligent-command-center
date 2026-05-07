/// <reference path="../global.d.ts" />

'use strict'

const { request } = require('undici')
const fp = require('fastify-plugin')
const errors = require('./errors')
const { getK8sToken, k8sAuthHeaders } = require('../lib/k8s-auth')

async function registerWorkflowApp (appName, namespace, { workflowUrl, log, machineId, deploymentVersion, serviceName, servicePort }) {
  if (!workflowUrl || !getK8sToken()) return

  const headers = {
    'content-type': 'application/json',
    ...k8sAuthHeaders()
  }

  // Create the application (idempotent: 201 if new, 200 if exists)
  const createRes = await request(`${workflowUrl}/api/v1/apps`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ appId: appName })
  })
  await createRes.body.dump()

  if (createRes.statusCode !== 201 && createRes.statusCode !== 200) {
    log.warn({ appName, statusCode: createRes.statusCode }, 'failed to register workflow app')
    return
  }

  // Create K8s binding (idempotent: upsert via ON CONFLICT)
  const bindRes = await request(`${workflowUrl}/api/v1/apps/${encodeURIComponent(appName)}/k8s-binding`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ namespace, serviceAccount: 'default' })
  })
  await bindRes.body.dump()

  if (bindRes.statusCode !== 201) {
    log.warn({ appName, namespace, statusCode: bindRes.statusCode }, 'failed to create workflow k8s binding')
    return
  }

  // Register queue handler so the workflow service can dispatch messages to this machine.
  // The base URL uses the K8s FQDN so cross-namespace dispatch works.
  if (machineId && deploymentVersion && serviceName && servicePort) {
    const baseUrl = `http://${serviceName}.${namespace}.svc.cluster.local:${servicePort}`
    const handlerRes = await request(`${workflowUrl}/api/v1/apps/${encodeURIComponent(appName)}/handlers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        machineId,
        deploymentVersion,
        endpoints: {
          workflow: `${baseUrl}/.well-known/workflow/v1/flow`,
          step: `${baseUrl}/.well-known/workflow/v1/step`,
          webhook: `${baseUrl}/.well-known/workflow/v1/webhook`
        }
      })
    })
    await handlerRes.body.dump()

    if (handlerRes.statusCode !== 201) {
      log.warn({ appName, machineId, statusCode: handlerRes.statusCode }, 'failed to register workflow queue handler')
    } else {
      log.info({ appName, machineId, deploymentVersion, baseUrl }, 'registered workflow queue handler')
    }
  }

  log.info({ appName, namespace }, 'registered workflow app with workflow service')
}

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  const enableCacheRecommendations = app.env.PLT_FEATURE_CACHE_RECOMMENDATIONS
  const scalerVersion = app.env.PLT_SCALER_ALGORITHM_VERSION

  app.decorate('getInstanceByMachineId', async (machineId, namespace) => {
    const instances = await app.platformatic.entities.instance.find({
      where: {
        machineId: { eq: machineId },
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
    machineId,
    namespace,
    apiVersion,
    ctx
  ) => {
    let application = null
    let deployment = null

    ctx.logger.debug({ machineId }, 'Getting application instance')

    // Check if machine already exists in database first
    const instance = await app.getInstanceByMachineId(machineId, namespace)
    if (instance !== null) {
      // Machine exists in DB, get application and deployment info
      ([application, deployment] = await Promise.all([
        app.getApplicationById(instance.applicationId),
        app.getDeploymentById(instance.deploymentId)
      ]))

      // If applicationName was provided in request, validate it matches DB
      if (applicationName && applicationName !== application.name) {
        throw new errors.MachineAssignedToDifferentApplication(
          instance.machineId,
          application.name
        )
      }

      // Get machine details to check image consistency
      const machineDetails = await app.machinist.getMachine(
        namespace,
        machineId,
        ctx
      )
      const { image: imageId } = machineDetails

      if (imageId !== deployment.imageId) {
        throw new errors.MachineAssignedToDifferentImage(
          instance.machineId,
          deployment.imageId
        )
      }

      ctx.logger.debug({ instance }, 'Got app instance with the same machine id')
    } else {
      // Machine doesn't exist in DB, need to get machine details and resolve application name
      const machineDetails = await app.machinist.getMachine(
        namespace,
        machineId,
        ctx
      )
      const { image: imageId } = machineDetails

      // Skew protection: detect version metadata from K8s labels
      let versionMeta = null
      const skewProtectionEnabled = app.env.PLT_FEATURE_SKEW_PROTECTION
      if (skewProtectionEnabled) {
        const appLabel = machineDetails.labels?.['app.kubernetes.io/name']
        const versionLabel = machineDetails.labels?.['plt.dev/version']
        const hostnameLabel = machineDetails.labels?.['plt.dev/hostname']
        const pathLabel = machineDetails.labels?.['plt.dev/path']
        const workflowLabel = machineDetails.labels?.['plt.dev/workflow']
        const expirePolicyLabel = workflowLabel === 'true'
          ? 'workflow'
          : machineDetails.labels?.['plt.dev/expire-policy']

        if (appLabel) {
          // For non-versioned deploys, derive version from the image tag
          const effectiveVersionLabel = versionLabel || (imageId?.includes(':') ? imageId.split(':').pop() : null)

          if (effectiveVersionLabel) {
            const controllerName = machineDetails.controller?.name
            // When looking up the K8s Service, only filter by version label
            // if the machine actually has one (non-versioned machines have a Service
            // without the plt.dev/version label).
            const svcLabels = { 'app.kubernetes.io/name': appLabel }
            if (versionLabel) svcLabels['plt.dev/version'] = versionLabel
            const services = await app.machinist.getServicesByLabels(
              namespace,
              svcLabels,
              ctx
            ).catch(err => {
              ctx.logger.error({ err }, 'Failed to get services for version detection')
              return []
            })
            const service = services[0]
            const serviceName = service?.name
            const servicePort = service?.ports?.[0]?.port

            if (serviceName && servicePort) {
              const pathPrefix = pathLabel || (hostnameLabel ? '/' : `/${appLabel}`)

              versionMeta = {
                appLabel,
                versionLabel: effectiveVersionLabel,
                controllerName,
                serviceName,
                servicePort,
                pathPrefix,
                hostname: hostnameLabel || null,
                expirePolicy: expirePolicyLabel || 'http-traffic'
              }

              ctx.logger.info({
                appLabel, versionLabel: effectiveVersionLabel, controllerName, serviceName, servicePort, pathPrefix, hostname: hostnameLabel, autoVersioned: !versionLabel
              }, 'detected version metadata')
            }
          }
        }
      }

      // Skew protection: use appLabel as ICC application name so versioned
      // and non-versioned deploys share the same ICC application record.
      if (versionMeta) {
        applicationName = versionMeta.appLabel
        ctx.logger.debug({ machineId, applicationName, method: 'version-meta' }, 'Using appLabel as application name')
      }

      // If applicationName is not provided, derive it from machine details
      if (!applicationName) {
        ctx.logger.debug({ machineId, namespace }, 'Application name not provided, fetching from machine details')
        applicationName = await app.getApplicationNameFromMachineDetails(machineDetails, machineId, ctx)
      } else {
        ctx.logger.debug({ machineId, applicationName, method: 'request-body' }, 'Application name provided in request body')
      }

      const result = await app.saveInstance(
        applicationName, imageId, machineId, namespace, ctx
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

      // Register workflow apps with the workflow service (idempotent, safe to call on every machine).
      const isWorkflowApp = machineDetails.labels?.['plt.dev/workflow'] === 'true'
      if (isWorkflowApp) {
        // For versioned deploys use version metadata; for non-versioned look up service directly
        let svcName = versionMeta?.serviceName
        let svcPort = versionMeta?.servicePort
        // Use version label when available; for non-versioned machines derive from
        // the image tag (matching the auto-version logic in initApplicationInstance)
        // so that workflow runs are tagged with the same version ICC will use.
        const imageTag = (imageId || '').includes(':') ? imageId.split(':').pop() : null
        const depVersion = versionMeta?.versionLabel || machineDetails.labels?.['plt.dev/version'] || imageTag || 'local'

        if (!svcName || !svcPort) {
          const appLabel = machineDetails.labels?.['app.kubernetes.io/name']
          if (appLabel) {
            const services = await app.machinist.getServicesByLabels(
              namespace,
              { 'app.kubernetes.io/name': appLabel },
              ctx
            ).catch(err => {
              ctx.logger.error({ err }, 'Failed to get services for workflow handler')
              return []
            })
            const service = services[0]
            svcName = service?.name
            svcPort = service?.ports?.[0]?.port
          }
        }

        await registerWorkflowApp(applicationName, namespace, {
          workflowUrl: app.env.PLT_WORKFLOW_URL,
          log: ctx.logger,
          machineId,
          deploymentVersion: depVersion,
          serviceName: svcName,
          servicePort: svcPort
        }).catch((err) => {
          ctx.logger.error({ err, applicationName }, 'Failed to register workflow app')
        })
      }

      if (result.isNewDeployment) {
        await ctx.req.scaler.saveMachineController({
          applicationId: result.application.id,
          deploymentId: result.deployment.id,
          namespace,
          machineId
        }).catch((err) => {
          ctx.logger.error({ err }, 'Failed to save machine controller')
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

      await app.machinist.setMachineLabels(
        namespace,
        machineId,
        {
          'platformatic.dev/monitor': 'prometheus',
          'platformatic.dev/application-id': result.application.id,
          'platformatic.dev/deployment-id': result.deployment.id
        },
        ctx
      ).catch((err) => {
        ctx.logger.error({ err }, 'Failed to set machine labels')
      })

      // Skew protection: persist version and apply HTTPRoute
      if (versionMeta && app.registerVersion) {
        const { appLabel, versionLabel, controllerName, serviceName, servicePort, pathPrefix, hostname, expirePolicy } = versionMeta

        // Auto-create version for pre-existing non-versioned deployment.
        // When the first versioned machine registers, check if there are older
        // non-versioned machines for the same app. If so, create a synthetic
        // version registry entry so the old deployment enters the normal
        // draining lifecycle.
        const existingVersions = await app.platformatic.entities.versionRegistry.find({
          where: { appLabel: { eq: appLabel } }
        })

        // Auto-create version for pre-existing non-versioned deployment.
        // When a versioned machine registers, check if there are older
        // non-versioned machines for the same app that don't have a version
        // registry entry yet. If so, create a synthetic entry so the old
        // deployment enters the normal draining lifecycle.
        try {
          const machines = await app.machinist.getMachines(namespace, { 'app.kubernetes.io/name': appLabel }, ctx)
          const nonVersionedMachines = (machines || []).filter(
            p => !p.labels?.['plt.dev/version']
          )

          if (nonVersionedMachines.length > 0) {
            const oldMachine = nonVersionedMachines[0]
            const oldImage = oldMachine.image || ''
            const oldVersionLabel = oldImage.includes(':') ? oldImage.split(':').pop() : oldImage

            // Check if this non-versioned deployment already has a version entry
            const alreadyRegistered = existingVersions.some(v => v.versionLabel === oldVersionLabel)

            if (!alreadyRegistered) {
              const oldControllerName = oldMachine.controller?.name

              // Find the non-versioned Service by metadata labels
              // (getMachines only returns machines, not services)
              const nonVersionedServices = await app.machinist.getServicesByLabels(
                namespace,
                { 'app.kubernetes.io/name': appLabel },
                ctx
              ).catch(err => {
                ctx.logger.error({ err }, 'Failed to get services for non-versioned detection')
                return []
              })
              const oldService = nonVersionedServices.filter(
                s => !s.labels?.['plt.dev/version']
              )[0]
              const oldServiceName = oldService?.name
              const oldServicePort = oldService?.ports?.[0]?.port

              if (oldControllerName && oldServiceName && oldServicePort) {
                // Find the non-versioned machine's ICC deployment ID
                let oldDeploymentId = result.deployment.id
                const oldInstances = await app.platformatic.entities.instance.find({
                  where: { machineId: { eq: oldMachine.id } }
                })
                if (oldInstances.length > 0) {
                  oldDeploymentId = oldInstances[0].deploymentId
                }

                ctx.logger.info({
                  appLabel,
                  oldVersionLabel,
                  oldControllerName,
                  oldServiceName
                }, 'auto-creating version for pre-existing non-versioned deployment')

                await app.registerVersion({
                  applicationId: result.application.id,
                  deploymentId: oldDeploymentId,
                  appLabel,
                  versionLabel: oldVersionLabel,
                  controllerName: oldControllerName,
                  serviceName: oldServiceName,
                  servicePort: oldServicePort,
                  namespace,
                  pathPrefix,
                  hostname,
                  expirePolicy
                }, ctx)
              }
            }
          }
        } catch (err) {
          ctx.logger.error({ err }, 'Failed to auto-create version for non-versioned deployment')
        }

        const { activeVersion, drainingVersions } = await app.registerVersion({
          applicationId: result.application.id,
          deploymentId: result.deployment.id,
          appLabel,
          versionLabel,
          controllerName,
          serviceName,
          servicePort,
          namespace,
          pathPrefix,
          hostname,
          expirePolicy
        }, ctx)

        if (activeVersion && app.applyHTTPRoute) {
          await app.applyHTTPRoute({
            appName: appLabel,
            namespace,
            pathPrefix,
            hostname,
            productionVersion: activeVersion,
            drainingVersions,
            applicationId: result.application.id
          }, ctx).catch(err => {
            ctx.logger.error({ err }, 'Failed to apply HTTPRoute')
          })
        }
      }

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

    const scaler = {
      version: scalerVersion
    }

    return {
      application,
      config,
      scaler,
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
    machineId,
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

        await app.emitUpdate('icc', {
          topic: 'ui-updates/applications',
          type: 'deployment-created',
          data: {
            deploymentId: deployment.id,
            applicationId: application.id
          }
        }).catch((err) => {
          ctx.logger.error({ err }, 'Failed to send notification to ui')
        })
      }

      const instance = await entities.instance.save({
        input: {
          deploymentId: deployment.id,
          applicationId: application.id,
          machineId,
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

  app.decorate('getApplicationNameFromMachineDetails', async (machineDetails, machineId, ctx) => {
    ctx.logger.debug({ machineId }, 'Getting application name from machine details')

    // Try to get application name from the controller (Deployment/StatefulSet/Service/etc.)
    if (machineDetails.controller && machineDetails.controller.name) {
      const controller = machineDetails.controller
      ctx.logger.debug({
        machineId,
        controllerName: controller.name,
        hasLabels: !!controller.metadata?.labels
      }, 'Found controller in machine details')

      // Use the controller name directly as the application name
      return controller.name
    } else {
      ctx.logger.debug({ machineId }, 'No controller found in machine details')
    }

    ctx.logger.warn({ machineId }, 'Could not determine application name from machine metadata')
    throw new errors.ApplicationNameNotFound(machineId)
  })
}, {
  name: 'instances',
  dependencies: ['env', 'cache']
})
