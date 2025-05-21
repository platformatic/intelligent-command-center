'use strict'

const fp = require('fastify-plugin')
const ScalingAlgorithm = require('../lib/scaling-algorithm')

class ScalerExecutor {
  constructor (app) {
    this.app = app

    const options = {
      maxHistoryEvents: Number(process.env.PLT_SCALER_MAX_HISTORY) || 10,
      maxClusters: Number(process.env.PLT_SCALER_MAX_CLUSTERS) || 5,
      eluThreshold: Number(process.env.PLT_SCALER_ELU_THRESHOLD) || 0.9,
      heapThreshold: Number(process.env.PLT_SCALER_HEAP_THRESHOLD) || 0.85,
      postScalingWindow: Number(process.env.PLT_SCALER_POST_EVAL_WINDOW) || 300,
      cooldownPeriod: Number(process.env.PLT_SCALER_COOLDOWN) || 300,
      minPodsDefault: Number(process.env.PLT_SCALER_MIN_PODS_DEFAULT) || 1,
      maxPodsDefault: Number(process.env.PLT_SCALER_MAX_PODS_DEFAULT) || 10
    }

    this.scalingAlgorithm = new ScalingAlgorithm(app.store, app.log, options)
  }

  async #getCurrentPodCount (applicationId) {
    try {
      const controller = await this.app.getApplicationController(applicationId)
      return controller ? controller.replicas : 1
    } catch (err) {
      this.app.log.error({ err, applicationId }, 'Error retrieving controller information')
      return 1
    }
  }

  async #getScaleConfig (applicationId) {
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
    const currentPodCount = await this.#getCurrentPodCount(applicationId)
    const { minPods, maxPods } = await this.#getScaleConfig(applicationId)

    const result = await this.scalingAlgorithm.calculateScalingDecision(
      applicationId,
      podsMetrics,
      currentPodCount,
      minPods,
      maxPods,
      alerts
    )

    this.app.log.info({
      ...logContext,
      applicationId,
      nfinal: result.nfinal,
      currentPodCount
    }, `Scaling decision calculated${alerts.length > 0 ? ' from alerts' : ' from metrics'}`)

    if (result.nfinal !== currentPodCount) {
      await this.executeScaling(applicationId, result.nfinal)
    }

    return {
      result,
      currentPodCount,
      scaled: result.nfinal !== currentPodCount
    }
  }

  async checkScalingOnAlert (podId) {
    this.app.log.info({ podId }, 'Calculating scaling after alert from pod')

    if (!podId) {
      this.app.log.error('Pod ID is required for scaling decision')
      return { success: false, timestamp: Date.now(), error: 'Pod ID is required' }
    }

    try {
      const alerts = await this.app.store.getAlertByPodId(podId)
      if (!alerts || alerts.length === 0) {
        this.app.log.info({ podId }, 'No alerts found for pod')
        return { success: true, podId, timestamp: Date.now(), nfinal: 0, reason: 'No alerts found' }
      }

      const applicationId = alerts[0].applicationId
      if (!applicationId) {
        this.app.log.warn({ podId, alerts }, 'Missing applicationId in alerts')
        return { success: false, podId, timestamp: Date.now(), error: 'Missing applicationId' }
      }

      const podsMetrics = await this.app.scalerMetrics.getApplicationMetrics(applicationId)
      if (!podsMetrics || Object.keys(podsMetrics).length === 0) {
        this.app.log.warn({ podId, applicationId }, 'No metrics found for application')
        return { success: false, podId, applicationId, timestamp: Date.now(), error: 'No metrics found' }
      }

      const { result, scaled } = await this.#calculateAndApplyScaling(
        applicationId,
        podsMetrics,
        alerts,
        { podId }
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

  async executeScaling (applicationId, podsNumber) {
    this.app.log.info({ applicationId, podsNumber }, 'Executing scaling operation')
    return {
      success: true,
      applicationId,
      podsNumber,
      timestamp: Date.now()
    }
  }

  async checkScalingOnMetrics () {
    this.app.log.info('Checking scaling based on metrics for all applications')

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
