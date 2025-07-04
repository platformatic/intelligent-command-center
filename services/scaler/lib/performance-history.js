'use strict'

const {
  processPodMetrics,
  calculatePreMetrics,
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
   * Saves a single performance history event to database
   * Updates if already exists (based on application_id and event_timestamp)
   * @param {string} applicationId - Application ID
   * @param {Object} event - Performance history event
   * @param {string} source - Event source ('signal' or 'prediction'), defaults to 'signal'
   */
  async saveEvent (applicationId, event, source = 'signal') {
    const eventData = {
      applicationId,
      eventTimestamp: new Date(event.timestamp),
      podsAdded: event.podsAdded,
      totalPods: event.totalPods,
      preEluMean: event.preEluMean,
      preHeapMean: event.preHeapMean,
      preEluTrend: event.preEluTrend,
      preHeapTrend: event.preHeapTrend,
      deltaElu: event.deltaElu,
      deltaHeap: event.deltaHeap,
      sigmaElu: event.sigmaElu,
      sigmaHeap: event.sigmaHeap,
      successScore: event.successScore || 0,
      source
    }

    const existing = await this.#app.platformatic.entities.performanceHistory.find({
      where: {
        applicationId: {
          eq: applicationId
        },
        eventTimestamp: {
          eq: eventData.eventTimestamp
        }
      }
    })

    if (existing && existing.length > 0) {
      await this.#app.platformatic.entities.performanceHistory.save({
        input: {
          id: existing[0].id,
          ...eventData,
          updatedAt: new Date()
        }
      })
      this.#log.debug({ applicationId, eventTimestamp: event.timestamp }, 'Updated existing performance history record')
    } else {
      await this.#app.platformatic.entities.performanceHistory.save({
        input: eventData
      })
      this.#log.debug({ applicationId, eventTimestamp: event.timestamp }, 'Saved new performance history record')
    }
  }

  /**
   * Gets performance history from database for analysis
   * @param {Object} options - Query options
   * @param {string} options.applicationId - Application ID to filter by
   * @param {Date} options.startDate - Start date for filtering
   * @param {Date} options.endDate - End date for filtering
   * @param {number} options.limit - Maximum number of records (default 100)
   * @returns {Array} Performance history records
   */
  async getPerformanceHistory (options = {}) {
    const { applicationId, startDate, endDate, limit = 100 } = options

    const where = {}

    if (applicationId) {
      where.applicationId = { eq: applicationId }
    }

    if (startDate || endDate) {
      where.eventTimestamp = {}
      if (startDate) where.eventTimestamp.gte = startDate
      if (endDate) where.eventTimestamp.lte = endDate
    }

    // Handle pagination if limit exceeds database maximum (1000)
    const maxDbLimit = 1000

    if (limit <= maxDbLimit) {
      // Single query for small limits
      const records = await this.#app.platformatic.entities.performanceHistory.find({
        where,
        orderBy: [{ field: 'eventTimestamp', direction: 'DESC' }],
        limit
      })
      return records
    }

    // Paginated queries for large limits
    const allRecords = []
    let offset = 0
    let remainingLimit = limit

    while (remainingLimit > 0 && allRecords.length < limit) {
      const batchLimit = Math.min(remainingLimit, maxDbLimit)

      const batchRecords = await this.#app.platformatic.entities.performanceHistory.find({
        where,
        orderBy: [{ field: 'eventTimestamp', direction: 'DESC' }],
        limit: batchLimit,
        offset
      })

      if (batchRecords.length === 0) {
        // No more records available
        break
      }

      allRecords.push(...batchRecords)
      offset += batchRecords.length
      remainingLimit -= batchRecords.length

      // If we got fewer records than requested, we've reached the end
      if (batchRecords.length < batchLimit) {
        break
      }
    }

    return allRecords
  }

  /**
   * Records the scaling event and schedules post-scaling evaluation.
   * This function handles:
   * - Updating last scaling time
   * - Recording performance history events
   * - Scheduling post-scaling evaluation
   *
   * @param {Object} scaling - The scaling parameters
   * @param {string} scaling.applicationId - The ID of the application being scaled
   * @param {number} scaling.actualPodsChange - Actual pods added/removed (positive for scale-up, negative for scale-down)
   * @param {number} scaling.totalPods - Total number of pods after scaling
   * @param {Object} scaling.preMetrics - Pre-scaling metrics (eluMean, heapMean, eluTrend, heapTrend)
   * @param {string} [scaling.source='signal'] - Source of scaling decision ('signal' or 'prediction')
   * @param {number} [scaling.postScalingWindow=300] - Post-scaling evaluation window in seconds
   * @param {number} [scaling.maxHistoryEvents=10] - Maximum history events to keep
   * @param {number} [scaling.eluThreshold=0.9] - ELU threshold for evaluation
   * @param {number} [scaling.heapThreshold=0.85] - Heap threshold for evaluation
   */
  async scalingEvaluation (scaling) {
    const {
      applicationId,
      actualPodsChange,
      totalPods,
      preMetrics,
      source = 'signal',
      predictionData,
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

    // Update last scaling time
    await store.saveLastScalingTime(applicationId, now)

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
      source,
      successScore: 0 // Will be calculated during post-scaling evaluation
    }

    // Store prediction data if provided
    if (source === 'prediction' && predictionData) {
      preScalingMetrics.predictionConfidence = predictionData.confidence
      preScalingMetrics.predictionTimeOfDay = predictionData.timeOfDay
      preScalingMetrics.predictionReasons = predictionData.reasons
    }

    // Add performance history event
    await store.addPerfHistoryEvent(applicationId, preScalingMetrics, maxHistoryEvents)

    // Schedule post-scaling evaluation
    this.schedulePostScalingEvaluation({
      applicationId,
      scalingTimestamp: preScalingMetrics.timestamp,
      postScalingWindow,
      log,
      store,
      metrics,
      eluThreshold,
      heapThreshold
    })

    // Save performance history event to database
    await this.savePerfHistoryEventToDatabase(log, applicationId, preScalingMetrics)

    log.info({
      applicationId,
      actualPodsChange,
      source
    }, 'Recorded scaling event')
  }

  /**
   * Schedules a post-scaling evaluation after the specified window
   */
  schedulePostScalingEvaluation (params) {
    const {
      applicationId,
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
   * Saves performance history event to database
   */
  async savePerfHistoryEventToDatabase (log, applicationId, event) {
    try {
      await this.saveEvent(applicationId, event, 'signal')
    } catch (err) {
      log.error({ err, applicationId, eventTimestamp: event.timestamp },
        'Failed to save performance history event to database')
    }
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
      scalingTimestamp,
      store,
      log,
      metrics,
      eluThreshold = 0.9,
      heapThreshold = 0.85
    } = params

    const history = await store.loadPerfHistory(applicationId)

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
      const clusters = await store.loadClusters(applicationId)
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

      // Calculate success score based on the mathematical specification
      // For signal-based events, success score is always 1.0
      // For prediction-based events, calculate based on responsiveness and resource optimization
      let successScore = 1.0

      if (event.source === 'prediction') {
        // Responsiveness score: 0.7 weight for metrics below thresholds, 0.3 for low variability
        const responsivenessScore =
          0.7 * ((postEluMean < eluThreshold && postHeapMean < heapThreshold) ? 1 : 0) +
          0.3 * Math.max(0, 1 - ((event.sigmaElu + event.sigmaHeap) / 0.2))

        // Resource optimization score: how close we are to optimal pod count
        const optimalPods = Math.ceil(event.preEluMean * Object.keys(processedPods).length / eluThreshold)
        const resourceScore = Math.max(0, 1 - (Math.abs(event.podsAdded) - optimalPods) / Object.keys(processedPods).length)

        // Final success score: 0.6 responsiveness + 0.4 resource optimization
        successScore = 0.6 * responsivenessScore + 0.4 * resourceScore
      }

      event.successScore = successScore

      // Calculate performance score (for clustering)
      const performance = 0.6 * Math.min(1, Math.max(0, -((event.deltaElu + event.deltaHeap) / 0.2))) +
                          0.4 * Math.max(0, 1 - ((event.sigmaElu + event.sigmaHeap) / 0.2))

      // Save updated history
      await store.savePerfHistory(applicationId, history)

      // Update clusters with the complete event
      await updateClusters(store, applicationId, event)

      // Save performance history event to database
      try {
        await this.saveEvent(applicationId, event, 'signal')
        // c8 ignore next
      } catch (err) {
        log.error({ err, applicationId, eventTimestamp: event.timestamp },
          'Failed to save performance history event to database')
      }

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

  /**
   * Performs scaling evaluation for prediction-based scaling decisions
   *
   * This method handles prediction-based scaling by:
   * 1. Fetching current real-time metrics for the application
   * 2. Processing the metrics to get current state
   * 3. Recording the scaling event with prediction context
   *
   * @param {Object} params - The parameters for prediction scaling
   * @param {string} params.applicationId - The ID of the application being scaled
   * @param {Object} params.prediction - The prediction to apply
   * @param {string} params.prediction.action - 'up' or 'down'
   * @param {number} params.prediction.pods - Number of pods to add/remove
   * @param {number} params.prediction.confidence - Prediction confidence (0-1)
   * @param {number} params.prediction.timeOfDay - Time of day for the prediction
   * @param {Object} params.prediction.reasons - Prediction reasoning context
   * @param {number} [params.postScalingWindow=300] - Post-scaling evaluation window in seconds
   * @param {number} [params.maxHistoryEvents=10] - Maximum history events to keep
   * @param {number} [params.eluThreshold=0.9] - ELU threshold for evaluation
   * @param {number} [params.heapThreshold=0.85] - Heap threshold for evaluation
   * @returns {Object} Object containing success status and any error
   */
  async scalingEvaluationForPrediction (params) {
    const {
      applicationId,
      prediction,
      postScalingWindow = 300,
      maxHistoryEvents = 10,
      eluThreshold = 0.9,
      heapThreshold = 0.85
    } = params

    const log = this.#app.log
    const store = this.#app.store
    const metrics = this.#app.scalerMetrics

    try {
      // Get current metrics for the application
      const currentPodMetrics = await metrics.getApplicationMetrics(applicationId)

      if (!currentPodMetrics || Object.keys(currentPodMetrics).length === 0) {
        log.warn({ applicationId, prediction }, 'No metrics available for prediction application')
        return {
          success: false,
          error: 'No metrics available for application'
        }
      }

      // Load clusters for performance scoring
      const clusters = await store.loadClusters(applicationId)

      // Process current pod metrics
      const processedPods = {}
      for (const [podId, podMetrics] of Object.entries(currentPodMetrics)) {
        processedPods[podId] = processPodMetrics(podMetrics, clusters, eluThreshold, heapThreshold)
      }

      // Calculate current pre-metrics
      const preMetrics = calculatePreMetrics(processedPods)

      const currentPodCount = Object.keys(processedPods).length
      const actualPodsChange = prediction.pods - currentPodCount
      const totalPods = currentPodCount

      // Apply the prediction with current metrics
      await this.scalingEvaluation({
        applicationId,
        actualPodsChange,
        totalPods,
        preMetrics,
        source: 'prediction',
        predictionData: {
          confidence: prediction.confidence,
          timeOfDay: prediction.timeOfDay,
          reasons: prediction.reasons
        },
        postScalingWindow,
        maxHistoryEvents,
        processPodMetrics: (podMetrics, clusters) => processPodMetrics(podMetrics, clusters, eluThreshold, heapThreshold),
        updateClusters: (applicationId, newEvent) => updateClusters(this.#app.store, applicationId, newEvent),
        eluThreshold,
        heapThreshold
      })

      log.info({
        applicationId,
        prediction: {
          action: prediction.action,
          pods: prediction.pods,
          confidence: prediction.confidence
        },
        currentMetrics: {
          eluMean: preMetrics.eluMean,
          heapMean: preMetrics.heapMean
        }
      }, 'Applied prediction-based scaling evaluation')

      return {
        success: true,
        actualPodsChange,
        preMetrics
      }
    } catch (err) {
      log.error({ err, applicationId, prediction }, 'Error in prediction-based scaling evaluation')
      return {
        success: false,
        error: err.message
      }
    }
  }
}

module.exports = PerformanceHistory
