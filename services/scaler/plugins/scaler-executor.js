'use strict'

const fp = require('fastify-plugin')
const ReactiveScalingAlgorithm = require('../lib/reactive-scaling-algorithm')
const { getApplicationName } = require('../lib/executor-utils')

class ScalerExecutor {
  constructor (app) {
    this.app = app

    const options = {
      maxHistoryEvents: Number(app.env.PLT_SCALER_MAX_HISTORY),
      maxClusters: Number(app.env.PLT_SCALER_MAX_CLUSTERS),
      heapThreshold: Number(app.env.PLT_SCALER_HEAP_THRESHOLD),
      postScalingWindow: Number(app.env.PLT_SCALER_POST_EVAL_WINDOW),
      // scaleUpCooldownPeriod: Number(app.env.PLT_SCALER_COOLDOWN),
      scaleUpCooldownPeriod: 15, // Temporary override
      // eluThreshold: Number(app.env.PLT_SCALER_ELU_THRESHOLD),
      eluThreshold: 0.8, // Temporary override
      minPodsDefault: Number(app.env.PLT_SCALER_MIN_PODS_DEFAULT),
      maxPodsDefault: Number(app.env.PLT_SCALER_MAX_PODS_DEFAULT)
    }

    this.scalingAlgorithm = new ReactiveScalingAlgorithm(app, options)
  }

  async getCurrentPodCount (applicationId) {
    const controller = await this.app.getApplicationController(applicationId)
    if (!controller) {
      this.app.log.error({ applicationId }, 'No controller found for application')
      throw new Error('No controller found for application: ' + applicationId)
    }
    return controller.replicas
  }

  async getScaleConfig (applicationId) {
    try {
      const scaleConfig = await this.app.getScaleConfig(applicationId)
      if (scaleConfig) {
        const { minPods, maxPods } = scaleConfig
        this.app.log.info({ applicationId, minPods, maxPods }, 'Retrieved scale config')
        return { minPods, maxPods }
      }
    } catch (err) {
      this.app.log.warn({ err, applicationId }, 'Error retrieving scale config, using defaults')
    }

    return { minPods: undefined, maxPods: undefined }
  }

  async #calculateAndApplyScaling (applicationId, podsMetrics, alerts = [], logContext = {}) {
    const currentPodCount = await this.getCurrentPodCount(applicationId)
    const { minPods, maxPods } = await this.getScaleConfig(applicationId)
    const applicationName = await getApplicationName(applicationId, this.app.log)

    const result = await this.scalingAlgorithm.calculateScalingDecision(
      applicationId,
      podsMetrics,
      currentPodCount,
      minPods,
      maxPods,
      alerts,
      applicationName
    )

    // Log scaling decision with clear action and reason
    const scalingAction = result.nfinal > currentPodCount
      ? 'SCALE UP'
      : result.nfinal < currentPodCount ? 'SCALE DOWN' : 'NO CHANGE'

    const logMessage = result.nfinal !== currentPodCount
      ? `Scaling decision: ${scalingAction} from ${currentPodCount} to ${result.nfinal} pods`
      /* c8 ignore next */
      : `Scaling decision: ${scalingAction} - ${result.reason || 'Algorithm determined no scaling needed'}`

    this.app.log.info({
      ...logContext,
      applicationId,
      nfinal: result.nfinal,
      currentPodCount,
      action: scalingAction,
      reason: result.reason,
      source: alerts.length > 0 ? 'alerts' : 'metrics'
    }, logMessage)

    if (result.nfinal !== currentPodCount) {
      const direction = result.nfinal > currentPodCount ? 'up' : 'down'
      await this.app.store.saveLastScalingTime(applicationId, Date.now(), direction)

      const { scaleEvent } = await this.executeScaling(
        applicationId,
        result.nfinal,
        result.reason
      )

      if (scaleEvent && alerts.length > 0) {
        await this.app.platformatic.entities.alert.updateMany({
          where: {
            id: { in: alerts.map(a => a.id) },
            scaleEventId: { eq: null }
          },
          input: { scaleEventId: scaleEvent.id }
        }).catch(err => {
          this.app.log.error({ err, alerts, scaleEvent }, 'Failed to set scale event id on alerts')
        })
      }
    }

    return {
      result,
      currentPodCount,
      scaled: result.nfinal !== currentPodCount
    }
  }

  async checkScalingOnAlert ({ podId, serviceId } = {}) {
    this.app.log.info({ podId, serviceId }, 'Calculating scaling after alert from pod')

    if (!podId || !serviceId) {
      this.app.log.error('Pod ID and service ID are required for scaling decision')
      return { success: false, timestamp: Date.now(), error: 'Pod ID is required' }
    }

    try {
      const alerts = await this.app.store.getAlertsByPodId(podId)
      if (!alerts || alerts.length === 0) {
        this.app.log.info({ podId }, 'No alerts found for pod')
        return { success: true, podId, timestamp: Date.now(), nfinal: 0, reason: 'No alerts found' }
      }

      const applicationId = alerts[0].applicationId
      if (!applicationId) {
        this.app.log.warn({ podId, alerts }, 'Missing applicationId in alerts')
        return { success: false, podId, timestamp: Date.now(), error: 'Missing applicationId' }
      }

      const podsMetrics = await this.app?.scalerMetrics?.getApplicationMetrics(applicationId)
      if (!podsMetrics || Object.keys(podsMetrics).length === 0) {
        this.app.log.warn({ podId, applicationId }, 'No metrics found for application')
        return { success: false, podId, applicationId, timestamp: Date.now(), error: 'No metrics found' }
      }

      const { result, scaled } = await this.#calculateAndApplyScaling(
        applicationId,
        podsMetrics,
        alerts,
        { podId, serviceId }
      )

      return {
        success: true,
        podId,
        applicationId,
        timestamp: Date.now(),
        nfinal: result.nfinal,
        scaled
      }
    } catch (err) {
      this.app.log.error({ err, podId }, 'Error calculating scaling decision')
      return { success: false, timestamp: Date.now(), error: err.message }
    }
  }

  applyScaleConstraints (targetPods, minPods, maxPods) {
    const effectiveMin = minPods || 1
    const effectiveMax = maxPods || Number.MAX_SAFE_INTEGER
    return Math.max(effectiveMin, Math.min(effectiveMax, targetPods))
  }

  async executeScaling (applicationId, podsNumber, reason = null) {
    this.app.log.info({ applicationId, podsNumber, reason }, 'Executing scaling operation')
    try {
      const { scaleEvent } = await this.app.updateControllerReplicas(
        applicationId,
        podsNumber,
        reason
      )

      return {
        success: true,
        applicationId,
        podsNumber,
        scaleEvent,
        timestamp: Date.now()
      }
    } catch (err) {
      this.app.log.error({ err, applicationId, podsNumber }, 'Error executing scaling operation')
      return {
        success: false,
        applicationId,
        podsNumber,
        scaleEvent: null,
        timestamp: Date.now(),
        error: err.message
      }
    }
  }

  async checkScalingOnMetrics () {
    this.app.log.info('Checking scaling based on metrics for all applications')
    if (!this.app.scalerMetrics) {
      // This shouln't happen, except in unit tests
      this.app.log.error('Scaler metrics plugin is not available')
      return {
        success: false,
        periodic: true,
        timestamp: Date.now(),
        error: 'Scaler metrics plugin is not available'
      }
    }

    try {
      const allApplicationsMetrics = await this.app.scalerMetrics.getAllApplicationsMetrics()

      if (!allApplicationsMetrics || Object.keys(allApplicationsMetrics).length === 0) {
        this.app.log.info('No metrics found for any application')
        return {
          success: true,
          periodic: true,
          timestamp: Date.now(),
          message: 'No application metrics found'
        }
      }

      const results = []

      for (const applicationId of Object.keys(allApplicationsMetrics)) {
        try {
          if (applicationId === 'unknown') {
            continue
          }

          const podsMetrics = allApplicationsMetrics[applicationId]

          const { result, currentPodCount, scaled } = await this.#calculateAndApplyScaling(
            applicationId,
            podsMetrics
          )

          results.push({
            applicationId,
            currentPodCount,
            newPodCount: result.nfinal,
            scaled
          })
        } catch (err) {
          this.app.log.error({ err, applicationId }, 'Error processing application for metric-based scaling')
          results.push({
            applicationId,
            error: err.message
          })
        }
      }

      return {
        success: true,
        periodic: true,
        timestamp: Date.now(),
        results
      }
    } catch (err) {
      this.app.log.error({ err }, 'Error checking scaling based on metrics')
      return {
        success: false,
        periodic: true,
        timestamp: Date.now(),
        error: err.message
      }
    }
  }
}

async function plugin (app) {
  const executor = new ScalerExecutor(app)
  app.decorate('scalerExecutor', executor)
}

module.exports = fp(plugin, {
  name: 'scaler-executor',
  dependencies: ['store', 'metrics', 'scale-config']
})
