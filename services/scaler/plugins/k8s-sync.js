'use strict'

const fp = require('fastify-plugin')
const { setTimeout } = require('timers/promises')

module.exports = fp(async function (app) {
  let isServerClosed = false
  const {
    PLT_SCALER_SYNC_K8S = 60
  } = app.platformatic.config

  const syncIntervalSeconds = parseInt(PLT_SCALER_SYNC_K8S, 10)
  const logger = app.log.child({ plugin: 'k8s-sync' })

  logger.info({ syncIntervalSeconds, PLT_SCALER_SYNC_K8S }, 'K8s sync plugin initialized')

  let syncController = null

  async function syncControllerData () {
    logger.info('Starting K8s controller sync')

    try {
      const controllers = await app.platformatic.entities.controller.find()

      if (controllers.length === 0) {
        logger.debug('No controllers found, skipping sync')
        return
      }

      const k8sPromises = controllers.map(async (controller) => {
        const k8sController = await app.machinist.getController(
          controller.k8SControllerId,
          controller.namespace,
          controller.apiVersion,
          controller.kind
        )
        return {
          controller,
          k8sController
        }
      })

      const results = await Promise.allSettled(k8sPromises)

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { controller, k8sController } = result.value

          logger.info({
            controllerId: controller.k8SControllerId,
            namespace: controller.namespace,
            kind: controller.kind,
            currentReplicas: controller.replicas,
            k8sReplicas: k8sController.replicas
          }, 'Controller sync result')

          logger.debug({
            controllerId: controller.k8SControllerId,
            dbReplicas: controller.replicas,
            k8sReplicas: k8sController.replicas
          }, 'Comparing controller replicas')
          if (controller.replicas !== k8sController.replicas) {
            const oldReplicas = controller.replicas
            const newReplicas = k8sController.replicas
            const replicasDiff = newReplicas - oldReplicas
            const direction = replicasDiff > 0 ? 'up' : 'down'

            logger.info({
              applicationId: controller.applicationId,
              controllerId: controller.k8SControllerId,
              oldReplicas,
              newReplicas,
              replicasDiff,
              direction
            }, 'Replica count changed in k8s, updating ICC database')

            await app.platformatic.entities.controller.save({
              input: {
                ...controller,
                replicas: newReplicas
              }
            })

            await app.platformatic.entities.scaleEvent.save({
              input: {
                applicationId: controller.applicationId,
                direction,
                replicas: newReplicas,
                replicasDiff: Math.abs(replicasDiff),
                reason: 'sync with k8s controller',
                sync: true
              }
            })

            logger.info({
              applicationId: controller.applicationId,
              direction,
              oldReplicas,
              newReplicas
            }, 'Created sync scale event')
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

  async function startSync () {
    try {
      if ((syncController && !syncController.signal.aborted) || isServerClosed) {
        return
      }

      syncController = new AbortController()
      const { signal } = syncController

      logger.info({ intervalSeconds: syncIntervalSeconds }, 'Starting K8s sync scheduler')

      while (!signal.aborted) {
        try {
          await setTimeout(syncIntervalSeconds * 1000, null, { signal })
          if (!signal.aborted) {
            logger.info('Executing K8s controller sync')
            try {
              await syncControllerData()
            } catch (err) {
              logger.error({ err }, 'Error in K8s sync execution')
            }
          }
        } catch (err) {
          if (err.name === 'AbortError') {
            break
          }
          logger.error({ err }, 'Error in K8s sync loop, retrying after delay')
          try {
            await setTimeout(1000, null, { signal })
          } catch (delayErr) {
            if (delayErr.name === 'AbortError') {
              break
            }
            logger.error({ err: delayErr }, 'Error in retry delay')
          }
        }
      }
    } catch (err) {
      logger.error({ err }, 'Failed to start K8s sync')
    }
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

  app.decorate('k8sSync', {
    syncControllerData
  })
}, {
  name: 'k8s-sync',
  dependencies: ['env', 'machinist']
})
