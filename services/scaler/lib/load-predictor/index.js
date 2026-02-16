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
  #store
  #appStates = new Map()

  constructor (config, defaultAppConfig, api, valkeyConfig) {
    this.#config = config
    this.#initTimeoutConfig = config.initTimeout
    this.#api = api
    this.#store = new AlgorithmStore(valkeyConfig)

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
    await this.#store.deleteAllConfigs()
  }

  async close () {
    for (const state of this.#appStates.values()) {
      if (state.timer) clearTimeout(state.timer)
    }
    this.#appStates.clear()
    await this.#store.close()
  }

  async onConnect (appId, imageId, podId, instanceId, timestamp) {
    await this.#registerInstance(appId, imageId, podId, instanceId, timestamp)
  }

  async #registerInstance (appId, imageId, podId, instanceId, timestamp, reconnect = true) {
    const { isNewInstance, isNewPod } = await addInstance(
      this.#store,
      appId,
      imageId,
      podId,
      instanceId,
      timestamp,
      reconnect
    )

    if (isNewInstance) {
      await this.#store.setLastInstanceStartTime(appId, timestamp)
    }

    if (isNewPod) {
      const appConfig = await this.#getApplicationConfig(appId)
      const { isRedeploying } = await getClusterState(
        this.#store, appId, timestamp, appConfig.instancesWindowMs, this.#config.redeployTimeoutMs
      )
      if (!isRedeploying) {
        const pending = await this.#store.removePendingScaleUp(appId)
        if (pending) {
          const initTime = timestamp - pending.decisionAt
          await this.#updateInitTimeout(appId, initTime)
        } else {
          console.warn('Warning: new pod connected but no pending scale-up found.')
        }
      }
    }
  }

  async onDisconnect (appId, instanceId, timestamp) {
    await terminateInstance(
      this.#store,
      appId,
      instanceId,
      timestamp,
      this.#config.reconnectTimeoutMs
    )
  }

  async saveInstanceMetrics ({
    applicationId,
    podId,
    instanceId,
    imageId,
    services,
    batchStartedAt
  }) {
    const [appConfig] = await Promise.all([
      this.#getApplicationConfig(applicationId),
      this.#registerInstance(
        applicationId,
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

  async checkScaling (applicationId) {
    const state = this.#getAppState(applicationId)
    if (state.processing || state.timer) return

    const appConfig = await this.#getApplicationConfig(applicationId)
    this.#scheduleProcessing(applicationId, appConfig.processingInitTimeoutMs)
  }

  async #saveServiceMetrics (appId, serviceId, imageId, instanceId, metrics, appConfig) {
    const { elu, heap } = metrics

    await Promise.all([
      this.#store.addService(appId, imageId, serviceId),
      this.#saveServiceMetric(appId, serviceId, imageId, instanceId, 'elu', elu, appConfig.elu),
      this.#saveServiceMetric(appId, serviceId, imageId, instanceId, 'heap', heap, appConfig.heap)
    ])
  }

  async #saveServiceMetric (appId, serviceId, imageId, instanceId, metricName, metric, metricConfig) {
    const { options, workers } = metric

    const threshold = options?.threshold
    if (threshold === undefined) {
      throw new Error(`Missing "${metricName}" threshold for service ${serviceId}`)
    }

    await Promise.all([
      this.#saveServiceMetricBatch(
        appId,
        serviceId,
        imageId,
        metricName,
        instanceId,
        workers,
        metricConfig
      ),
      this.#store.saveServiceMetricThreshold(appId, serviceId, metricName, threshold)
    ])
  }

  async #saveServiceMetricBatch (appId, serviceId, imageId, metricName, instanceId, workers, config) {
    if (Object.keys(workers).length === 0) return

    const { sampleInterval, windowMs } = config

    const prevSample = await this.#store.getLastInstanceMetricSample(appId, serviceId, instanceId, metricName)
    const { aligned, lastSample } = alignInstanceMetrics(workers, prevSample, sampleInterval)

    // Always save lastSample if we have one (matches old behavior where samples.at(-1)
    // was always stored regardless of alignment result)
    if (lastSample) {
      await this.#store.setLastInstanceMetricSample(appId, serviceId, instanceId, metricName, lastSample, windowMs)
    }

    if (aligned.length === 0) return

    await Promise.all([
      this.#store.setAlignedValues(appId, serviceId, instanceId, metricName, aligned, windowMs),
      this.#store.addBatchStart(appId, serviceId, imageId, metricName, aligned[0].timestamp)
    ])
  }

  async updateApplicationConfig (appId, override) {
    const current = await this.#getApplicationConfig(appId)
    const merged = deepmerge(current, override)
    await this.#store.setAppConfig(appId, merged)
  }

  async updateServiceConfig (appId, serviceId, config) {
    await this.#store.setServiceConfig(appId, serviceId, config)
  }

  #scheduleProcessing (appId, delayMs) {
    const state = this.#getAppState(appId)
    if (state.timer) return

    state.timer = setTimeout(() => {
      state.timer = null
      state.processing = true

      this.#checkForPendingBatches(appId)
        .catch(err => console.error('[LoadPredictor] Error in checkForPendingBatches:', err))
        .finally(() => { state.processing = false })
    }, delayMs).unref()
  }

  async #checkForPendingBatches (appId) {
    const now = Date.now()

    const appConfig = await this.#getApplicationConfig(appId)
    const { isRedeploying, imageId, instances, pods } = await getClusterState(
      this.#store, appId, now, appConfig.instancesWindowMs, this.#config.redeployTimeoutMs
    )

    if (isRedeploying) return

    const metricsByService = await this.#getPendingBatches(appId, imageId)
    if (!metricsByService) return

    try {
      await this.#processPendingBatches(
        appId,
        imageId,
        appConfig,
        metricsByService,
        now,
        instances,
        pods
      )
    } finally {
      this.#scheduleProcessing(appId, appConfig.processingCooldownMs)
    }
  }

  async #getPendingBatches (appId, imageId) {
    const services = await this.#store.getServices(appId, imageId)

    const metricsByService = {}
    let hasPending = false

    const batchChecks = services.map(async (serviceId) => {
      const [eluBatch, heapBatch] = await Promise.all([
        this.#store.getFirstBatchStart(appId, serviceId, imageId, 'elu'),
        this.#store.getFirstBatchStart(appId, serviceId, imageId, 'heap')
      ])
      if (eluBatch !== null || heapBatch !== null) {
        hasPending = true
        metricsByService[serviceId] = { elu: eluBatch, heap: heapBatch }
      }
    })
    await Promise.all(batchChecks)

    return hasPending ? metricsByService : null
  }

  #getAppState (appId) {
    let state = this.#appStates.get(appId)
    if (!state) {
      state = { processing: false, timer: null }
      this.#appStates.set(appId, state)
    }
    return state
  }

  async #processPendingBatches (appId, imageId, appConfig, serviceBatches, now, instances, pods) {
    const [pendingScaleUps, targetPodsCount, initTimeoutMs] = await Promise.all([
      this.#getPendingScaleUps(appId, now),
      this.#getTargetPodsCount(appId),
      this.#getInitTimeout(appId)
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

    await this.#checkScaling(appId, appConfig, maxTargetPodsCount, maxTargetServiceId, maxTargetMetricName, appState)
  }

  async #processPendingServiceBatches (appId, serviceId, imageId, batches, appConfig, appState) {
    const serviceConfig = await getServiceConfig(this.#store, appId, serviceId, appConfig)
    const promises = []

    if (batches.elu !== null) {
      promises.push(this.#processMetric({
        appId,
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
    const metricsByTimestamp = await this.#store.getAlignedValues(
      appId,
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
      bootstrapState = await this.#store.getState(
        appId,
        serviceId,
        imageId,
        metricName,
        bootstrapTimestamp
      )
    }

    const threshold = await this.#store.getServiceMetricThreshold(appId, serviceId, metricName)

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
      horizontalTrendThreshold: this.#config.horizontalTrendThreshold
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
      this.#store.saveStates(appId, serviceId, imageId, metricName, stateByTimestamp, startTimestamp, lastTimestamp, windowMs),
      this.#store.saveHistory(appId, serviceId, imageId, metricName, stateByTimestamp, startTimestamp, windowMs, true),
      this.#store.saveMetricPrediction(appId, serviceId, imageId, metricName, prediction, windowMs),
      this.#store.clearProcessedBatches(appId, serviceId, imageId, metricName, lastTimestamp)
    ])

    return { metricName, podsCount }
  }

  async #getProcessingTimestamps (
    appId,
    serviceId,
    imageId,
    metric,
    firstBatchStart,
    windowStart,
    sampleInterval
  ) {
    let lastProcessedTimestamp = await this.#store.getLastProcessedTimestamp(appId, serviceId, imageId, metric)

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

  async #checkScaling (appId, appConfig, newTargetPodsCount, triggerServiceId, triggerMetricName, appState) {
    if (newTargetPodsCount === appState.targetPodsCount) return

    if (newTargetPodsCount > appState.targetPodsCount) {
      await this.#checkScalingUp(
        appId,
        appConfig,
        newTargetPodsCount,
        triggerServiceId,
        triggerMetricName,
        appState
      )
    } else {
      await this.#checkScalingDown(
        appId,
        appConfig,
        newTargetPodsCount,
        appState
      )
    }
  }

  async #checkScalingUp (
    appId,
    appConfig,
    newTargetPodsCount,
    triggerServiceId,
    triggerMetricName,
    appState
  ) {
    const { now, initTimeoutMs, targetPodsCount } = appState
    const {
      scaleUpAfterScaleUpMs,
      scaleUpAfterScaleDownMs
    } = appConfig.cooldowns

    const [lastScaleUpTime, lastScaleDownTime] = await Promise.all([
      this.#store.getLastScaleUpTime(appId),
      this.#store.getLastScaleDownTime(appId)
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

    await this.#processScaling(appId, newTargetPodsCount)

    await Promise.all([
      this.#store.addPendingScaleUp(appId, scaleUpCount, scaleAt, now),
      this.#store.setLastScaleUpTime(appId, now),
      this.#store.setTargetPodsCount(appId, newTargetPodsCount)
    ])

    appState.targetPodsCount = newTargetPodsCount

    await this.#saveScaleEvent(appId, {
      direction: 'up',
      timestamp: now,
      from: targetPodsCount,
      to: newTargetPodsCount,
      triggerService: triggerServiceId,
      triggerMetric: triggerMetricName
    })
  }

  async #checkScalingDown (appId, appConfig, newTargetPodsCount, appState) {
    const { now, targetPodsCount } = appState
    const {
      scaleDownAfterScaleUpMs,
      scaleDownAfterScaleDownMs
    } = appConfig.cooldowns

    const [
      lastScaleDownTime,
      lastStartTime,
      hasPendingScaleUps
    ] = await Promise.all([
      this.#store.getLastScaleDownTime(appId),
      this.#store.getLastInstanceStartTime(appId),
      this.#store.hasPendingScaleUps(appId, now, this.#config.pendingScaleUpExpiryMs)
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

    await this.#processScaling(appId, newTargetPodsCount)

    await Promise.all([
      this.#store.setLastScaleDownTime(appId, now),
      this.#store.setTargetPodsCount(appId, newTargetPodsCount)
    ])

    appState.targetPodsCount = newTargetPodsCount

    await this.#saveScaleEvent(appId, {
      direction: 'down',
      timestamp: now,
      from: targetPodsCount,
      to: newTargetPodsCount
    })
  }

  async #processScaling (appId, newTargetPodsCount) {
    await this.#api.scale(appId, newTargetPodsCount)
  }

  async #getInitTimeout (appId) {
    const initTimeout = await this.#store.getInitTimeout(appId)
    if (initTimeout !== null) {
      return initTimeout
    }

    const { initTimeoutMs } = await this.#getApplicationConfig(appId)
    await this.#store.setInitTimeout(appId, initTimeoutMs)

    return initTimeoutMs
  }

  async #getTargetPodsCount (appId) {
    const targetPodsCount = await this.#store.getTargetPodsCount(appId)
    if (targetPodsCount !== null) {
      return targetPodsCount
    }

    const currentTarget = await this.#api.getCurrentPodsTarget(appId)
    await this.#store.setTargetPodsCount(appId, currentTarget)

    return currentTarget
  }

  async #updateInitTimeout (appId, measurement) {
    const [window, currentTimeout] = await Promise.all([
      this.#store.addInitTimeoutMeasurment(appId, measurement, this.#initTimeoutConfig.windowSize),
      this.#getInitTimeout(appId)
    ])
    const newTimeout = calculateInitTimeout(window, currentTimeout, this.#initTimeoutConfig)
    await this.#store.setInitTimeout(appId, newTimeout)
  }

  async #getPendingScaleUps (appId, now) {
    const pendingScaleUps = await this.#store.getPendingScaleUps(
      appId, now, this.#config.pendingScaleUpExpiryMs
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

  async getAppMetricsSnapshots (appId) {
    const appConfig = await this.#getApplicationConfig(appId)
    const { imageId } = await getClusterState(
      this.#store, appId, Date.now(), appConfig.instancesWindowMs, this.#config.redeployTimeoutMs
    )

    if (imageId === null) return null

    const services = await this.#store.getServices(appId, imageId)
    const entries = await Promise.all(services.map(async (serviceId) => {
      const snapshots = await this.#getServiceMetricsSnapshot(
        appId,
        serviceId,
        imageId,
        appConfig
      )
      return [serviceId, snapshots]
    }))

    return Object.fromEntries(entries)
  }

  async #getApplicationConfig (appId) {
    const cached = await this.#store.getAppConfig(appId)
    if (cached) return cached

    const config = await this.#api.getApplicationConfig(appId)
    await this.#store.setAppConfig(appId, config)
    return config
  }

  async #getServiceMetricsSnapshot (appId, serviceId, imageId, appConfig) {
    const serviceConfig = await getServiceConfig(this.#store, appId, serviceId, appConfig)
    const [elu, heap] = await Promise.all([
      this.#getMetricSnapshot(appId, serviceId, imageId, 'elu', serviceConfig),
      this.#getMetricSnapshot(appId, serviceId, imageId, 'heap', serviceConfig)
    ])
    return { elu, heap }
  }

  async #getMetricSnapshot (appId, serviceId, imageId, metricName, serviceConfig) {
    const [history, predictionData] = await Promise.all([
      this.#store.getHistory(appId, serviceId, imageId, metricName),
      this.#store.getMetricPrediction(appId, serviceId, imageId, metricName)
    ])
    if (predictionData === null) return null
    const { prediction, now, initTimeoutMs, horizonMs, threshold } = predictionData
    return { history, prediction, now, initTimeoutMs, horizonMs, threshold }
  }

  async getScalingEvents (appId) {
    return this.#store.getScalingEvents(appId)
  }

  async getScalingEvent (appId, id) {
    return this.#store.getScalingEvent(appId, id)
  }

  async getAlignedInstanceMetrics (appId, serviceId) {
    const appConfig = await this.#getApplicationConfig(appId)
    const now = Date.now()
    const { imageId, instances } = await getClusterState(
      this.#store, appId, now, appConfig.instancesWindowMs, this.#config.redeployTimeoutMs
    )

    if (imageId === null) return { elu: [], heap: [] }

    const instanceIds = Object.keys(instances)
    if (instanceIds.length === 0) return { elu: [], heap: [] }

    const serviceConfig = await getServiceConfig(this.#store, appId, serviceId, appConfig)
    const eluWindowStart = now - serviceConfig.elu.windowMs
    const heapWindowStart = now - serviceConfig.heap.windowMs

    const [elu, heap] = await Promise.all([
      this.#store.getAlignedValues(appId, serviceId, 'elu', eluWindowStart, instanceIds),
      this.#store.getAlignedValues(appId, serviceId, 'heap', heapWindowStart, instanceIds)
    ])

    return { elu, heap }
  }

  async #saveScaleEvent (appId, metadata) {
    metadata.snapshots = await this.getAppMetricsSnapshots(appId)
    await this.#store.saveScalingEvent(appId, metadata.timestamp, metadata)
  }
}

module.exports = { LoadPredictor }
