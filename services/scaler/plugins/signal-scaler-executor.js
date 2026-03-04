'use strict'

const fp = require('fastify-plugin')
const { LoadPredictor } = require('../lib/load-predictor')

class SignalScalerExecutor {
  constructor (app) {
    this.app = app

    const globalConfig = {
      reconnectTimeoutMs: Number(app.env.PLT_SIGNALS_SCALER_RECONNECT_TIMEOUT_MS),
      horizontalTrendThreshold: Number(app.env.PLT_SIGNALS_SCALER_HORIZONTAL_TREND_THRESHOLD),
      scaleUpK: Number(app.env.PLT_SIGNALS_SCALER_SCALE_UP_K),
      scaleUpMargin: Number(app.env.PLT_SIGNALS_SCALER_SCALE_UP_MARGIN),
      scaleDownMargin: Number(app.env.PLT_SIGNALS_SCALER_SCALE_DOWN_MARGIN),
      pendingScaleUpExpiryMs: Number(app.env.PLT_SIGNALS_SCALER_PENDING_SCALE_UP_EXPIRY_MS),
      redeployTimeoutMs: Number(app.env.PLT_SIGNALS_SCALER_REDEPLOY_TIMEOUT_MS),
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
      horizonMultiplier: Number(app.env.PLT_SIGNALS_SCALER_HORIZON_MULTIPLIER),
      processingInitTimeoutMs: Number(app.env.PLT_SIGNALS_SCALER_PROCESSING_INIT_TIMEOUT_MS),
      processingCooldownMs: Number(app.env.PLT_SIGNALS_SCALER_PROCESSING_COOLDOWN_MS),
      instancesWindowMs: Number(app.env.PLT_SIGNALS_SCALER_INSTANCES_WINDOW_MS),
      initTimeoutMs: Number(app.env.PLT_SIGNALS_SCALER_INIT_TIMEOUT_MS),
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
        betaDown: Number(app.env.PLT_SIGNALS_SCALER_ELU_BETA_DOWN)
      },
      heap: {
        windowMs: Number(app.env.PLT_SIGNALS_SCALER_HEAP_WINDOW_MS),
        sampleInterval: Number(app.env.PLT_SIGNALS_SCALER_HEAP_SAMPLE_INTERVAL),
        redistributionMs: Number(app.env.PLT_SIGNALS_SCALER_HEAP_REDISTRIBUTION_MS),
        alphaUp: Number(app.env.PLT_SIGNALS_SCALER_HEAP_ALPHA_UP),
        alphaDown: Number(app.env.PLT_SIGNALS_SCALER_HEAP_ALPHA_DOWN),
        betaUp: Number(app.env.PLT_SIGNALS_SCALER_HEAP_BETA_UP),
        betaDown: Number(app.env.PLT_SIGNALS_SCALER_HEAP_BETA_DOWN)
      }
    }

    const valkeyConfig = this.#parseValkeyConnectionString(
      app.env.PLT_ICC_VALKEY_CONNECTION_STRING,
      app.env.PLT_SIGNALS_SCALER_VALKEY_KEY_PREFIX
    )

    const api = {
      getCurrentPodsTarget: async (appId) => {
        const controller = await app.getApplicationController(appId)
        return controller ? controller.replicas : 1
      },
      scale: async (appId, targetReplicas, options = {}) => {
        const result = await this.executeScaling(appId, targetReplicas, options)
        if (result?.scaleEvent && options.snapshots) {
          await this.#saveMetricSnapshots(result.scaleEvent, options.snapshots)
        }
      },
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

    this.predictor = new LoadPredictor(globalConfig, defaultAppConfig, api, valkeyConfig)

    app.log.info({
      algorithm: 'Signal Scaler',
      globalConfig,
      defaultAppConfig: {
        pods: defaultAppConfig.pods,
        horizonMultiplier: defaultAppConfig.horizonMultiplier,
        initTimeoutMs: defaultAppConfig.initTimeoutMs
      }
    }, '[Signal Scaler] Executor initialized')
  }

  async close () {
    await this.predictor.close()
  }

  async initialize () {
    await this.predictor.initialize()
  }

  async onConnect (appId, deploymentId, podId, runtimeId, timestamp) {
    await this.predictor.onConnect(appId, deploymentId, podId, runtimeId, timestamp)
  }

  async onDisconnect (appId, runtimeId, timestamp) {
    await this.predictor.onDisconnect(appId, runtimeId, timestamp)
  }

  async #isScalingDisabled (applicationId) {
    try {
      const controller = await this.app.getApplicationController(applicationId)
      return controller?.scalingDisabled === true
    } catch (err) {
      this.app.log.warn({ err, applicationId }, 'Failed to check scaling disabled state')
      return false
    }
  }

  async processSignals ({ applicationId, podId, runtimeId, deploymentId, signals, batchStartedAt }) {
    await this.predictor.saveInstanceMetrics({
      applicationId,
      podId,
      instanceId: runtimeId,
      imageId: deploymentId,
      services: signals,
      batchStartedAt
    })

    if (await this.#isScalingDisabled(applicationId)) {
      this.app.log.info({ applicationId }, 'Scaling disabled for this controller, skipping')
      return { alerts: [] }
    }

    const isLeader = this.app.isScalerLeader ? this.app.isScalerLeader() : false
    if (isLeader) {
      await this.predictor.checkScaling(applicationId)
    } else if (this.app.notifySignalScaler) {
      await this.app.notifySignalScaler(applicationId)
    }

    // Save alerts for services where max value exceeds threshold.
    // This creates alert entities that link to flamegraphs in the dashboard.
    const alerts = await this.#saveAlertsIfNeeded(applicationId, podId, signals)

    return { alerts }
  }

  async executeScaling (applicationId, targetReplicas, options = {}) {
    this.app.log.info({
      algorithm: 'Signal Scaler',
      applicationId,
      targetReplicas
    }, '[Signal Scaler] Executing scaling action')

    try {
      const result = await this.app.updateControllerReplicas(
        applicationId,
        targetReplicas,
        'Signal Scaler predictive scaling',
        null,
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

  async checkScalingOnSignals ({ applicationId } = {}) {
    if (await this.#isScalingDisabled(applicationId)) {
      this.app.log.info({ applicationId }, 'Scaling disabled for this controller, skipping')
      return { success: true, timestamp: Date.now() }
    }
    await this.predictor.checkScaling(applicationId)
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
