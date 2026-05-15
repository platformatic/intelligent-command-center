'use strict'

const fp = require('fastify-plugin')

class SignalScalerExecutor {
  #appStates = new Map()

  constructor (app) {
    this.app = app

    const globalConfig = {
      debug: app.env.PLT_SCALER_DASHBOARD_API_ENABLED === true,
      reconnectTimeoutMs: Number(app.env.PLT_SIGNALS_SCALER_RECONNECT_TIMEOUT_MS),
      readinessDelayMs: Number(app.env.PLT_SIGNALS_SCALER_READINESS_DELAY_MS),
      horizontalTrendThreshold: Number(app.env.PLT_SIGNALS_SCALER_HORIZONTAL_TREND_THRESHOLD),
      scaleUpK: Number(app.env.PLT_SIGNALS_SCALER_SCALE_UP_K),
      scaleUpMargin: Number(app.env.PLT_SIGNALS_SCALER_SCALE_UP_MARGIN),
      scaleDownMargin: Number(app.env.PLT_SIGNALS_SCALER_SCALE_DOWN_MARGIN),
      pendingScaleUpExpiryMs: Number(app.env.PLT_SIGNALS_SCALER_PENDING_SCALE_UP_EXPIRY_MS),
      redeployTimeoutMs: Number(app.env.PLT_SIGNALS_SCALER_REDEPLOY_TIMEOUT_MS),
      initTimeoutMs: Number(app.env.PLT_SIGNALS_SCALER_INIT_TIMEOUT_MS),
      horizonMultiplier: Number(app.env.PLT_SIGNALS_SCALER_HORIZON_MULTIPLIER),
      minHorizonMs: Number(app.env.PLT_SIGNALS_SCALER_MIN_HORIZON_MS),
      maxHorizonMs: Number(app.env.PLT_SIGNALS_SCALER_MAX_HORIZON_MS),
      liveMetricCount: Number(app.env.PLT_SIGNALS_SCALER_LIVE_METRIC_COUNT),
      initTimeout: {
        windowSize: Number(app.env.PLT_SIGNALS_SCALER_INIT_TIMEOUT_WINDOW_SIZE),
        stepRate: Number(app.env.PLT_SIGNALS_SCALER_INIT_TIMEOUT_STEP_RATE),
        upFactor: Number(app.env.PLT_SIGNALS_SCALER_INIT_TIMEOUT_UP_FACTOR),
        downFactor: Number(app.env.PLT_SIGNALS_SCALER_INIT_TIMEOUT_DOWN_FACTOR)
      }
    }

    const defaultAppConfig = {
      pods: {
        min: Number(app.env.PLT_SCALER_MIN_PODS_DEFAULT),
        max: Number(app.env.PLT_SCALER_MAX_PODS_DEFAULT)
      },
      maxScaleUpStep: Number(app.env.PLT_SIGNALS_SCALER_MAX_SCALE_UP_STEP),
      processingInitTimeoutMs: Number(app.env.PLT_SIGNALS_SCALER_PROCESSING_INIT_TIMEOUT_MS),
      processingCooldownMs: Number(app.env.PLT_SIGNALS_SCALER_PROCESSING_COOLDOWN_MS),
      instancesWindowMs: Number(app.env.PLT_SIGNALS_SCALER_INSTANCES_WINDOW_MS),
      cooldowns: {
        scaleUpAfterScaleUpMs: Number(app.env.PLT_SIGNALS_SCALER_COOLDOWN_SCALE_UP_AFTER_SCALE_UP_MS),
        scaleUpAfterScaleDownMs: Number(app.env.PLT_SIGNALS_SCALER_COOLDOWN_SCALE_UP_AFTER_SCALE_DOWN_MS),
        scaleDownAfterScaleUpMs: Number(app.env.PLT_SIGNALS_SCALER_COOLDOWN_SCALE_DOWN_AFTER_SCALE_UP_MS),
        scaleDownAfterScaleDownMs: Number(app.env.PLT_SIGNALS_SCALER_COOLDOWN_SCALE_DOWN_AFTER_SCALE_DOWN_MS)
      },
      elu: {
        windowMs: Number(app.env.PLT_SIGNALS_SCALER_ELU_WINDOW_MS),
        sampleInterval: Number(app.env.PLT_SIGNALS_SCALER_ELU_SAMPLE_INTERVAL),
        redistributionMs: Number(app.env.PLT_SIGNALS_SCALER_ELU_REDISTRIBUTION_MS),
        alphaUp: Number(app.env.PLT_SIGNALS_SCALER_ELU_ALPHA_UP),
        alphaDown: Number(app.env.PLT_SIGNALS_SCALER_ELU_ALPHA_DOWN),
        betaUp: Number(app.env.PLT_SIGNALS_SCALER_ELU_BETA_UP),
        betaDown: Number(app.env.PLT_SIGNALS_SCALER_ELU_BETA_DOWN),
        precision: Number(app.env.PLT_SIGNALS_SCALER_ELU_PRECISION)
      },
      heap: {
        windowMs: Number(app.env.PLT_SIGNALS_SCALER_HEAP_WINDOW_MS),
        sampleInterval: Number(app.env.PLT_SIGNALS_SCALER_HEAP_SAMPLE_INTERVAL),
        redistributionMs: Number(app.env.PLT_SIGNALS_SCALER_HEAP_REDISTRIBUTION_MS),
        alphaUp: Number(app.env.PLT_SIGNALS_SCALER_HEAP_ALPHA_UP),
        alphaDown: Number(app.env.PLT_SIGNALS_SCALER_HEAP_ALPHA_DOWN),
        betaUp: Number(app.env.PLT_SIGNALS_SCALER_HEAP_BETA_UP),
        betaDown: Number(app.env.PLT_SIGNALS_SCALER_HEAP_BETA_DOWN),
        precision: Number(app.env.PLT_SIGNALS_SCALER_HEAP_PRECISION)
      }
    }

    const valkeyConfig = this.#parseValkeyConnectionString(
      app.env.PLT_ICC_VALKEY_CONNECTION_STRING,
      app.env.PLT_SIGNALS_SCALER_VALKEY_KEY_PREFIX
    )

    const api = {
      getApplicationConfig: async (appId) => {
        let minPods = defaultAppConfig.pods.min
        let maxPods = defaultAppConfig.pods.max

        try {
          const scaleConfig = await app.getScaleConfig(appId)
          if (scaleConfig) {
            if (scaleConfig.minPods !== undefined) {
              minPods = scaleConfig.minPods
            }
            if (scaleConfig.maxPods !== undefined) {
              maxPods = scaleConfig.maxPods
            }
          }
        } catch (err) {
          app.log.warn({ err, appId }, 'Failed to get scale config, using defaults')
        }

        return {
          ...defaultAppConfig,
          pods: { min: minPods, max: maxPods }
        }
      }
    }

    let LoadPredictor
    try {
      LoadPredictor = require('../lib/load-predictor').LoadPredictor
    } catch {
      throw new Error(
        'The predictive scaling algorithm is not available in the OSS version of ICC. ' +
        'Please set PLT_SCALER_ALGORITHM_VERSION to "v1" or upgrade to the commercial version.'
      )
    }

    this.predictor = new LoadPredictor(globalConfig, defaultAppConfig, api, valkeyConfig)

    app.log.info({
      algorithm: 'Signal Scaler',
      globalConfig,
      defaultAppConfig: {
        pods: defaultAppConfig.pods
      }
    }, '[Signal Scaler] Executor initialized')
  }

  async close () {
    for (const state of this.#appStates.values()) {
      if (state.timer) clearTimeout(state.timer)
    }
    this.#appStates.clear()
    await this.predictor.close()
  }

  async initialize () {
    await this.predictor.initialize()
  }

  async onConnect (appId, controllerId, runtimeId, timestamp) {
    await this.predictor.onConnect(appId, controllerId, runtimeId, timestamp)
  }

  async onReady (appId, controllerId, deploymentId, podId, runtimeId, timestamp) {
    await this.predictor.registerInstance(
      appId,
      controllerId,
      deploymentId,
      podId,
      runtimeId,
      timestamp,
      timestamp
    )
  }

  async onDisconnect (appId, controllerId, runtimeId, timestamp) {
    await this.predictor.onDisconnect(appId, controllerId, runtimeId, timestamp)
  }

  async processSignals ({ applicationId, controllerId, podId, runtimeId, deploymentId, signals, batchStartedAt }) {
    await this.predictor.saveInstanceMetrics({
      applicationId,
      controllerId,
      podId,
      instanceId: runtimeId,
      imageId: deploymentId,
      services: signals,
      batchStartedAt
    })

    const isLeader = this.app.isScalerLeader ? this.app.isScalerLeader() : false
    if (isLeader) {
      const state = this.#getAppState(applicationId, controllerId)
      if (!state.processing && !state.timer) {
        const appConfig = await this.predictor.getApplicationConfig(applicationId)
        this.#scheduleProcessing(applicationId, controllerId, appConfig.processingInitTimeoutMs)
      }
    } else if (this.app.notifySignalScaler) {
      await this.app.notifySignalScaler(applicationId, controllerId)
    }

    // Save alerts for services where max value exceeds threshold.
    // This creates alert entities that link to flamegraphs in the dashboard.
    const alerts = await this.#saveAlertsIfNeeded(applicationId, podId, signals)
    return { alerts }
  }

  async executeScaling (applicationId, targetReplicas, controller, options = {}) {
    this.app.log.info({
      algorithm: 'Signal Scaler',
      applicationId,
      targetReplicas
    }, '[Signal Scaler] Executing scaling action')

    try {
      const result = await this.app.updateControllerReplicas(
        applicationId,
        targetReplicas,
        options.reason,
        controller,
        options
      )

      this.app.log.info({
        algorithm: 'Signal Scaler',
        applicationId,
        targetReplicas
      }, '[Signal Scaler] Successfully executed scaling action')

      return result
    } catch (err) {
      this.app.log.error({
        algorithm: 'Signal Scaler',
        err,
        applicationId,
        targetReplicas
      }, '[Signal Scaler] Failed to execute scaling action')

      throw err
    }
  }

  async getScaleConfig (applicationId) {
    try {
      const scaleConfig = await this.app.getScaleConfig(applicationId)
      if (scaleConfig) {
        const { minPods, maxPods } = scaleConfig
        this.app.log.debug({ applicationId, minPods, maxPods }, 'Retrieved scale config')
        return { minPods, maxPods }
      }
    } catch (err) {
      this.app.log.warn({ err, applicationId }, 'Error retrieving scale config, using defaults')
    }

    return { minPods: undefined, maxPods: undefined }
  }

  async updateApplicationConfig (appId, override) {
    await this.predictor.updateApplicationConfig(appId, override)
  }

  async checkScalingOnSignals ({ applicationId, controllerId } = {}) {
    const state = this.#getAppState(applicationId, controllerId)
    if (!state.processing && !state.timer) {
      const appConfig = await this.predictor.getApplicationConfig(applicationId)
      this.#scheduleProcessing(applicationId, controllerId, appConfig.processingInitTimeoutMs)
    }
    return { success: true, timestamp: Date.now() }
  }

  async #saveMetricSnapshots (scaleEvent, snapshots) {
    const inputs = []
    for (const [serviceId, metrics] of Object.entries(snapshots)) {
      for (const [metricName, data] of Object.entries(metrics)) {
        if (!data) continue
        inputs.push({
          scaleEventId: scaleEvent.id,
          applicationId: scaleEvent.applicationId,
          serviceId,
          metricName,
          data
        })
      }
    }
    if (inputs.length > 0) {
      await this.app.platformatic.entities.metricSnapshot.insert({ inputs })
    }
  }

  async #saveCountSnapshot (scaleEvent, countSnapshot) {
    await this.app.platformatic.entities.countSnapshot.insert({
      inputs: [{
        scaleEventId: scaleEvent.id,
        applicationId: scaleEvent.applicationId,
        data: countSnapshot
      }]
    })
  }

  #getAppState (appId, controllerId) {
    const key = `${appId}:${controllerId}`
    let state = this.#appStates.get(key)
    if (!state) {
      state = { processing: false, timer: null }
      this.#appStates.set(key, state)
    }
    return state
  }

  #scheduleProcessing (appId, controllerId, delayMs) {
    const state = this.#getAppState(appId, controllerId)
    if (state.timer) return

    state.timer = setTimeout(() => {
      state.timer = null
      state.processing = true

      this.#runScheduledCheck(appId, controllerId)
        .catch(err => this.app.log.error({ err, appId, controllerId }, '[Signal Scaler] Error in scheduled scaling check'))
        .finally(() => { state.processing = false })
    }, delayMs).unref()
  }

  async #runScheduledCheck (appId, controllerId) {
    const controller = await this.app.getControllerById(appId, controllerId)
    if (!controller) {
      this.app.log.warn({ appId, controllerId }, 'Controller not found, skipping')
      return
    }

    if (controller.scalingDisabled) {
      this.app.log.info({ appId, controllerId }, 'Scaling disabled for this controller, skipping')
      return
    }

    const targetPodsCount = controller.replicas ?? 1
    const scale = async (targetReplicas, options = {}) => {
      const result = await this.executeScaling(appId, targetReplicas, controller, options)
      if (!result?.scaleEvent) return
      const writes = []
      if (options.snapshots) {
        writes.push(this.#saveMetricSnapshots(result.scaleEvent, options.snapshots))
      }
      if (options.countSnapshot) {
        writes.push(this.#saveCountSnapshot(result.scaleEvent, options.countSnapshot))
      }
      if (writes.length > 0) await Promise.all(writes)
    }

    const processed = await this.predictor.checkForPendingBatches(appId, controllerId, targetPodsCount, scale)
    if (processed) {
      const appConfig = await this.predictor.getApplicationConfig(appId)
      this.#scheduleProcessing(appId, controllerId, appConfig.processingCooldownMs)
    }
  }

  #parseValkeyConnectionString (connectionString, keyPrefix) {
    const url = new URL(connectionString)
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      tls: url.protocol === 'rediss:',
      keyPrefix: keyPrefix || ''
    }
  }

  async #saveAlertsIfNeeded (applicationId, podId, signals) {
    const alertInputs = []
    const workerIdByService = {}

    for (const [serviceId, metrics] of Object.entries(signals)) {
      const eluWorkers = metrics.elu.workers
      const heapWorkers = metrics.heap.workers
      const eluThreshold = metrics.elu.options.threshold
      const heapThreshold = metrics.heap.options.threshold
      const heapTotal = metrics.heap.options.heapTotal

      let maxElu = 0
      let maxEluWorkerId = null
      for (const [workerId, worker] of Object.entries(eluWorkers)) {
        for (const [, value] of worker.values) {
          if (value > maxElu) {
            maxElu = value
            maxEluWorkerId = workerId
          }
        }
      }

      let maxHeap = 0
      let maxHeapWorkerId = null
      for (const [workerId, worker] of Object.entries(heapWorkers)) {
        for (const [, value] of worker.values) {
          if (value > maxHeap) {
            maxHeap = value
            maxHeapWorkerId = workerId
          }
        }
      }

      const eluExceeds = maxElu > eluThreshold
      const heapExceeds = maxHeap > heapThreshold

      if (eluExceeds || heapExceeds) {
        // Use workerId from the max value that exceeded (prefer ELU)
        workerIdByService[serviceId] = eluExceeds ? maxEluWorkerId : maxHeapWorkerId
        alertInputs.push({
          applicationId,
          serviceId,
          podId,
          elu: maxElu,
          heapUsed: maxHeap,
          heapTotal: heapTotal || 0,
          unhealthy: false,
          createdAt: new Date()
        })
      }
    }

    if (alertInputs.length === 0) {
      return []
    }

    const insertedAlerts = await this.app.platformatic.entities.alert.insert({
      inputs: alertInputs
    })

    const alerts = []
    for (const alert of insertedAlerts) {
      alerts.push({
        serviceId: alert.serviceId,
        workerId: workerIdByService[alert.serviceId],
        alertId: alert.id
      })
    }

    return alerts
  }
}

async function plugin (app) {
  const algorithmVersion = app.env.PLT_SCALER_ALGORITHM_VERSION

  if (algorithmVersion !== 'v2') {
    app.log.info({ algorithmVersion }, '[Signal Scaler] Executor skipped - algorithm version is not v2')
    return
  }

  const executor = new SignalScalerExecutor(app)

  app.addHook('onClose', async () => {
    await executor.close()
  })

  app.decorate('signalScalerExecutor', executor)

  app.log.info({ algorithmVersion }, '[Signal Scaler] Executor registered')
}

module.exports = fp(plugin, {
  name: 'signal-scaler-executor',
  dependencies: ['env', 'store', 'controllers', 'instances', 'scale-config']
})
