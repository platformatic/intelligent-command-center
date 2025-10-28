'use strict'

const fp = require('fastify-plugin')
const SignalScalerAlgorithm = require('../lib/signal-scaler-algorithm')
const { getApplicationName } = require('../lib/executor-utils')

class MultiSignalReactiveScaler {
  constructor (app) {
    this.app = app

    const options = {
      FW: Number(process.env.PLT_SIGNALS_SCALER_FW) || 15000,
      SW: Number(process.env.PLT_SIGNALS_SCALER_SW) || 60000,
      LW: Number(process.env.PLT_SIGNALS_SCALER_LW) || 300000,
      HOT_RATE_THRESHOLD: Number(process.env.PLT_SIGNALS_SCALER_HOT_RATE_THRESHOLD) || 0.5,
      SCALE_UP_FW_RATE_THRESHOLD: Number(process.env.PLT_SIGNALS_SCALER_UP_FW_RATE_THRESHOLD) || 0.05,
      SCALE_UP_SW_RATE_THRESHOLD: Number(process.env.PLT_SIGNALS_SCALER_UP_SW_RATE_THRESHOLD) || 0.05,
      SCALE_UP_VELOCITY_THRESHOLD: Number(process.env.PLT_SIGNALS_SCALER_UP_VELOCITY_THRESHOLD) || 0.02,
      SCALE_DOWN_SW_RATE_THRESHOLD: Number(process.env.PLT_SIGNALS_SCALER_DOWN_SW_RATE_THRESHOLD) || 0.01,
      SCALE_DOWN_LW_RATE_THRESHOLD: Number(process.env.PLT_SIGNALS_SCALER_DOWN_LW_RATE_THRESHOLD) || 0.004,
      minPodsDefault: Number(process.env.PLT_SCALER_MIN_PODS_DEFAULT) || 1,
      maxPodsDefault: Number(process.env.PLT_SCALER_MAX_PODS_DEFAULT) || 10
    }

    this.algorithm = new SignalScalerAlgorithm(app, options)

    app.log.info({
      algorithm: 'Multi-Signal Reactive',
      config: options
    }, 'Multi-Signal Reactive Scaler initialized')
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

  async storeSignals ({ applicationId, podId, signals, timestamp }) {
    const signalsMap = {}
    for (const signal of signals) {
      signalsMap[signal.type] = signal.value
    }

    await this.algorithm.storeSignalEvent(applicationId, podId, signalsMap, timestamp)

    this.app.log.debug({
      algorithm: 'Multi-Signal Reactive',
      applicationId,
      podId,
      signalTypes: signals.map(s => s.type),
      signalCount: signals.length,
      timestamp
    }, '[Multi-Signal Reactive] Stored signal event')
  }

  async processSignals ({ applicationId, podId, signals }) {
    const signalsBySecond = new Map()
    for (const signal of signals) {
      const timestampInSeconds = Math.floor(signal.timestamp / 1000) * 1000
      if (!signalsBySecond.has(timestampInSeconds)) {
        signalsBySecond.set(timestampInSeconds, [])
      }
      signalsBySecond.get(timestampInSeconds).push(signal)
    }

    for (const [timestamp, signalsGroup] of signalsBySecond) {
      await this.storeSignals({
        applicationId,
        podId,
        signals: signalsGroup,
        timestamp
      })
    }

    const totalSignals = signals.length

    const currentPodCount = await this.getCurrentPodCount(applicationId)
    const { minPods, maxPods } = await this.getScaleConfig(applicationId)
    const applicationName = await getApplicationName(applicationId, this.app.log)

    const scalingDecision = await this.algorithm.calculateScalingDecision(
      applicationId,
      currentPodCount,
      minPods,
      maxPods,
      applicationName
    )

    const scalingAction = scalingDecision.nfinal > currentPodCount
      ? 'SCALE UP'
      : scalingDecision.nfinal < currentPodCount ? 'SCALE DOWN' : 'NO CHANGE'

    this.app.log.info({
      algorithm: 'Multi-Signal Reactive',
      applicationId,
      podId,
      nfinal: scalingDecision.nfinal,
      currentPodCount,
      action: scalingAction,
      reason: scalingDecision.reason,
      signalCount: totalSignals,
      groupCount: signalsBySecond.size
    }, `[Multi-Signal Reactive] Scaling decision: ${scalingAction}`)

    if (scalingDecision.nfinal !== currentPodCount) {
      await this.executeScaling(applicationId, scalingDecision.nfinal, scalingDecision.reason)
    }

    return { scalingDecision }
  }

  async executeScaling (applicationId, targetReplicas, reason) {
    this.app.log.info({
      algorithm: 'Multi-Signal Reactive',
      applicationId,
      targetReplicas,
      reason
    }, '[Multi-Signal Reactive] Executing scaling action')

    try {
      const { scaleEvent } = await this.app.updateControllerReplicas(
        applicationId,
        targetReplicas,
        reason
      )

      await this.app.store.saveLastScalingTime(applicationId, Date.now())

      this.app.log.info({
        algorithm: 'Multi-Signal Reactive',
        applicationId,
        targetReplicas,
        reason,
        scaleEventId: scaleEvent?.id
      }, '[Multi-Signal Reactive] Successfully executed scaling action')

      return { success: true, scaleEvent }
    } catch (err) {
      this.app.log.error({
        algorithm: 'Multi-Signal Reactive',
        err,
        applicationId,
        targetReplicas,
        reason
      }, '[Multi-Signal Reactive] Failed to execute scaling action')

      throw err
    }
  }

  async checkScalingForApplication (applicationId) {
    try {
      const currentPodCount = await this.getCurrentPodCount(applicationId)
      const { minPods, maxPods } = await this.getScaleConfig(applicationId)
      const applicationName = await getApplicationName(applicationId, this.app.log)

      const scalingDecision = await this.algorithm.calculateScalingDecision(
        applicationId,
        currentPodCount,
        minPods,
        maxPods,
        applicationName
      )

      const scalingAction = scalingDecision.nfinal > currentPodCount
        ? 'SCALE UP'
        : scalingDecision.nfinal < currentPodCount ? 'SCALE DOWN' : 'NO CHANGE'

      const logMessage = scalingDecision.nfinal !== currentPodCount
        ? `[Multi-Signal Reactive] Periodic check: ${scalingAction} from ${currentPodCount} to ${scalingDecision.nfinal} pods`
        : `[Multi-Signal Reactive] Periodic check: ${scalingAction} - ${scalingDecision.reason || 'No scaling needed'}`

      this.app.log.info({
        algorithm: 'Multi-Signal Reactive',
        applicationId,
        nfinal: scalingDecision.nfinal,
        currentPodCount,
        action: scalingAction,
        reason: scalingDecision.reason,
        source: 'periodic'
      }, logMessage)

      if (scalingDecision.nfinal !== currentPodCount) {
        await this.executeScaling(applicationId, scalingDecision.nfinal, scalingDecision.reason)
      }

      return { success: true, scalingDecision }
    } catch (err) {
      this.app.log.error({
        algorithm: 'Multi-Signal Reactive',
        err,
        applicationId
      }, '[Multi-Signal Reactive] Error during periodic scaling check')

      return { success: false, error: err.message }
    }
  }

  async checkScalingForAllApplications () {
    this.app.log.info({
      algorithm: 'Multi-Signal Reactive'
    }, '[Multi-Signal Reactive] Running periodic scaling check for all applications')

    try {
      const controllers = await this.app.platformatic.entities.controller.find({
        fields: ['applicationId']
      })

      const uniqueApplicationIds = [...new Set(controllers.map(c => c.applicationId))]

      this.app.log.info({
        algorithm: 'Multi-Signal Reactive',
        applicationCount: uniqueApplicationIds.length
      }, `[Multi-Signal Reactive] Checking ${uniqueApplicationIds.length} applications`)

      const results = []
      for (const applicationId of uniqueApplicationIds) {
        const result = await this.checkScalingForApplication(applicationId)
        results.push({ applicationId, ...result })
      }

      return { success: true, results }
    } catch (err) {
      this.app.log.error({
        algorithm: 'Multi-Signal Reactive',
        err
      }, '[Multi-Signal Reactive] Error during periodic check for all applications')

      return { success: false, error: err.message }
    }
  }
}

async function plugin (app) {
  const scaler = new MultiSignalReactiveScaler(app)
  app.decorate('signalScalerExecutor', scaler)
}

module.exports = fp(plugin, {
  name: 'signal-scaler-executor',
  dependencies: ['env', 'store', 'controllers']
})
