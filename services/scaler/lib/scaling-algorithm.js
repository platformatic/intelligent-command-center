'use strict'

const PREFIX = 'scaler:'
const PERF_HISTORY_PREFIX = `${PREFIX}perf-history:`
const CLUSTERS_PREFIX = `${PREFIX}clusters:`
const LAST_SCALING_PREFIX = `${PREFIX}last-scaling:`

class ScalingAlgorithm {
  constructor (store, log, options = {}) {
    this.store = store
    this.log = log
    this.maxHistoryEvents = options.maxHistoryEvents || 10
    this.maxClusters = options.maxClusters || 5
    this.eluThreshold = options.eluThreshold || 0.9
    this.heapThreshold = options.heapThreshold || 0.85
    this.postScalingWindow = options.postScalingWindow || 300
    this.cooldownPeriod = options.cooldownPeriod || 300
    this.minPodsDefault = options.minPodsDefault || 1
    this.maxPodsDefault = options.maxPodsDefault || 10
  }

  async loadPerfHistory (applicationId) {
    try {
      const key = `${PERF_HISTORY_PREFIX}${applicationId}`
      const historyStr = await this.store.redis.get(key)
      if (!historyStr) {
        return []
      }
      return JSON.parse(historyStr)
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to load performance history')
      return []
    }
  }

  async savePerfHistory (applicationId, history) {
    try {
      const key = `${PERF_HISTORY_PREFIX}${applicationId}`
      await this.store.redis.set(key, JSON.stringify(history))
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to save performance history')
    }
  }

  async loadClusters (applicationId) {
    try {
      const key = `${CLUSTERS_PREFIX}${applicationId}`
      const clustersStr = await this.store.redis.get(key)
      if (!clustersStr) {
        return []
      }
      return JSON.parse(clustersStr)
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to load clusters')
      return []
    }
  }

  async saveClusters (applicationId, clusters) {
    try {
      const key = `${CLUSTERS_PREFIX}${applicationId}`
      await this.store.redis.set(key, JSON.stringify(clusters))
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to save clusters')
    }
  }

  async getLastScalingTime (applicationId) {
    try {
      const key = `${LAST_SCALING_PREFIX}${applicationId}`
      const timeStr = await this.store.redis.get(key)
      return timeStr ? Number(timeStr) : 0
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to get last scaling time')
      return 0
    }
  }

  async saveLastScalingTime (applicationId, time) {
    try {
      const key = `${LAST_SCALING_PREFIX}${applicationId}`
      await this.store.redis.set(key, time.toString())
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to save last scaling time')
    }
  }

  async addPerfHistoryEvent (applicationId, event) {
    const history = await this.loadPerfHistory(applicationId)

    // Add new event
    history.push(event)

    // Sort by timestamp (newest first)
    history.sort((a, b) => b.timestamp - a.timestamp)

    // Trim to max size
    if (history.length > this.maxHistoryEvents) {
      history.length = this.maxHistoryEvents
    }

    await this.savePerfHistory(applicationId, history)
    return history
  }

  async updateClusters (applicationId, newEvent) {
    let clusters = await this.loadClusters(applicationId)

    // Calculate performance score for the new event
    const performanceScore = 0.6 * Math.min(1, Math.max(0, -((newEvent.deltaElu + newEvent.deltaHeap) / 0.2))) +
                            0.4 * Math.max(0, 1 - ((newEvent.sigmaElu + newEvent.sigmaHeap) / 0.2))

    if (clusters.length === 0) {
      // Create first cluster
      clusters = [{
        eluMean: newEvent.preEluMean,
        heapMean: newEvent.preHeapMean,
        eluTrendMean: newEvent.preEluTrend,
        heapTrendMean: newEvent.preHeapTrend,
        performanceScore,
        weight: 1
      }]
    } else {
      // Find closest cluster
      let minDistance = Infinity
      let closestCluster = -1

      for (let i = 0; i < clusters.length; i++) {
        const cluster = clusters[i]
        const distance = Math.sqrt(
          Math.pow(newEvent.preEluMean - cluster.eluMean, 2) +
          Math.pow(newEvent.preHeapMean - cluster.heapMean, 2) +
          Math.pow(newEvent.preEluTrend - cluster.eluTrendMean, 2) +
          Math.pow(newEvent.preHeapTrend - cluster.heapTrendMean, 2)
        )

        if (distance < minDistance) {
          minDistance = distance
          closestCluster = i
        }
      }

      if (clusters.length < this.maxClusters) {
        // If we have space, create a new cluster
        if (closestCluster === -1) {
          clusters.push({
            eluMean: newEvent.preEluMean,
            heapMean: newEvent.preHeapMean,
            eluTrendMean: newEvent.preEluTrend,
            heapTrendMean: newEvent.preHeapTrend,
            performanceScore,
            weight: 1
          })
        } else {
          // Update closest cluster
          const cluster = clusters[closestCluster]
          const newWeight = cluster.weight + 1
          cluster.eluMean = (cluster.eluMean * cluster.weight + newEvent.preEluMean) / newWeight
          cluster.heapMean = (cluster.heapMean * cluster.weight + newEvent.preHeapMean) / newWeight
          cluster.eluTrendMean = (cluster.eluTrendMean * cluster.weight + newEvent.preEluTrend) / newWeight
          cluster.heapTrendMean = (cluster.heapTrendMean * cluster.weight + newEvent.preHeapTrend) / newWeight
          cluster.performanceScore = (cluster.performanceScore * cluster.weight + performanceScore) / newWeight
          cluster.weight = newWeight
        }
      } else {
        // At max capacity - but instead of updating the closest cluster,
        // we'll replace the least weighted cluster
        if (closestCluster !== -1) {
          // First try to update the closest cluster if it exists
          const cluster = clusters[closestCluster]
          const newWeight = cluster.weight + 1
          cluster.eluMean = (cluster.eluMean * cluster.weight + newEvent.preEluMean) / newWeight
          cluster.heapMean = (cluster.heapMean * cluster.weight + newEvent.preHeapMean) / newWeight
          cluster.eluTrendMean = (cluster.eluTrendMean * cluster.weight + newEvent.preEluTrend) / newWeight
          cluster.heapTrendMean = (cluster.heapTrendMean * cluster.weight + newEvent.preHeapTrend) / newWeight
          cluster.performanceScore = (cluster.performanceScore * cluster.weight + performanceScore) / newWeight
          cluster.weight = newWeight
        } else {
          // Replace least weighted cluster
          let minWeight = Infinity
          let minIndex = -1

          for (let i = 0; i < clusters.length; i++) {
            if (clusters[i].weight < minWeight) {
              minWeight = clusters[i].weight
              minIndex = i
            }
          }

          if (minIndex !== -1) {
            clusters[minIndex] = {
              eluMean: newEvent.preEluMean,
              heapMean: newEvent.preHeapMean,
              eluTrendMean: newEvent.preEluTrend,
              heapTrendMean: newEvent.preHeapTrend,
              performanceScore,
              weight: 1
            }
          }
        }
      }
    }

    await this.saveClusters(applicationId, clusters)
    return clusters
  }

  calculateTrend (values) {
    const n = values.length
    if (n <= 1) return 0

    const xMean = (n + 1) / 2
    const yMean = values.reduce((sum, v) => sum + v, 0) / n

    let numerator = 0
    let denominator = 0

    for (let i = 1; i <= n; i++) {
      const x = i - xMean
      const y = values[i - 1] - yMean
      numerator += x * y
      denominator += x * x
    }

    return denominator !== 0 ? numerator / denominator : 0
  }

  calculateVariability (values) {
    const n = values.length
    if (n <= 1) return 0

    const mean = values.reduce((sum, v) => sum + v, 0) / n
    const sumSquaredDiff = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0)

    return Math.sqrt(sumSquaredDiff / n)
  }

  getPerformanceSuccessScore (podMetrics, clusters) {
    if (clusters.length === 0) {
      return 1.0 // Default when no history
    }

    // Calculate similarity for each cluster
    const similarities = clusters.map(cluster => {
      const distance = Math.sqrt(
        Math.pow(podMetrics.eluMean - cluster.eluMean, 2) +
        Math.pow(podMetrics.heapMean - cluster.heapMean, 2) +
        Math.pow(podMetrics.eluTrend - cluster.eluTrendMean, 2) +
        Math.pow(podMetrics.heapTrend - cluster.heapTrendMean, 2)
      )

      return {
        similarity: Math.exp(-distance),
        performance: cluster.performanceScore,
        weight: cluster.weight
      }
    })

    // Calculate weighted average
    const weightedSum = similarities.reduce((sum, s) => sum + s.similarity * s.weight * s.performance, 0)
    const totalWeight = similarities.reduce((sum, s) => sum + s.similarity * s.weight, 0)

    return totalWeight > 0 ? weightedSum / totalWeight : 1.0
  }

  calculateEluScore (podMetrics, performanceScore) {
    const thresholdComponent = 0.6 * Math.max(0, (podMetrics.eluMean - this.eluThreshold) / (1 - this.eluThreshold))
    const trendComponent = 0.25 * Math.min(100 * podMetrics.eluTrend, 1) * (podMetrics.eluTrend > 0 ? 1 : 0)
    const variabilityComponent = 0.15 * Math.min(podMetrics.eluVariability, 0.5)

    return performanceScore * (thresholdComponent + trendComponent + variabilityComponent)
  }

  calculateHeapScore (podMetrics, performanceScore) {
    const thresholdComponent = 0.6 * Math.max(0, (podMetrics.heapMean - this.heapThreshold) / (1 - this.heapThreshold))
    const trendComponent = 0.25 * Math.min(100 * podMetrics.heapTrend, 1) * (podMetrics.heapTrend > 0 ? 1 : 0)
    const variabilityComponent = 0.15 * Math.min(podMetrics.heapVariability, 0.5)

    return performanceScore * (thresholdComponent + trendComponent + variabilityComponent)
  }

  processPodMetrics (podMetrics, applicationId, clusters) {
    const eluValues = []
    const heapValues = []

    // Extract all ELU and HEAP values
    for (const data of podMetrics.eventLoopUtilization) {
      for (const [, value] of data.values) {
        eluValues.push(parseFloat(value))
      }
    }

    for (const data of podMetrics.heapSize) {
      for (const [, value] of data.values) {
        // Normalize heap data to [0, 1] range assuming max heap of 8GB
        const normalizedHeap = parseFloat(value) / (8 * 1024 * 1024 * 1024)
        heapValues.push(Math.min(1, normalizedHeap))
      }
    }

    // Calculate pod-level metrics
    const result = {
      eluMean: eluValues.length > 0 ? eluValues.reduce((a, b) => a + b, 0) / eluValues.length : 0,
      heapMean: heapValues.length > 0 ? heapValues.reduce((a, b) => a + b, 0) / heapValues.length : 0,
      eluTrend: this.calculateTrend(eluValues),
      heapTrend: this.calculateTrend(heapValues),
      eluVariability: this.calculateVariability(eluValues),
      heapVariability: this.calculateVariability(heapValues)
    }

    // Get performance success score
    result.performanceScore = this.getPerformanceSuccessScore(result, clusters)

    // Calculate ELU and HEAP scores
    result.eluScore = this.calculateEluScore(result, result.performanceScore)
    result.heapScore = this.calculateHeapScore(result, result.performanceScore)

    // Determine if scaling is required
    result.shouldScale = result.eluScore > 0.5 || result.heapScore > 0.5 || result.eluMean > (this.eluThreshold + 0.05)

    return result
  }

  /**
   * Calculates the final scaling decision based on pod metrics, alerts, and historical data.
   *
   * This method implements the scaling algorithm described in algorithm with two important enhancements:
   * 1. nfinal represents the total desired pod count after scaling (not just the increment),
   *    providing a clearer API compared to the mathematical representation
   * 2. Explicit enforcement of minimum pod count (N_min), which is mentioned in the notation
   *    of algorithm.tex but not explicitly implemented in the mathematical algorithm
   *
   * @param {string} applicationId - The ID of the application being scaled
   * @param {Object} podsMetrics - Metrics for all pods in the application
   * @param {number} currentPodCount - Current number of pods in the deployment
   * @param {number} minPods - Minimum number of pods required (uses default if undefined)
   * @param {number} maxPods - Maximum number of pods allowed (uses default if undefined)
   * @param {Array} alerts - Array of alerts related to this application
   * @returns {Object} Object containing nfinal (target total pod count) and optional reason
   */
  async calculateScalingDecision (applicationId, podsMetrics, currentPodCount, minPods, maxPods, alerts = []) {
    // Use class defaults if parameters are not provided
    const minPodsValue = minPods !== undefined ? minPods : this.minPodsDefault
    const maxPodsValue = maxPods !== undefined ? maxPods : this.maxPodsDefault
    // Load historical data
    const clusters = await this.loadClusters(applicationId)
    const lastScalingTime = await this.getLastScalingTime(applicationId)
    const now = Date.now()

    // Process all pod metrics
    const processedPods = {}
    let triggerCount = 0

    // Initialize pre-scaling metrics
    const preMetrics = {
      eluMean: 0,
      heapMean: 0,
      eluTrend: 0,
      heapTrend: 0
    }

    // First, merge metrics from alerts into podsMetrics
    for (const alert of alerts) {
      if (!alert.podId) continue

      // If we don't have metrics for this pod yet, initialize them
      if (!podsMetrics[alert.podId]) {
        podsMetrics[alert.podId] = {
          eventLoopUtilization: [],
          heapSize: []
        }
      }

      // Add alert metrics to pod metrics
      if (alert.type === 'elu') {
        // Convert percentage to decimal (alerts use percentages, metrics use decimals)
        const eluValue = alert.value / 100
        podsMetrics[alert.podId].eventLoopUtilization.push({
          metric: { podId: alert.podId },
          values: [[alert.timestamp || now, eluValue.toString()]]
        })

        this.log.debug({ podId: alert.podId, metric: 'elu', value: eluValue },
          'Added ELU metric from alert')
      } else if (alert.type === 'heap') {
        // For heap, we need to convert percentage to bytes
        // Assuming the percentage is of 8GB, which is mentioned in processPodMetrics
        const maxHeapBytes = 8 * 1024 * 1024 * 1024 // 8GB in bytes
        const heapBytes = (alert.value / 100) * maxHeapBytes

        podsMetrics[alert.podId].heapSize.push({
          metric: { podId: alert.podId },
          values: [[alert.timestamp || now, heapBytes.toString()]]
        })

        this.log.debug({ podId: alert.podId, metric: 'heap', value: heapBytes },
          'Added heap metric from alert')
      }
    }

    // Now process the merged metrics
    for (const [id, metrics] of Object.entries(podsMetrics)) {
      // Process the combined metrics data
      processedPods[id] = this.processPodMetrics(metrics, applicationId, clusters)

      if (processedPods[id].shouldScale) {
        this.log.info({ podId: id }, 'Pod triggered scaling')
        triggerCount++
      }
    }

    // Calculate pod count once after processing all metrics
    const podCount = Object.keys(processedPods).length

    // IMPORTANT: nfinal represents the total desired pod count after scaling,
    // not just the number of pods to add. This improves API clarity.

    // Check if we're below the minimum pod count
    // Note: This is an enhancement from the original algorithm, which mentions
    // N_min in the notation but doesn't explicitly enforce it
    if (currentPodCount < minPodsValue) {
      // Return the minimum pod count as the target total (nfinal)
      return {
        nfinal: minPodsValue,
        reason: 'Scaling to reach minimum pod count'
      }
    }

    // If no pods trigger scaling, check if we should scale down instead
    if (triggerCount === 0) {
      // NOTE: While algorithm primarily focuses on scale-up decisions and does not explicitly
      // describe a scale-down mechanism, we add scale-down functionality here to ensure
      // efficient resource utilization. This follows the approach in the reference implementation
      // which scales down when utilization is consistently below 50% of thresholds.
      // See: https://github.com/platformatic/scaler-algorithm/blob/main/index.js

      // Calculate average ELU and HEAP utilization across all pods
      const avgElu = Object.values(processedPods).reduce((sum, pod) => sum + pod.eluMean, 0) / podCount
      const avgHeap = Object.values(processedPods).reduce((sum, pod) => sum + pod.heapMean, 0) / podCount

      // Only scale down if utilization is low and we have more than the minimum pods
      if ((avgElu < this.eluThreshold * 0.5 || avgHeap < this.heapThreshold * 0.5) &&
          currentPodCount > minPodsValue &&
          now - lastScalingTime >= this.cooldownPeriod * 1000) {
        // Calculate the utilization ratio to determine scale down factor
        const utilizationRatio = Math.max(avgElu / this.eluThreshold, avgHeap / this.heapThreshold)
        // Max 30% reduction in pods when utilization is very low
        const scaleDownFactor = 0.3 * (1 - utilizationRatio)
        // Calculate pods to remove, minimum of 1
        const podsToRemove = Math.max(1, Math.floor(currentPodCount * scaleDownFactor))

        // Calculate new pod count, ensuring we don't go below minimum
        const newPodCount = Math.max(minPodsValue, currentPodCount - podsToRemove)

        // Only scale down if it actually reduces pod count
        if (newPodCount < currentPodCount) {
          this.log.info({
            applicationId,
            currentPodCount,
            newPodCount,
            avgElu,
            avgHeap
          }, 'Scaling down due to low utilization')

          // Update last scaling time
          await this.saveLastScalingTime(applicationId, now)

          // Record metrics for the scale-down event for learning
          const preScalingMetrics = {
            timestamp: now,
            podsAdded: newPodCount - currentPodCount, // Will be negative for scale down
            preEluMean: avgElu,
            preHeapMean: avgHeap,
            preEluTrend: preMetrics.eluTrend,
            preHeapTrend: preMetrics.heapTrend,
            deltaElu: 0,
            deltaHeap: 0,
            sigmaElu: 0,
            sigmaHeap: 0
          }

          // Store the event and schedule evaluation
          await this.addPerfHistoryEvent(applicationId, preScalingMetrics)
          this.schedulePostScalingEvaluation(applicationId, preScalingMetrics.timestamp)

          return {
            nfinal: newPodCount,
            reason: 'Scaling down due to low utilization'
          }
        }
      }

      // If we didn't scale down, return current pod count
      return { nfinal: currentPodCount, reason: 'No pods triggered scaling' }
    }

    if (now - lastScalingTime < this.cooldownPeriod * 1000) {
      return { nfinal: currentPodCount, reason: 'In cooldown period' }
    }

    // Populate pre-scaling metrics for metrics calculation

    // Calculate averages across all pods
    for (const pod of Object.values(processedPods)) {
      preMetrics.eluMean += pod.eluMean
      preMetrics.heapMean += pod.heapMean
      preMetrics.eluTrend += pod.eluTrend
      preMetrics.heapTrend += pod.heapTrend
    }

    // Use the previously calculated podCount
    if (podCount > 0) {
      preMetrics.eluMean /= podCount
      preMetrics.heapMean /= podCount
      preMetrics.eluTrend /= podCount
      preMetrics.heapTrend /= podCount
    }

    // Calculate base number of pods to add
    const loadRatio = triggerCount / podCount
    const baseScale = Math.max(1, Math.ceil(currentPodCount * loadRatio * 0.5))

    // Calculate average scores
    const avgEluScore = Object.values(processedPods).reduce((sum, p) => sum + p.eluScore, 0) / podCount
    const avgHeapScore = Object.values(processedPods).reduce((sum, p) => sum + p.heapScore, 0) / podCount
    const avgPerformanceScore = Object.values(processedPods).reduce((sum, p) => sum + p.performanceScore, 0) / podCount

    // Calculate final scale based on max score * performance factor
    const scoreFactor = Math.max(avgEluScore, avgHeapScore) * avgPerformanceScore
    let finalScale = baseScale

    if (scoreFactor > 0.7) {
      finalScale = Math.ceil(baseScale * (1 + 2 * (scoreFactor - 0.7)))
    }

    // Calculate the new total number of pods, ensuring we don't exceed max pods
    // podsToAdd is capped by available capacity to maxPods
    const podsToAdd = Math.min(finalScale, maxPodsValue - currentPodCount)
    const nfinal = currentPodCount + podsToAdd

    // If we're going to scale, update last scaling time
    if (podsToAdd > 0) {
      await this.saveLastScalingTime(applicationId, now)

      // Keep track of pre-scaling metrics for later analysis
      // The algorithm stores these metrics for post-scaling evaluation and learning
      const preScalingMetrics = {
        timestamp: now,
        podsAdded: podsToAdd, // We store the increment for history tracking
        preEluMean: preMetrics.eluMean,
        preHeapMean: preMetrics.heapMean,
        preEluTrend: preMetrics.eluTrend,
        preHeapTrend: preMetrics.heapTrend,
        // These will be updated after post-scaling evaluation
        deltaElu: 0,
        deltaHeap: 0,
        sigmaElu: 0,
        sigmaHeap: 0
      }

      // We'll update this event with post-scaling metrics after evaluationWindow
      await this.addPerfHistoryEvent(applicationId, preScalingMetrics)

      // Schedule a post-scaling evaluation
      this.schedulePostScalingEvaluation(applicationId, preScalingMetrics.timestamp)
    }

    // Return the final target pod count
    return { nfinal }
  }

  async schedulePostScalingEvaluation (applicationId, scalingTimestamp) {
    const delay = this.postScalingWindow * 1000

    // Skip scheduling if configured to do so (mainly for testing)
    if (process.env.SKIP_POST_SCALING_EVALUATION === 'true') {
      this.log.debug({ applicationId, scalingTimestamp }, 'Skipping post-scaling evaluation as configured')
      return
    }

    setTimeout(async () => {
      try {
        await this.performPostScalingEvaluation(applicationId, scalingTimestamp)
      } catch (err) {
        this.log.error({ err, applicationId }, 'Error in post-scaling evaluation')
      }
    }, delay)
  }

  async performPostScalingEvaluation (applicationId, scalingTimestamp) {
    const history = await this.loadPerfHistory(applicationId)

    // Find the event matching this timestamp
    const eventIndex = history.findIndex(e => e.timestamp === scalingTimestamp)
    if (eventIndex === -1) {
      this.log.warn({ applicationId, scalingTimestamp }, 'Post-scaling evaluation: event not found')
      return
    }

    // Get current metrics
    try {
      // Fetch current application metrics in the same way the execute method would
      // For now, we'll simulate this with a placeholder
      // In production, you'd use app.scalerMetrics.getApplicationMetrics(applicationId)
      const podsMetrics = {} // This would come from app.scalerMetrics.getApplicationMetrics

      if (Object.keys(podsMetrics).length === 0) {
        this.log.warn({ applicationId }, 'Post-scaling evaluation: no metrics available')
        return
      }

      // Process current pod metrics (without considering scaling decisions)
      const clusters = await this.loadClusters(applicationId)
      const processedPods = {}

      for (const [id, metrics] of Object.entries(podsMetrics)) {
        processedPods[id] = this.processPodMetrics(metrics, applicationId, clusters)
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

      // Calculate performance score
      const performance = 0.6 * Math.min(1, Math.max(0, -((event.deltaElu + event.deltaHeap) / 0.2))) +
                          0.4 * Math.max(0, 1 - ((event.sigmaElu + event.sigmaHeap) / 0.2))

      // Save updated history
      await this.savePerfHistory(applicationId, history)

      // Update clusters with the complete event
      await this.updateClusters(applicationId, event)

      this.log.info({
        applicationId,
        scalingTimestamp,
        deltaElu: event.deltaElu,
        deltaHeap: event.deltaHeap,
        performance
      }, 'Post-scaling evaluation completed')
    } catch (err) {
      this.log.error({ err, applicationId }, 'Error processing post-scaling metrics')
    }
  }
}

module.exports = ScalingAlgorithm
