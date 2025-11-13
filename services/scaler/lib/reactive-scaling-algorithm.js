'use strict'

const PerformanceHistory = require('./performance-history')
const {
  processPodMetrics,
  calculatePreMetrics
} = require('./scaling-algorithm-utils')

class ReactiveScalingAlgorithm {
  #performanceHistory

  constructor (app, options = {}) {
    this.app = app
    this.store = app.store
    this.log = app.log
    this.metrics = app.scalerMetrics
    this.maxHistoryEvents = options.maxHistoryEvents || 10
    this.maxClusters = options.maxClusters || 5
    this.eluThreshold = options.eluThreshold || 0.9
    this.heapThreshold = options.heapThreshold || 0.85
    this.postScalingWindow = options.postScalingWindow || 300
    this.cooldownPeriod = options.cooldownPeriod || 15
    this.minPodsDefault = options.minPodsDefault || 1
    this.maxPodsDefault = options.maxPodsDefault || 10

    this.#performanceHistory = new PerformanceHistory(app)
  }

  /**
   * Calculates the final scaling decision based on pod metrics, alerts, and historical data.
   *
   * @param {string} applicationId - The ID of the application being scaled
   * @param {Object} podsMetrics - Metrics for all pods in the application
   * @param {number} currentPodCount - Current number of pods in the deployment
   * @param {number} minPods - Minimum number of pods required (uses default if undefined)
   * @param {number} maxPods - Maximum number of pods allowed (uses default if undefined)
   * @param {Array} alerts - Array of alerts related to this application
   * @param {string} applicationName - Optional name of the application for better logging
   * @returns {Object} Object containing nfinal (target total pod count) and optional reason
   */
  async calculateScalingDecision (applicationId, podsMetrics, currentPodCount, minPods, maxPods, alerts = [], applicationName = null) {
    const minPodsValue = minPods !== undefined ? minPods : this.minPodsDefault
    const maxPodsValue = maxPods !== undefined ? maxPods : this.maxPodsDefault
    // Load historical data
    const clusters = await this.store.loadClusters(applicationId)
    const lastScalingTime = await this.store.getLastScalingTime(applicationId)
    const now = Date.now()

    // Check cooldown period first to avoid expensive calculations
    if (now - lastScalingTime < this.cooldownPeriod * 1000) {
      return { nfinal: currentPodCount, reason: 'In cooldown period' }
    }

    const processedPods = {}
    let triggerCount = 0

    // First, merge metrics from alerts into podsMetrics
    for (const alert of alerts) {
      if (!alert.podId || !alert.serviceId) continue

      // If we don't have metrics for this pod yet, initialize them
      if (!podsMetrics[alert.podId]) {
        podsMetrics[alert.podId] = {
          eventLoopUtilization: [],
          heapSize: []
        }
      }

      // alert format: {elu, heapUsed, heapTotal, healthHistory}
      if (alert.elu !== undefined) {
        podsMetrics[alert.podId].eventLoopUtilization.push({
          metric: { podId: alert.podId, serviceId: alert.serviceId },
          values: [[alert.timestamp || now, alert.elu.toString()]]
        })

        this.log.debug(
          {
            podId: alert.podId,
            serviceId: alert.service,
            metric: 'elu',
            value: alert.elu
          },
          'Added current ELU metric from alert'
        )
      }

      if (alert.heapUsed !== undefined && alert.heapTotal !== undefined) {
        podsMetrics[alert.podId].heapSize.push({
          metric: { podId: alert.podId, serviceId: alert.serviceId },
          values: [[alert.timestamp || now, alert.heapTotal.toString()]]
        })

        this.log.debug(
          {
            podId: alert.podId,
            serviceId: alert.service,
            metric: 'heap',
            value: alert.heapTotal
          },
          'Added current heap metric from alert'
        )
      }

      // Process healthHistory to add time-series data for better trend analysis
      // Priority: more recent data points have higher weight for trend analysis
      if (alert.healthHistory && Array.isArray(alert.healthHistory)) {
        const eluHistoryValues = []
        const heapHistoryValues = []

        // Sort history by timestamp to ensure chronological order
        const sortedHistory = alert.healthHistory
          .filter(entry => entry.currentHealth && entry.timestamp)
          .sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp))

        // Take only the most recent entries to avoid diluting current high values
        // Use last 20 entries to capture recent trend while maintaining current spike
        const recentHistory = sortedHistory.slice(-20)

        for (const historyEntry of recentHistory) {
          const health = historyEntry.currentHealth
          const timestamp = parseInt(historyEntry.timestamp) || now

          if (health.elu !== undefined) {
            eluHistoryValues.push([timestamp, health.elu.toString()])
          }

          if (health.heapTotal !== undefined) {
            heapHistoryValues.push([timestamp, health.heapTotal.toString()])
          }
        }

        // Add history data as separate metric entries for richer analysis
        if (eluHistoryValues.length > 0) {
          podsMetrics[alert.podId].eventLoopUtilization.push({
            metric: { podId: alert.podId, serviceId: alert.service },
            values: eluHistoryValues
          })
          this.log.debug({ podId: alert.podId, count: eluHistoryValues.length, total: sortedHistory.length },
            'Added recent ELU history from alert')
        }

        if (heapHistoryValues.length > 0) {
          podsMetrics[alert.podId].heapSize.push({
            metric: { podId: alert.podId, serviceId: alert.service },
            values: heapHistoryValues
          })
          this.log.debug({ podId: alert.podId, count: heapHistoryValues.length, total: sortedHistory.length },
            'Added recent heap history from alert')
        }
      }
    }

    // Now process the merged metrics
    for (const [id, metrics] of Object.entries(podsMetrics)) {
      // Process the combined metrics data
      processedPods[id] = processPodMetrics(metrics, clusters, this.eluThreshold, this.heapThreshold)

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
      // IMPLEMENTATION ADDITION NOT IN MATHEMATICAL SPEC:
      // The mathematical specification in the whitepaper focuses exclusively on scale-up decisions
      // and does not define any scale-down mechanism. Sections 1-7 only address scaling up.
      //
      // This implementation adds comprehensive scale-down functionality for production efficiency:
      // - Scales down when avgElu < 45% (50% of 90% threshold) OR avgHeap < 42.5% (50% of 85% threshold)
      // - Respects cooldown periods and minimum pod constraints
      // - Uses utilization ratio to determine scale-down aggressiveness
      //
      // RATIONALE: Production environments require both scale-up and scale-down to optimize
      // resource utilization and costs. Without scale-down, clusters would only grow and never
      // reclaim over-provisioned resources during low-load periods.

      // Calculate average ELU and HEAP utilization across all pods
      const avgElu = Object.values(processedPods).reduce((sum, pod) => sum + pod.eluMean, 0) / podCount
      const avgHeap = Object.values(processedPods).reduce((sum, pod) => sum + pod.heapMean, 0) / podCount

      // Only scale down if utilization is low and we have more than the minimum pods
      if ((avgElu < this.eluThreshold * 0.5 || avgHeap < this.heapThreshold * 0.5) &&
          currentPodCount > minPodsValue) {
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
          const actualPodsChange = newPodCount - currentPodCount

          // Record the scaling event
          const scaleDownPreMetrics = calculatePreMetrics(processedPods)

          await this.#performanceHistory.scalingEvaluation({
            applicationId,
            actualPodsChange,
            totalPods: newPodCount,
            preMetrics: {
              eluMean: avgElu,
              heapMean: avgHeap,
              eluTrend: scaleDownPreMetrics.eluTrend,
              heapTrend: scaleDownPreMetrics.heapTrend
            },
            source: 'signal',
            postScalingWindow: this.postScalingWindow,
            maxHistoryEvents: this.maxHistoryEvents,
            eluThreshold: this.eluThreshold,
            heapThreshold: this.heapThreshold
          })

          const appLabel = applicationName ? `${applicationName}: ` : ''
          const reason = `Scaling down ${appLabel}Low utilization across ${podCount} pods. Avg ELU ${(avgElu * 100).toFixed(1)}% (threshold ${(this.eluThreshold * 100).toFixed(0)}%), avg heap ${(avgHeap * 100).toFixed(1)}% (threshold ${(this.heapThreshold * 100).toFixed(0)}%)`
          return { nfinal: newPodCount, reason }
        }
      }

      // If we didn't scale down, return current pod count
      return { nfinal: currentPodCount, reason: 'No pods triggered scaling' }
    }

    const preMetrics = calculatePreMetrics(processedPods)

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

    // If no actual change, return current count
    if (nfinal === currentPodCount) {
      return { nfinal: currentPodCount, reason: 'No change needed' }
    }

    const actualPodsChange = nfinal - currentPodCount

    // Build detailed reason with pod information
    const triggeringPods = Object.entries(processedPods)
      .filter(([_, pod]) => pod.shouldScale)
      .sort((a, b) => Math.max(b[1].eluMax, b[1].heapMax) - Math.max(a[1].eluMax, a[1].heapMax))
      .slice(0, 3) // Top 3 pods

    const podDetails = triggeringPods.map(([podId, pod]) => {
      const metrics = []
      if (pod.eluMax >= this.eluThreshold) {
        metrics.push(`ELU ${(pod.eluMax * 100).toFixed(1)}%`)
      }
      if (pod.heapMax >= this.heapThreshold) {
        metrics.push(`heap ${(pod.heapMax * 100).toFixed(1)}%`)
      }
      return `${podId} (${metrics.join(', ')})`
    }).join(', ')

    const appLabel = applicationName ? `${applicationName}: ` : ''
    const reason = `Scaling up ${appLabel}${triggerCount} of ${podCount} pods triggered scaling. Top pods: ${podDetails}`

    // Record the scaling event
    await this.#performanceHistory.scalingEvaluation({
      applicationId,
      actualPodsChange,
      totalPods: nfinal,
      preMetrics,
      source: 'signal',
      postScalingWindow: this.postScalingWindow,
      maxHistoryEvents: this.maxHistoryEvents,
      eluThreshold: this.eluThreshold,
      heapThreshold: this.heapThreshold
    })

    return { nfinal, reason }
  }
}

module.exports = ReactiveScalingAlgorithm
