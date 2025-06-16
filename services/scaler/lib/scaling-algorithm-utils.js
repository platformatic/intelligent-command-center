'use strict'

/**
 * Utility functions for scaling algorithms
 * These functions are used by both reactive scaling and performance history
 */

/**
 * Calculates linear trend in a series of values
 */
function calculateTrend (values) {
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

/**
 * Calculates variability (standard deviation) in a series of values
 */
function calculateVariability (values) {
  const n = values.length
  if (n <= 1) return 0

  const mean = values.reduce((sum, v) => sum + v, 0) / n
  const sumSquaredDiff = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0)

  return Math.sqrt(sumSquaredDiff / n)
}

/**
 * Calculates performance success score based on cluster similarity
 */
function getPerformanceSuccessScore (podMetrics, clusters) {
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

/**
 * Calculates ELU score based on threshold, trend, and variability
 */
function calculateEluScore (podMetrics, performanceScore, eluThreshold) {
  const thresholdComponent = 0.6 * Math.max(0, (podMetrics.eluMean - eluThreshold) / (1 - eluThreshold))
  const trendComponent = 0.25 * Math.min(100 * podMetrics.eluTrend, 1) * (podMetrics.eluTrend > 0 ? 1 : 0)
  const variabilityComponent = 0.15 * Math.min(podMetrics.eluVariability, 0.5)

  return performanceScore * (thresholdComponent + trendComponent + variabilityComponent)
}

/**
 * Calculates heap score based on threshold, trend, and variability
 */
function calculateHeapScore (podMetrics, performanceScore, heapThreshold) {
  const thresholdComponent = 0.6 * Math.max(0, (podMetrics.heapMean - heapThreshold) / (1 - heapThreshold))
  const trendComponent = 0.25 * Math.min(100 * podMetrics.heapTrend, 1) * (podMetrics.heapTrend > 0 ? 1 : 0)
  const variabilityComponent = 0.15 * Math.min(podMetrics.heapVariability, 0.5)

  return performanceScore * (thresholdComponent + trendComponent + variabilityComponent)
}

/**
 * Processes pod metrics from raw data and calculates derived metrics
 */
function processPodMetrics (podMetrics, clusters, eluThreshold, heapThreshold) {
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
    eluMax: eluValues.length > 0 ? Math.max(...eluValues) : 0,
    heapMean: heapValues.length > 0 ? heapValues.reduce((a, b) => a + b, 0) / heapValues.length : 0,
    heapMax: heapValues.length > 0 ? Math.max(...heapValues) : 0,
    eluTrend: calculateTrend(eluValues),
    heapTrend: calculateTrend(heapValues),
    eluVariability: calculateVariability(eluValues),
    heapVariability: calculateVariability(heapValues)
  }

  // Get performance success score
  result.performanceScore = getPerformanceSuccessScore(result, clusters)

  // Calculate ELU and HEAP scores
  result.eluScore = calculateEluScore(result, result.performanceScore, eluThreshold)
  result.heapScore = calculateHeapScore(result, result.performanceScore, heapThreshold)

  // Determine if scaling is required
  const immediateEluTrigger = result.eluMax >= 0.95 // Immediate scale-up if any ELU reading >= 95%
  const immediateHeapTrigger = result.heapMax >= 0.9 // Immediate scale-up if any heap reading >= 90%

  result.shouldScale = result.eluScore > 0.5 ||
                      result.heapScore > 0.5 ||
                      result.eluMean >= (eluThreshold + 0.05) ||
                      immediateEluTrigger ||
                      immediateHeapTrigger

  return result
}

/**
 * Calculates pre-metrics from processed pods
 */
function calculatePreMetrics (processedPods) {
  const preMetrics = {
    eluMean: 0,
    heapMean: 0,
    eluTrend: 0,
    heapTrend: 0
  }

  const podCount = Object.keys(processedPods).length

  for (const pod of Object.values(processedPods)) {
    preMetrics.eluMean += pod.eluMean
    preMetrics.heapMean += pod.heapMean
    preMetrics.eluTrend += pod.eluTrend
    preMetrics.heapTrend += pod.heapTrend
  }

  if (podCount > 0) {
    preMetrics.eluMean /= podCount
    preMetrics.heapMean /= podCount
    preMetrics.eluTrend /= podCount
    preMetrics.heapTrend /= podCount
  }

  return preMetrics
}

/**
 * Updates clusters for an application
 */
async function updateClusters (store, applicationId, newEvent, maxClusters = 5) {
  // Calculate performance score for the new event
  const performanceScore = 0.6 * Math.min(1, Math.max(0, -((newEvent.deltaElu + newEvent.deltaHeap) / 0.2))) +
                          0.4 * Math.max(0, 1 - ((newEvent.sigmaElu + newEvent.sigmaHeap) / 0.2))

  let clusters = await store.loadClusters(applicationId)

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

    if (clusters.length < maxClusters) {
      // If we have space, create a new cluster or update existing
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
      // At max capacity - update the closest cluster or replace least weighted
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

  await store.saveClusters(applicationId, clusters)
  return clusters
}

module.exports = {
  calculateTrend,
  calculateVariability,
  getPerformanceSuccessScore,
  calculateEluScore,
  calculateHeapScore,
  processPodMetrics,
  calculatePreMetrics,
  updateClusters
}
