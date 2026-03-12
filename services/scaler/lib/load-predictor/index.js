'use strict'

const deepmerge = require('@fastify/deepmerge')({
  mergeArray: () => (target, source) => source
})
const { alignInstanceMetrics } = require('./alignment')
const { getTargetPodsCount, generatePredictionPoints } = require('./decision')
const { AlgorithmStore } = require('./store')
const { calculateInitTimeout } = require('./init-timeout')
const { getServiceConfig } = require('./configs')
const {
  addInstance,
  terminateInstance,
  getClusterState,
  generatePodsTimeline,
  getPodsCountAt
} = require('./instances')

class LoadPredictor {
  name = 'load-predictor'

  #config
  #initTimeoutConfig
  #api

  constructor (config, defaultAppConfig, api, valkeyConfig) {
    this.#config = config
    this.#initTimeoutConfig = config.initTimeout
    this.#api = api
    // Public to allow tests to inspect the Valkey cache directly
    this.store = new AlgorithmStore(valkeyConfig)

    const windowMs = Math.max(
      defaultAppConfig.elu.windowMs,
      defaultAppConfig.heap.windowMs
    )

    if (defaultAppConfig.instancesWindowMs < windowMs) {
      throw new Error(
        `instancesWindowMs (${defaultAppConfig.instancesWindowMs}) must be >= ` +
        `max reconstruction window (${windowMs})`
      )
    }

    const maxRedistributionMs = Math.max(
      defaultAppConfig.elu.redistributionMs,
      defaultAppConfig.heap.redistributionMs
    )
    if (defaultAppConfig.cooldowns.scaleDownAfterScaleUpMs < maxRedistributionMs) {
      console.warn(
        `Warning: scaleDownAfterScaleUpMs (${defaultAppConfig.cooldowns.scaleDownAfterScaleUpMs}) is lower than ` +
        `max redistributionMs (${maxRedistributionMs}). Scale-down may occur before redistribution settles.`
      )
    }
  }

  async initialize () {
    await this.store.deleteAllConfigs()
  }

  async close () {
    await this.store.close()
  }

  async onConnect (appId, controllerId, imageId, podId, instanceId, timestamp) {
    await this.#registerInstance(appId, controllerId, imageId, podId, instanceId, timestamp)
  }

  async #registerInstance (appId, controllerId, imageId, podId, instanceId, timestamp, reconnect = true) {
    const { isNewInstance, isNewPod } = await addInstance(
      this.store,
      appId,
      controllerId,
      imageId,
      podId,
      instanceId,
      timestamp,
      reconnect
    )

    if (isNewInstance) {
      await this.store.setLastInstanceStartTime(appId, controllerId, timestamp)
    }

    if (isNewPod) {
      const appConfig = await this.getApplicationConfig(appId)
      const { isRedeploying } = await getClusterState(
        this.store, appId, controllerId, timestamp, appConfig.instancesWindowMs, this.#config.redeployTimeoutMs
      )
      if (!isRedeploying) {
        const pending = await this.store.removePendingScaleUp(appId, controllerId)
        if (pending) {
          const initTime = timestamp - pending.decisionAt
          await this.#updateInitTimeout(appId, controllerId, initTime)
        } else {
          console.warn('Warning: new pod connected but no pending scale-up found.')
        }
      }
    }
  }

  async onDisconnect (appId, controllerId, instanceId, timestamp) {
    await terminateInstance(
      this.store,
      appId,
      controllerId,
      instanceId,
      timestamp,
      this.#config.reconnectTimeoutMs
    )
  }

  async saveInstanceMetrics ({
    applicationId,
    controllerId,
    podId,
    instanceId,
    imageId,
    services,
    batchStartedAt
  }) {
    const [appConfig] = await Promise.all([
      this.getApplicationConfig(applicationId),
      this.#registerInstance(
        applicationId,
        controllerId,
        imageId,
        podId,
        instanceId,
        batchStartedAt,
        false
      )
    ])

    const promises = []
    for (const [serviceId, samples] of Object.entries(services)) {
      const promise = this.#saveServiceMetrics(
        applicationId,
        controllerId,
        serviceId,
        imageId,
        instanceId,
        samples,
        appConfig
      )
      promises.push(promise)
    }

    await Promise.all(promises)
  }

  async #saveServiceMetrics (
    appId,
    controllerId,
    serviceId,
    imageId,
    instanceId,
    metrics,
    appConfig
  ) {
    const { elu, heap } = metrics

    await Promise.all([
      this.store.addService(appId, controllerId, imageId, serviceId),
      this.#saveServiceMetric(appId, controllerId, serviceId, imageId, instanceId, 'elu', elu, appConfig.elu),
      this.#saveServiceMetric(appId, controllerId, serviceId, imageId, instanceId, 'heap', heap, appConfig.heap)
    ])
  }

  async #saveServiceMetric (appId, controllerId, serviceId, imageId, instanceId, metricName, metric, metricConfig) {
    const { options, workers } = metric

    const threshold = options?.threshold
    if (threshold === undefined) {
      throw new Error(`Missing "${metricName}" threshold for service ${serviceId}`)
    }

    await Promise.all([
      this.#saveServiceMetricBatch(
        appId,
        controllerId,
        serviceId,
        imageId,
        metricName,
        instanceId,
        workers,
        metricConfig
      ),
      this.store.saveServiceMetricThreshold(appId, controllerId, serviceId, metricName, threshold)
    ])
  }

  async #saveServiceMetricBatch (appId, controllerId, serviceId, imageId, metricName, instanceId, workers, config) {
    if (Object.keys(workers).length === 0) return

    const { sampleInterval, windowMs } = config

    const prevSample = await this.store.getLastInstanceMetricSample(appId, controllerId, serviceId, instanceId, metricName)
    const { aligned, lastSample } = alignInstanceMetrics(workers, prevSample, sampleInterval)

    // Always save lastSample if we have one (matches old behavior where samples.at(-1)
    // was always stored regardless of alignment result)
    if (lastSample) {
      await this.store.setLastInstanceMetricSample(appId, controllerId, serviceId, instanceId, metricName, lastSample, windowMs)
    }

    if (aligned.length === 0) return

    await Promise.all([
      this.store.setAlignedValues(appId, controllerId, serviceId, instanceId, metricName, aligned, windowMs),
      this.store.addBatchStart(appId, controllerId, serviceId, imageId, metricName, aligned[0].timestamp)
    ])
  }

  async updateApplicationConfig (appId, override) {
    const current = await this.getApplicationConfig(appId)
    const merged = deepmerge(current, override)
    await this.store.setAppConfig(appId, merged)
  }

  async updateServiceConfig (appId, serviceId, config) {
    await this.store.setServiceConfig(appId, serviceId, config)
  }

  async checkForPendingBatches (appId, controllerId, targetPodsCount, scale) {
    const now = Date.now()

    const appConfig = await this.getApplicationConfig(appId)
    const { isRedeploying, imageId, instances, pods } = await getClusterState(
      this.store, appId, controllerId, now, appConfig.instancesWindowMs, this.#config.redeployTimeoutMs
    )

    if (isRedeploying) return false

    const metricsByService = await this.#getPendingBatches(appId, controllerId, imageId)
    if (!metricsByService) return false

    try {
      await this.#processPendingBatches({
        appId,
        controllerId,
        imageId,
        appConfig,
        serviceBatches: metricsByService,
        now,
        instances,
        pods,
        targetPodsCount,
        scale
      })
    } catch (err) {
      console.error('[LoadPredictor] Error in processPendingBatches:', err)
    }

    return true
  }

  async #getPendingBatches (appId, controllerId, imageId) {
    const services = await this.store.getServices(appId, controllerId, imageId)

    const metricsByService = {}
    let hasPending = false

    const batchChecks = services.map(async (serviceId) => {
      const [eluBatch, heapBatch] = await Promise.all([
        this.store.getFirstBatchStart(appId, controllerId, serviceId, imageId, 'elu'),
        this.store.getFirstBatchStart(appId, controllerId, serviceId, imageId, 'heap')
      ])
      if (eluBatch !== null || heapBatch !== null) {
        hasPending = true
        metricsByService[serviceId] = { elu: eluBatch, heap: heapBatch }
      }
    })
    await Promise.all(batchChecks)

    return hasPending ? metricsByService : null
  }

  async #processPendingBatches ({
    appId,
    controllerId,
    imageId,
    appConfig,
    serviceBatches,
    now,
    instances,
    pods,
    targetPodsCount,
    scale
  }) {
    const [pendingScaleUps, initTimeoutMs] = await Promise.all([
      this.#getPendingScaleUps(appId, controllerId, now),
      this.#getInitTimeout(appId, controllerId)
    ])

    const podsCountHistory = generatePodsTimeline(pods)
    const currentPodsCount = getPodsCountAt(now, podsCountHistory)
    const horizonMs = appConfig.horizonMultiplier * initTimeoutMs

    const appState = {
      now,
      instances,
      podsCountHistory,
      currentPodsCount,
      pendingScaleUps,
      targetPodsCount,
      initTimeoutMs,
      horizonMs
    }

    const promises = []
    for (const [serviceId, batches] of Object.entries(serviceBatches)) {
      const promise = this.#processPendingServiceBatches(
        appId,
        controllerId,
        serviceId,
        imageId,
        batches,
        appConfig,
        appState
      )
      promises.push(promise)
    }

    const serviceResults = await Promise.all(promises)

    let maxTargetPodsCount = 0
    let maxTargetServiceId = null
    let maxTargetMetricName = null

    for (const { serviceId, results } of serviceResults) {
      for (const { metricName, podsCount } of results) {
        if (podsCount > maxTargetPodsCount) {
          maxTargetPodsCount = podsCount
          maxTargetServiceId = serviceId
          maxTargetMetricName = metricName
        }
      }
    }

    await this.#checkScaling({
      appId,
      controllerId,
      appConfig,
      newTargetPodsCount: maxTargetPodsCount,
      triggerServiceId: maxTargetServiceId,
      triggerMetricName: maxTargetMetricName,
      appState,
      scale
    })
  }

  async #processPendingServiceBatches (appId, controllerId, serviceId, imageId, batches, appConfig, appState) {
    const serviceConfig = await getServiceConfig(this.store, appId, serviceId, appConfig)
    const promises = []

    if (batches.elu !== null) {
      promises.push(this.#processMetric({
        appId,
        controllerId,
        serviceId,
        imageId,
        metricName: 'elu',
        config: serviceConfig.elu,
        firstBatchStart: batches.elu,
        appState,
        appConfig
      }))
    }

    if (batches.heap !== null) {
      promises.push(this.#processMetric({
        appId,
        controllerId,
        serviceId,
        imageId,
        metricName: 'heap',
        config: serviceConfig.heap,
        firstBatchStart: batches.heap,
        appState,
        appConfig
      }))
    }

    const results = await Promise.all(promises)
    return { serviceId, results }
  }

  async #processMetric ({
    appId,
    controllerId,
    serviceId,
    imageId,
    metricName,
    config,
    firstBatchStart,
    appState,
    appConfig
  }) {
    const {
      podsCountHistory,
      instances,
      targetPodsCount,
      initTimeoutMs,
      horizonMs,
      now
    } = appState

    const { sampleInterval, windowMs } = config
    const windowStart = now - windowMs

    const timestamps = await this.#getProcessingTimestamps(
      appId,
      controllerId,
      serviceId,
      imageId,
      metricName,
      firstBatchStart,
      windowStart,
      sampleInterval
    )
    if (timestamps === null) {
      return { metricName, podsCount: targetPodsCount }
    }

    const { startTimestamp, bootstrapTimestamp } = timestamps

    // Fetch instances metric values by aligned timestamp
    const instanceIds = Object.keys(instances)
    const metricsByTimestamp = await this.store.getAlignedValues(
      appId,
      controllerId,
      serviceId,
      metricName,
      bootstrapTimestamp ?? startTimestamp,
      instanceIds
    )
    if (metricsByTimestamp.length === 0) {
      return { metricName, podsCount: targetPodsCount }
    }

    let bootstrapState = null
    if (bootstrapTimestamp !== null) {
      bootstrapState = await this.store.getState(
        appId,
        controllerId,
        serviceId,
        imageId,
        metricName,
        bootstrapTimestamp
      )
    }

    const threshold = await this.store.getServiceMetricThreshold(appId, controllerId, serviceId, metricName)

    const scaling = getTargetPodsCount({
      metricsByTimestamp,
      podsCountHistory,
      instances,
      config,
      threshold,
      bootstrapState,
      now,
      targetPodsCount,
      horizonMs,
      podsConfig: appConfig.pods,
      horizontalTrendThreshold: this.#config.horizontalTrendThreshold,
      scaleUpK: this.#config.scaleUpK,
      scaleUpMargin: this.#config.scaleUpMargin,
      scaleDownMargin: this.#config.scaleDownMargin
    })
    if (scaling === null) {
      return { metricName, podsCount: targetPodsCount }
    }

    const { level, trend, podsCount, stateByTimestamp } = scaling
    const lastTimestamp = metricsByTimestamp.at(-1).timestamp
    const prediction = {
      now,
      initTimeoutMs,
      horizonMs,
      threshold,
      prediction: generatePredictionPoints({ level, trend, ...appState })
    }

    // Store states, history, prediction and clear processed batches
    await Promise.all([
      this.store.saveStates(appId, controllerId, serviceId, imageId, metricName, stateByTimestamp, startTimestamp, lastTimestamp, windowMs),
      this.store.saveHistory(appId, controllerId, serviceId, imageId, metricName, stateByTimestamp, startTimestamp, windowMs, true),
      this.store.saveMetricPrediction(appId, controllerId, serviceId, imageId, metricName, prediction, windowMs),
      this.store.clearProcessedBatches(appId, controllerId, serviceId, imageId, metricName, lastTimestamp)
    ])

    return { metricName, podsCount }
  }

  async #getProcessingTimestamps (
    appId,
    controllerId,
    serviceId,
    imageId,
    metric,
    firstBatchStart,
    windowStart,
    sampleInterval
  ) {
    let lastProcessedTimestamp = await this.store.getLastProcessedTimestamp(appId, controllerId, serviceId, imageId, metric)

    // Invalidate expired state
    if (
      lastProcessedTimestamp !== null &&
      lastProcessedTimestamp < windowStart
    ) {
      lastProcessedTimestamp = null
    }

    // Clamp to window
    if (firstBatchStart < windowStart) {
      firstBatchStart = windowStart
    }

    // Calculate processing range
    let bootstrapTimestamp = null
    let startTimestamp = firstBatchStart

    if (lastProcessedTimestamp !== null) {
      if (lastProcessedTimestamp < startTimestamp) {
        startTimestamp = lastProcessedTimestamp + sampleInterval
      }
      bootstrapTimestamp = startTimestamp - sampleInterval
    }

    return { startTimestamp, bootstrapTimestamp }
  }

  async #checkScaling ({
    appId,
    controllerId,
    appConfig,
    newTargetPodsCount,
    triggerServiceId,
    triggerMetricName,
    appState,
    scale
  }) {
    if (newTargetPodsCount === appState.targetPodsCount) return

    if (newTargetPodsCount > appState.targetPodsCount) {
      await this.#checkScalingUp({
        appId,
        controllerId,
        appConfig,
        newTargetPodsCount,
        triggerServiceId,
        triggerMetricName,
        appState,
        scale
      })
    } else {
      await this.#checkScalingDown({
        appId,
        controllerId,
        appConfig,
        newTargetPodsCount,
        appState,
        scale
      })
    }
  }

  async #checkScalingUp ({
    appId,
    controllerId,
    appConfig,
    newTargetPodsCount,
    triggerServiceId,
    triggerMetricName,
    appState,
    scale
  }) {
    const { now, initTimeoutMs, targetPodsCount } = appState
    const {
      scaleUpAfterScaleUpMs,
      scaleUpAfterScaleDownMs
    } = appConfig.cooldowns

    const [lastScaleUpTime, lastScaleDownTime] = await Promise.all([
      this.store.getLastScaleUpTime(appId, controllerId),
      this.store.getLastScaleDownTime(appId, controllerId)
    ])

    if (lastScaleUpTime) {
      const timeSinceLastScaleUp = now - lastScaleUpTime
      if (timeSinceLastScaleUp < scaleUpAfterScaleUpMs) return
    }

    if (lastScaleDownTime) {
      const timeSinceLastScaleDown = now - lastScaleDownTime
      if (timeSinceLastScaleDown < scaleUpAfterScaleDownMs) return
    }

    // Create pending scale-up event
    const scaleAt = now + initTimeoutMs
    const scaleUpCount = newTargetPodsCount - targetPodsCount

    await this.#processScaling(appId, controllerId, newTargetPodsCount, scale, {
      triggerService: triggerServiceId,
      triggerMetric: triggerMetricName
    })

    await Promise.all([
      this.store.addPendingScaleUp(appId, controllerId, scaleUpCount, scaleAt, now),
      this.store.setLastScaleUpTime(appId, controllerId, now)
    ])

    appState.targetPodsCount = newTargetPodsCount
  }

  async #checkScalingDown ({
    appId,
    controllerId,
    appConfig,
    newTargetPodsCount,
    appState,
    scale
  }) {
    const { now } = appState
    const {
      scaleDownAfterScaleUpMs,
      scaleDownAfterScaleDownMs
    } = appConfig.cooldowns

    const [
      lastScaleDownTime,
      lastStartTime,
      hasPendingScaleUps
    ] = await Promise.all([
      this.store.getLastScaleDownTime(appId, controllerId),
      this.store.getLastInstanceStartTime(appId, controllerId),
      this.store.hasPendingScaleUps(appId, controllerId, now, this.#config.pendingScaleUpExpiryMs)
    ])

    // Don't scale down while there are pending scale-up requests
    if (hasPendingScaleUps) return

    if (lastStartTime) {
      const timeSinceLastStart = now - lastStartTime
      if (timeSinceLastStart < scaleDownAfterScaleUpMs) return
    }

    if (lastScaleDownTime) {
      const timeSinceLastScaleDown = now - lastScaleDownTime
      if (timeSinceLastScaleDown < scaleDownAfterScaleDownMs) return
    }

    await this.#processScaling(appId, controllerId, newTargetPodsCount, scale)

    await Promise.all([
      this.store.setLastScaleDownTime(appId, controllerId, now)
    ])

    appState.targetPodsCount = newTargetPodsCount
  }

  async #processScaling (appId, controllerId, newTargetPodsCount, scale, options = {}) {
    const snapshots = await this.getAppMetricsSnapshots(appId, controllerId)
    await scale(newTargetPodsCount, { ...options, snapshots })
  }

  async #getInitTimeout (appId, controllerId) {
    const initTimeout = await this.store.getInitTimeout(appId, controllerId)
    if (initTimeout !== null) {
      return initTimeout
    }

    const { minInitTimeoutMs } = await this.getApplicationConfig(appId)
    await this.store.setInitTimeout(appId, controllerId, minInitTimeoutMs)

    return minInitTimeoutMs
  }

  async #updateInitTimeout (appId, controllerId, measurement) {
    const [window, currentTimeout, appConfig] = await Promise.all([
      this.store.addInitTimeoutMeasurment(appId, controllerId, measurement, this.#initTimeoutConfig.windowSize),
      this.#getInitTimeout(appId, controllerId),
      this.getApplicationConfig(appId)
    ])
    const newTimeout = Math.max(
      calculateInitTimeout(window, currentTimeout, this.#initTimeoutConfig),
      appConfig.minInitTimeoutMs
    )
    await this.store.setInitTimeout(appId, controllerId, newTimeout)
  }

  async #getPendingScaleUps (appId, controllerId, now) {
    const pendingScaleUps = await this.store.getPendingScaleUps(
      appId, controllerId, now, this.#config.pendingScaleUpExpiryMs
    )

    const shiftThreshold = now + 1000
    const result = []
    let prev = null

    for (const event of pendingScaleUps) {
      let scaleAt = event.scaleAt
      if (scaleAt <= shiftThreshold) {
        scaleAt = shiftThreshold
      }

      if (prev && prev.scaleAt === scaleAt) {
        prev.count++
      } else {
        prev = { scaleAt, count: 1 }
        result.push(prev)
      }
    }

    return result
  }

  async getServices (appId, controllerId) {
    const appConfig = await this.getApplicationConfig(appId)
    const { imageId } = await getClusterState(
      this.store, appId, controllerId, Date.now(), appConfig.instancesWindowMs, this.#config.redeployTimeoutMs
    )
    if (imageId === null) return []
    return this.store.getServices(appId, controllerId, imageId)
  }

  async getAppMetricsSnapshots (appId, controllerId) {
    const appConfig = await this.getApplicationConfig(appId)
    const { imageId } = await getClusterState(
      this.store, appId, controllerId, Date.now(), appConfig.instancesWindowMs, this.#config.redeployTimeoutMs
    )

    if (imageId === null) return null

    const services = await this.store.getServices(appId, controllerId, imageId)
    const entries = await Promise.all(services.map(async (serviceId) => {
      const snapshots = await this.#getServiceMetricsSnapshot(
        appId,
        controllerId,
        serviceId,
        imageId,
        appConfig
      )
      return [serviceId, snapshots]
    }))

    return Object.fromEntries(entries)
  }

  async getApplicationConfig (appId) {
    const cached = await this.store.getAppConfig(appId)
    if (cached) return cached

    const config = await this.#api.getApplicationConfig(appId)
    await this.store.setAppConfig(appId, config)
    return config
  }

  async #getServiceMetricsSnapshot (appId, controllerId, serviceId, imageId, appConfig) {
    const serviceConfig = await getServiceConfig(this.store, appId, serviceId, appConfig)
    const [elu, heap] = await Promise.all([
      this.#getMetricSnapshot(appId, controllerId, serviceId, imageId, 'elu', serviceConfig),
      this.#getMetricSnapshot(appId, controllerId, serviceId, imageId, 'heap', serviceConfig)
    ])
    return { elu, heap }
  }

  async #getMetricSnapshot (appId, controllerId, serviceId, imageId, metricName, serviceConfig) {
    const [history, predictionData] = await Promise.all([
      this.store.getHistory(appId, controllerId, serviceId, imageId, metricName),
      this.store.getMetricPrediction(appId, controllerId, serviceId, imageId, metricName)
    ])
    if (predictionData === null) return null
    const { prediction, now, initTimeoutMs, horizonMs, threshold } = predictionData
    return { history, prediction, now, initTimeoutMs, horizonMs, threshold }
  }

  async getAlignedInstanceMetrics (appId, controllerId, serviceId) {
    const appConfig = await this.getApplicationConfig(appId)
    const now = Date.now()
    const { imageId, instances } = await getClusterState(
      this.store, appId, controllerId, now, appConfig.instancesWindowMs, this.#config.redeployTimeoutMs
    )

    if (imageId === null) return { elu: [], heap: [] }

    const instanceIds = Object.keys(instances)
    if (instanceIds.length === 0) return { elu: [], heap: [] }

    const serviceConfig = await getServiceConfig(this.store, appId, serviceId, appConfig)
    const eluWindowStart = now - serviceConfig.elu.windowMs
    const heapWindowStart = now - serviceConfig.heap.windowMs

    const [elu, heap] = await Promise.all([
      this.store.getAlignedValues(appId, controllerId, serviceId, 'elu', eluWindowStart, instanceIds),
      this.store.getAlignedValues(appId, controllerId, serviceId, 'heap', heapWindowStart, instanceIds)
    ])

    return { elu, heap }
  }
}

module.exports = { LoadPredictor }
