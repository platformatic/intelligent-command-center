'use strict'

const {
  processPodMetrics,
  updateClusters
} = require('./scaling-algorithm-utils')

class PerformanceHistory {
  #log
  #app

  constructor (app) {
    this.#app = app
    this.#log = app.log
  }

  /**
   * Records the scaling event and schedules post-scaling evaluation.
   * This function handles:
   * - Recording performance history events (in the Valkey ring buffer)
   * - Scheduling post-scaling evaluation
   *
   * @param {Object} scaling - The scaling parameters
   * @param {string} scaling.applicationId - The ID of the application being scaled
   * @param {number} scaling.actualPodsChange - Actual pods added/removed (positive for scale-up, negative for scale-down)
   * @param {number} scaling.totalPods - Total number of pods after scaling
   * @param {Object} scaling.preMetrics - Pre-scaling metrics (eluMean, heapMean, eluTrend, heapTrend)
   * @param {number} [scaling.postScalingWindow=300] - Post-scaling evaluation window in seconds
   * @param {number} [scaling.maxHistoryEvents=10] - Maximum history events to keep
   * @param {number} [scaling.eluThreshold=0.9] - ELU threshold for evaluation
   * @param {number} [scaling.heapThreshold=0.85] - Heap threshold for evaluation
   */
  async scalingEvaluation (scaling) {
    const {
      applicationId,
      controllerId = null,
      actualPodsChange,
      totalPods,
      preMetrics,
      postScalingWindow = 300,
      maxHistoryEvents = 10,
      eluThreshold = 0.9,
      heapThreshold = 0.85
    } = scaling

    // Extract services from app
    const store = this.#app.store
    const log = this.#app.log
    const metrics = this.#app.scalerMetrics

    const now = Date.now()

    // Record pre-scaling metrics for performance history
    const preScalingMetrics = {
      timestamp: now,
      podsAdded: actualPodsChange, // Positive for scale-up, negative for scale-down
      totalPods, // Total number of pods after scaling
      preEluMean: preMetrics.eluMean || 0, // c8: ignore this line
      preHeapMean: preMetrics.heapMean || 0, // c8: ignore this line
      preEluTrend: preMetrics.eluTrend || 0,
      preHeapTrend: preMetrics.heapTrend || 0,
      // These will be updated after post-scaling evaluation
      deltaElu: 0,
      deltaHeap: 0,
      sigmaElu: 0,
      sigmaHeap: 0,
      successScore: 0 // Will be calculated during post-scaling evaluation
    }

    // Add performance history event
    await store.addPerfHistoryEvent(applicationId, preScalingMetrics, maxHistoryEvents, controllerId)

    // Schedule post-scaling evaluation
    this.schedulePostScalingEvaluation({
      applicationId,
      controllerId,
      scalingTimestamp: preScalingMetrics.timestamp,
      postScalingWindow,
      log,
      store,
      metrics,
      eluThreshold,
      heapThreshold
    })

    log.info({
      applicationId,
      actualPodsChange
    }, 'Recorded scaling event')
  }

  /**
   * Schedules a post-scaling evaluation after the specified window
   */
  schedulePostScalingEvaluation (params) {
    const {
      applicationId,
      controllerId = null,
      scalingTimestamp,
      postScalingWindow,
      log,
      store,
      metrics,
      eluThreshold,
      heapThreshold
    } = params

    const delay = postScalingWindow * 1000

    // Skip scheduling if configured to do so (mainly for testing)
    if (process.env.SKIP_POST_SCALING_EVALUATION === 'true') {
      log.debug({ applicationId, scalingTimestamp }, 'Skipping post-scaling evaluation as configured')
      return
    }

    setTimeout(async () => {
      try {
        await this.postScalingEvaluation({
          applicationId,
          controllerId,
          scalingTimestamp,
          store,
          log,
          metrics,
          eluThreshold,
          heapThreshold
        })
      } catch (err) {
        log.error({ err, applicationId }, 'Error in post-scaling evaluation')
      }
    }, delay)
  }

  /**
   * Performs post-scaling evaluation after a scaling decision has been applied
   *
   * @param {Object} params - The parameters for post-scaling evaluation
   * @param {string} params.applicationId - The ID of the application being evaluated
   * @param {number} params.scalingTimestamp - Timestamp of the scaling event to evaluate
   * @param {Object} params.store - Store instance for data persistence
   * @param {Object} params.log - Logger instance
   * @param {Object} [params.metrics] - Metrics service instance
   * @param {number} [params.eluThreshold=0.9] - ELU threshold for evaluation
   * @param {number} [params.heapThreshold=0.85] - Heap threshold for evaluation
   */
  async postScalingEvaluation (params) {
    const {
      applicationId,
      controllerId = null,
      scalingTimestamp,
      store,
      log,
      metrics,
      eluThreshold = 0.9,
      heapThreshold = 0.85
    } = params

    const history = await store.loadPerfHistory(applicationId, controllerId)

    // Find the event matching this timestamp
    const eventIndex = history.findIndex(e => e.timestamp === scalingTimestamp)
    if (eventIndex === -1) {
      log.warn({ applicationId, scalingTimestamp }, 'Post-scaling evaluation: event not found')
      return
    }

    // Get current metrics
    try {
      // Fetch current application metrics using the metrics service
      let podsMetrics = {}

      if (metrics) {
        try {
          podsMetrics = await metrics.getApplicationMetrics(applicationId)
        } catch (err) {
          log.error({ err, applicationId }, 'Error fetching metrics for post-scaling evaluation')
          podsMetrics = {}
        }
      }

      if (!podsMetrics || Object.keys(podsMetrics).length === 0) {
        log.warn({ applicationId }, 'Post-scaling evaluation: no metrics available')
        return
      }

      // Process current pod metrics (without considering scaling decisions)
      const clusters = await store.loadClusters(applicationId, controllerId)
      const processedPods = {}

      for (const [id, metrics] of Object.entries(podsMetrics)) {
        processedPods[id] = processPodMetrics(metrics, clusters, eluThreshold, heapThreshold)
      }

      // Calculate post-scaling metrics
      const postEluMean = Object.values(processedPods).reduce((sum, p) => sum + p.eluMean, 0) / Object.keys(processedPods).length
      const postHeapMean = Object.values(processedPods).reduce((sum, p) => sum + p.heapMean, 0) / Object.keys(processedPods).length
      const postEluVariability = Object.values(processedPods).reduce((sum, p) => sum + p.eluVariability, 0) / Object.keys(processedPods).length
      const postHeapVariability = Object.values(processedPods).reduce((sum, p) => sum + p.heapVariability, 0) / Object.keys(processedPods).length

      // Update history event with post-scaling metrics
      const event = history[eventIndex]
      event.deltaElu = postEluMean - event.preEluMean
      event.deltaHeap = postHeapMean - event.preHeapMean
      event.sigmaElu = postEluVariability
      event.sigmaHeap = postHeapVariability

      // Signal-based events always score 1.0
      event.successScore = 1.0

      // Calculate performance score (for clustering)
      const performance = 0.6 * Math.min(1, Math.max(0, -((event.deltaElu + event.deltaHeap) / 0.2))) +
                          0.4 * Math.max(0, 1 - ((event.sigmaElu + event.sigmaHeap) / 0.2))

      // Save updated history
      await store.savePerfHistory(applicationId, history, controllerId)

      // Update clusters with the complete event
      await updateClusters(store, applicationId, event, undefined, controllerId)

      log.info({
        applicationId,
        scalingTimestamp,
        deltaElu: event.deltaElu,
        deltaHeap: event.deltaHeap,
        performance
      }, 'Post-scaling evaluation completed')
    } catch (err) {
      log.error({ err, applicationId }, 'Error processing post-scaling metrics')
    }
  }
}

module.exports = PerformanceHistory
