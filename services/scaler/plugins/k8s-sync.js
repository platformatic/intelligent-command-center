'use strict'

const fp = require('fastify-plugin')
const { setTimeout } = require('timers/promises')
const { syncScalerConfigFromLabels } = require('../lib/scaler-config-sync')

module.exports = fp(async function (app) {
  let isServerClosed = false
  const {
    PLT_SCALER_SYNC_K8S = 60
  } = app.platformatic.config

  const syncIntervalSeconds = parseInt(PLT_SCALER_SYNC_K8S, 10)
  const logger = app.log.child({ plugin: 'k8s-sync' })

  logger.info({ syncIntervalSeconds, PLT_SCALER_SYNC_K8S }, 'K8s sync plugin initialized')

  let syncController = null

  async function getMostRecentControllers () {
    const result = await app.platformatic.db.query(app.platformatic.sql`
      SELECT c.*
      FROM controllers c
      INNER JOIN (
        SELECT application_id, MAX(created_at) as max_created_at
        FROM controllers
        GROUP BY application_id
      ) latest ON c.application_id = latest.application_id
      AND c.created_at = latest.max_created_at
      ORDER BY c.created_at DESC
    `)

    return result.rows || result || []
  }

  async function syncControllerData () {
    logger.info('Starting K8s controller sync')

    try {
      const controllers = await getMostRecentControllers()

      if (controllers.length === 0) {
        logger.debug('No controllers found, skipping sync')
        return
      }

      logger.info({
        uniqueApplications: controllers.length
      }, 'Processing most recent controller for each application')

      const k8sPromises = controllers.map(async (controller) => {
        const k8sController = await app.machinist.getController(
          controller.k8s_controller_id,
          controller.namespace,
          controller.api_version,
          controller.kind
        )

        let labels = {}
        try {
          labels = await app.machinist.getControllerLabels(
            controller.k8s_controller_id,
            controller.namespace,
            controller.kind,
            controller.api_version
          )
        } catch (err) {
          logger.debug({
            controllerId: controller.k8s_controller_id,
            err: err.message
          }, 'Failed to get controller labels, continuing without label sync')
        }

        return {
          controller,
          k8sController,
          labels
        }
      })

      const results = await Promise.allSettled(k8sPromises)

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { controller, k8sController, labels } = result.value

          logger.info({
            controllerId: controller.k8s_controller_id,
            namespace: controller.namespace,
            kind: controller.kind,
            currentReplicas: controller.replicas,
            k8sReplicas: k8sController.replicas
          }, 'Controller sync result')

          logger.debug({
            controllerId: controller.k8s_controller_id,
            dbReplicas: controller.replicas,
            k8sReplicas: k8sController.replicas
          }, 'Comparing controller replicas')
          if (controller.replicas !== k8sController.replicas) {
            const oldReplicas = controller.replicas
            const newReplicas = k8sController.replicas
            const replicasDiff = newReplicas - oldReplicas
            const direction = replicasDiff > 0 ? 'up' : 'down'

            logger.info({
              applicationId: controller.application_id,
              controllerId: controller.k8s_controller_id,
              oldReplicas,
              newReplicas,
              replicasDiff,
              direction
            }, 'Replica count changed in k8s, updating ICC database')

            await app.platformatic.entities.controller.save({
              input: {
                id: controller.id,
                applicationId: controller.application_id,
                k8SControllerId: controller.k8s_controller_id,
                namespace: controller.namespace,
                apiVersion: controller.api_version,
                kind: controller.kind,
                replicas: newReplicas
              }
            })

            await app.platformatic.entities.scaleEvent.save({
              input: {
                applicationId: controller.application_id,
                direction,
                replicas: newReplicas,
                replicasDiff: Math.abs(replicasDiff),
                reason: 'sync with k8s controller',
                sync: true
              }
            })

            logger.info({
              applicationId: controller.application_id,
              direction,
              oldReplicas,
              newReplicas
            }, 'Created sync scale event')
          }

          try {
            const result = await syncScalerConfigFromLabels(app, controller.application_id, labels, logger)
            if (result && result.hasChanges) {
              await app.recordConfigActivity(
                controller.application_id,
                result.oldConfig,
                result.newConfig,
                'kubernetes-labels'
              )
            }
          } catch (err) {
            logger.error({
              applicationId: controller.application_id,
              err: err.message
            }, 'Failed to sync scaler config from labels')
          }
        } else {
          logger.error({
            err: result.reason
          }, 'Failed to sync controller from K8s')
        }
      }

      const successCount = results.filter(r => r.status === 'fulfilled').length
      const failureCount = results.filter(r => r.status === 'rejected').length

      logger.info({
        total: controllers.length,
        success: successCount,
        failed: failureCount
      }, 'K8s controller sync completed')
    } catch (err) {
      logger.error({ err }, 'Failed to sync controllers from K8s')
    }
  }

  async function scheduleSync () {
    const { signal } = syncController

    if (signal.aborted) {
      return
    }

    try {
      await setTimeout(syncIntervalSeconds * 1000, null, { signal })
      if (!signal.aborted) {
        logger.info('Executing K8s controller sync')
        try {
          await syncControllerData()
        } catch (err) {
          logger.error({ err }, 'Error in K8s sync execution')
        }
        scheduleSync()
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return
      }
      logger.error({ err }, 'Error in K8s sync, retrying after delay')
      try {
        await setTimeout(1000, null, { signal })
        scheduleSync()
      } catch (delayErr) {
        if (delayErr.name === 'AbortError') {
          return
        }
        logger.error({ err: delayErr }, 'Error in retry delay')
      }
    }
  }

  async function startSync () {
    if ((syncController && !syncController.signal.aborted) || isServerClosed) {
      return
    }

    syncController = new AbortController()
    logger.info({ intervalSeconds: syncIntervalSeconds }, 'Starting K8s sync scheduler')

    scheduleSync()
  }

  async function stopSync () {
    if (syncController) {
      syncController.abort()
      syncController = null
    }
  }

  app.addHook('onClose', async () => {
    isServerClosed = true
    stopSync()
  })

  app.decorate('startK8sSync', startSync)
  app.decorate('stopK8sSync', stopSync)

  async function syncScalerConfigsFromLabels () {
    logger.info('Starting scaler config sync from labels for all controllers')

    try {
      const controllers = await getMostRecentControllers()

      if (!controllers || controllers.length === 0) {
        logger.info('No controllers found for scaler config sync')
        return
      }

      logger.info(`Processing ${controllers.length} most recent controllers for scaler config sync`)

      for (const controller of controllers) {
        try {
          logger.info({
            applicationId: controller.application_id,
            k8SControllerId: controller.k8s_controller_id,
            namespace: controller.namespace,
            kind: controller.kind
          }, 'Processing controller for scaler config sync')

          const labels = await app.machinist.getControllerLabels(
            controller.k8s_controller_id,
            controller.namespace,
            controller.kind,
            controller.api_version
          )

          logger.info({
            applicationId: controller.application_id,
            labels
          }, 'Retrieved labels for controller')

          const result = await syncScalerConfigFromLabels(app, controller.application_id, labels, logger)
          if (result && result.hasChanges) {
            await app.recordConfigActivity(
              controller.application_id,
              result.oldConfig,
              result.newConfig,
              'kubernetes-labels'
            )
          }
        } catch (err) {
          logger.error({
            applicationId: controller.application_id,
            k8SControllerId: controller.k8s_controller_id,
            namespace: controller.namespace,
            error: err.message
          }, 'Failed to sync scaler config for application')
        }
      }

      logger.info('Completed scaler config sync from labels')
    } catch (err) {
      logger.error({
        error: err.message,
        stack: err.stack
      }, 'Failed to sync scaler configs from labels')
    }
  }

  app.decorate('k8sSync', {
    syncControllerData
  })

  app.decorate('syncScalerConfigFromLabels', syncScalerConfigsFromLabels)

  app.ready(async () => {
    logger.info('Running initial scaler config sync from labels')
    await syncScalerConfigsFromLabels()
  })
}, {
  name: 'k8s-sync',
  dependencies: ['env', 'machinist', 'scale-config', 'activities']
})
