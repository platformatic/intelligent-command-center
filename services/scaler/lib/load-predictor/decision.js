'use strict'

const { holt } = require('./holt')
const { redistributeSum } = require('./redistribution')
const { reconstructMetrics } = require('./reconstruction')

const TrendDirection = {
  UP: 'up',
  HORIZONTAL: 'horizontal',
  DOWN: 'down'
}

function getTargetPodsCount ({
  metricsByTimestamp,
  podsCountHistory,
  instances,
  config,
  threshold,
  bootstrapState,
  now,
  targetPodsCount,
  horizonMs,
  podsConfig,
  horizontalTrendThreshold,
  scaleUpK,
  scaleUpMargin,
  scaleDownMargin
}) {
  reconstructMetrics(metricsByTimestamp, podsCountHistory, bootstrapState)
  redistributeSum(metricsByTimestamp, instances, config, bootstrapState)
  holt(metricsByTimestamp, config, bootstrapState)

  const lastEntry = metricsByTimestamp[metricsByTimestamp.length - 1]
  if (!lastEntry.holt) return null

  let { level, trend } = lastEntry.holt
  const { count } = lastEntry.redistribution
  level += trend * (now - lastEntry.timestamp) / 1000

  const podsCount = calculateTargetPodsCount({
    currentSum: level,
    trend,
    currentCount: count,
    threshold,
    targetPodsCount,
    horizonMs,
    podsConfig,
    horizontalTrendThreshold,
    scaleUpK,
    scaleUpMargin,
    scaleDownMargin
  })

  return { podsCount, level, trend, stateByTimestamp: metricsByTimestamp }
}

function calculateTargetPodsCount ({
  currentSum,
  trend,
  currentCount,
  threshold,
  targetPodsCount,
  horizonMs,
  podsConfig,
  horizontalTrendThreshold,
  scaleUpK,
  scaleUpMargin,
  scaleDownMargin
}) {
  const { min, max } = podsConfig

  const horizonSeconds = horizonMs / 1000
  const predictedSum = currentSum + trend * horizonSeconds

  const trendDirection = getTrendDirection(trend, currentSum, horizontalTrendThreshold)
  const isOverloaded = currentSum / currentCount > threshold
  const isOverloadedAtHorizon = predictedSum / targetPodsCount > threshold

  const opts = {
    currentSum,
    predictedSum,
    isOverloaded,
    threshold,
    min,
    max,
    targetPodsCount,
    scaleUpK,
    scaleUpMargin,
    scaleDownMargin
  }

  if (trendDirection === TrendDirection.UP || isOverloadedAtHorizon) {
    return findScaleUpTarget(opts)
  }

  if (!isOverloaded) {
    return findScaleDownTarget(opts)
  }

  return targetPodsCount
}

function findScaleUpTarget ({ currentSum, predictedSum, isOverloaded, threshold, max, targetPodsCount, scaleUpK, scaleUpMargin }) {
  // Consequence-asymmetric minimax: C = k * u/(1-u), f = k*u / (k*u + 1-u)
  const k = scaleUpK
  const margin = scaleUpMargin

  const capacity = targetPodsCount * threshold
  const utilization = currentSum / capacity

  let predictedSumIncrease = predictedSum - currentSum
  if (utilization < 1) {
    const cost = k * utilization
    const weight = cost / (cost + (1 - utilization))
    predictedSumIncrease = weight * predictedSumIncrease
  }

  const adjustedPredictedSum = currentSum + predictedSumIncrease

  let newTargetPodsCount = Math.floor(adjustedPredictedSum / threshold)
  const targetCapacity = newTargetPodsCount * threshold
  const targetOverload = adjustedPredictedSum - targetCapacity

  if (targetOverload > 0) {
    if (isOverloaded || targetOverload / threshold > margin) {
      newTargetPodsCount++
    }
  }

  newTargetPodsCount = Math.max(newTargetPodsCount, targetPodsCount)
  newTargetPodsCount = Math.min(newTargetPodsCount, max)

  return newTargetPodsCount
}

function findScaleDownTarget ({ currentSum, threshold, min, targetPodsCount, scaleDownMargin }) {
  const minInstances = Math.floor((1 + scaleDownMargin) * currentSum / threshold) + 1
  return Math.max(min, Math.min(targetPodsCount, minInstances))
}

function getTrendDirection (trend, level, horizontalTrendThreshold) {
  if (level === 0) return TrendDirection.HORIZONTAL
  const normalizedTrend = trend / level
  const angleDegrees = Math.atan(normalizedTrend) * (180 / Math.PI)
  if (angleDegrees > horizontalTrendThreshold) return TrendDirection.UP
  if (angleDegrees < -horizontalTrendThreshold) return TrendDirection.DOWN
  return TrendDirection.HORIZONTAL
}

function generatePredictionPoints ({
  level,
  trend,
  now,
  currentPodsCount,
  targetPodsCount,
  horizonMs,
  pendingScaleUps
}) {
  const timeline = [{ timestamp: now, count: currentPodsCount }]

  if (targetPodsCount > currentPodsCount) {
    let prevCount = currentPodsCount

    for (const event of pendingScaleUps) {
      const count = prevCount + event.count
      timeline.push({ timestamp: event.scaleAt, count })
      prevCount = count
    }
  } else {
    timeline.push({ timestamp: now + 1000, count: targetPodsCount })
  }

  const horizonEnd = now + horizonMs
  timeline.push({ timestamp: horizonEnd, count: targetPodsCount })

  const points = []
  let prevCount = 0

  for (let i = 0; i < timeline.length; i++) {
    const { timestamp, count } = timeline[i]
    const seconds = (timestamp - now) / 1000
    const sum = level + trend * seconds

    // Add step: point before with previous count
    if (i > 0) {
      points.push({ timestamp, avg: sum / prevCount, sum, count: prevCount })
    }

    points.push({ timestamp, avg: sum / count, sum, count })

    prevCount = count
  }

  return points
}

module.exports = {
  TrendDirection,
  getTrendDirection,
  findScaleUpTarget,
  findScaleDownTarget,
  calculateTargetPodsCount,
  getTargetPodsCount,
  generatePredictionPoints
}
