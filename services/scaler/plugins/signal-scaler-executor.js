'use strict'

const fp = require('fastify-plugin')
const SignalScalerAlgorithm = require('../lib/signal-scaler-algorithm')
const { getApplicationName } = require('../lib/executor-utils')
const { randomUUID } = require('node:crypto')

class MultiSignalReactiveScaler {
  constructor (app) {
    this.app = app

    const options = {
      FW: Number(app.env.PLT_SIGNALS_SCALER_FW),
      SW: Number(app.env.PLT_SIGNALS_SCALER_SW),
      LW: Number(app.env.PLT_SIGNALS_SCALER_LW),
      HOT_RATE_THRESHOLD: Number(app.env.PLT_SIGNALS_SCALER_HOT_RATE_THRESHOLD),
      SCALE_UP_FW_RATE_THRESHOLD: Number(app.env.PLT_SIGNALS_SCALER_UP_FW_RATE_THRESHOLD),
      SCALE_UP_SW_RATE_THRESHOLD: Number(app.env.PLT_SIGNALS_SCALER_UP_SW_RATE_THRESHOLD),
      SCALE_DOWN_SW_RATE_THRESHOLD: Number(app.env.PLT_SIGNALS_SCALER_DOWN_SW_RATE_THRESHOLD),
      SCALE_DOWN_LW_RATE_THRESHOLD: Number(app.env.PLT_SIGNALS_SCALER_DOWN_LW_RATE_THRESHOLD),
      minPodsDefault: Number(app.env.PLT_SCALER_MIN_PODS_DEFAULT),
      maxPodsDefault: Number(app.env.PLT_SCALER_MAX_PODS_DEFAULT)
    }

    this.algorithm = new SignalScalerAlgorithm(app, options)

    // Configuration for concurrent processing control
    this.lockTTL = Number(app.env.PLT_SIGNALS_SCALER_LOCK_TTL)
    this.maxIterations = Number(app.env.PLT_SIGNALS_SCALER_MAX_ITERATIONS)
    this.pendingTTL = Number(app.env.PLT_SIGNALS_SCALER_PENDING_TTL)

    app.log.info({
      algorithm: 'Multi-Signal Reactive',
      config: options,
      lockTTL: this.lockTTL,
      maxIterations: this.maxIterations,
      pendingTTL: this.pendingTTL
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

  async processSignals ({ applicationId, serviceId, podId, signals, elu, heapUsed, heapTotal }) {
    const signalsWithIds = signals.map((signal) => {
      let value = parseFloat(signal.value)
      if (isNaN(value)) {
        value = null
      }
      return { id: randomUUID(), value, ...signal }
    })

    await this.algorithm.storeSignals(applicationId, podId, signalsWithIds)

    this.app.log.debug({
      algorithm: 'Multi-Signal Reactive',
      applicationId,
      podId,
      signalTypes: signals.map(s => s.type),
      signalCount: signals.length
    }, '[Multi-Signal Reactive] Stored signals')

    const alert = await this.app.platformatic.entities.alert.save({
      input: {
        applicationId,
        serviceId,
        podId,
        elu,
        heapUsed,
        heapTotal,
        unhealthy: false,
        createdAt: new Date()
      }
    })

    await Promise.all(
      signalsWithIds.map(signal =>
        this.app.platformatic.entities.signal.save({
          input: {
            id: signal.id,
            alertId: alert.id,
            applicationId,
            serviceId,
            podId,
            type: signal.type,
            value: signal.value,
            timestamp: signal.timestamp,
            description: signal.description,
            createdAt: new Date()
          }
        })
      )
    )

    // Check if this instance is the leader
    const isLeader = this.app.isScalerLeader ? this.app.isScalerLeader() : false

    if (!isLeader) {
      // If not leader, notify the leader to process the signals
      this.app.log.debug({
        applicationId,
        serviceId,
        podId
      }, '[Multi-Signal Reactive] Not leader, notifying leader to process signals')

      if (this.app.notifySignalScaler) {
        await this.app.notifySignalScaler(applicationId, serviceId)
      }

      return { scalingDecision: null }
    }

    // This is the leader, proceed to process signals
    const scalingDecision = await this.runScalingAlgorithm(applicationId)

    return { scalingDecision }
  }

  async runScalingAlgorithm (applicationId) {
    const lockKey = `reactive:lock:${applicationId}`
    const lockValue = `${Date.now()}-${Math.random()}`
    const pendingKey = `reactive:pending:${applicationId}`

    // Try to acquire lock atomically using SET NX EX
    const acquired = await this.app.store.valkey.set(lockKey, lockValue, 'NX', 'EX', this.lockTTL)

    if (!acquired) {
      // Another process is already running the algorithm, mark that new data arrived
      await this.app.store.valkey.set(pendingKey, '1', 'EX', this.pendingTTL)
      this.app.log.debug({ applicationId }, '[Multi-Signal Reactive] Algorithm already running, marked pending')
      return null
    }

    let scalingDecision = null
    let iteration = 0

    try {
      let shouldContinue = true

      while (shouldContinue && iteration < this.maxIterations) {
        iteration++

        // Clear the pending flag before we start processing
        await this.app.store.valkey.del(pendingKey)

        const currentPodCount = await this.getCurrentPodCount(applicationId)
        const { minPods, maxPods } = await this.getScaleConfig(applicationId)
        const applicationName = await getApplicationName(applicationId, this.app.log)

        scalingDecision = await this.algorithm.calculateScalingDecision(
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
          nfinal: scalingDecision.nfinal,
          currentPodCount,
          action: scalingAction,
          reason: scalingDecision.reason,
          iteration
        }, `[Multi-Signal Reactive] Scaling decision: ${scalingAction}`)

        if (scalingDecision.nfinal !== currentPodCount) {
          const signals = scalingDecision?.signals || []
          await this.executeScaling(applicationId, scalingDecision.nfinal, scalingDecision.reason, signals)
        }

        // Check if new data arrived while we were processing
        const pending = await this.app.store.valkey.get(pendingKey)
        if (pending) {
          this.app.log.debug({ applicationId, iteration }, '[Multi-Signal Reactive] New data arrived during processing, reprocessing')
          shouldContinue = true
        } else {
          shouldContinue = false
        }
      }

      if (iteration >= this.maxIterations) {
        this.app.log.warn({
          applicationId,
          maxIterations: this.maxIterations
        }, '[Multi-Signal Reactive] Reached maximum iterations, stopping reprocessing loop')
      }
    } finally {
      await this.app.store.valkey.del(pendingKey)
      await this.app.store.valkey.del(lockKey)
    }

    return scalingDecision
  }

  async checkScalingOnSignals ({ applicationId, serviceId } = {}) {
    this.app.log.info({ applicationId, serviceId }, '[Multi-Signal Reactive] Received notification to check scaling')

    if (!applicationId) {
      this.app.log.error('[Multi-Signal Reactive] Application ID is required')
      return { success: false, timestamp: Date.now(), error: 'Application ID is required' }
    }

    try {
      const scalingDecision = await this.runScalingAlgorithm(applicationId)

      return {
        success: true,
        applicationId,
        timestamp: Date.now(),
        nfinal: scalingDecision?.nfinal,
        scaled: scalingDecision !== null
      }
    } catch (err) {
      this.app.log.error({ err, applicationId }, '[Multi-Signal Reactive] Error processing notification')
      return { success: false, timestamp: Date.now(), error: err.message }
    }
  }

  async executeScaling (applicationId, targetReplicas, reason, signals = []) {
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
      const signalIds = signals ? signals.map(s => s.id) : []

      if (scaleEvent?.id && signalIds.length > 0) {
        await Promise.all(
          signalIds.map(signalId =>
            this.app.platformatic.entities.signal.save({
              input: { id: signalId, scaleEventId: scaleEvent.id },
              fields: ['id']
            })
          )
        )
      }

      this.app.log.info({
        algorithm: 'Multi-Signal Reactive',
        applicationId,
        targetReplicas,
        reason,
        scaleEventId: scaleEvent?.id,
        linkedSignals: signalIds.length
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
