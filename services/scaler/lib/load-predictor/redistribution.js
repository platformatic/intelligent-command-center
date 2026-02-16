'use strict'

function defaultSumValues (instances, unknownCount, unknownValue) {
  let sum = unknownCount * unknownValue
  for (const id in instances) {
    sum += instances[id]
  }
  return sum
}

/**
 * Reads from reconstruction namespace, writes to redistribution namespace.
 * instances is an object { instanceId: { podId, startTime, endTime }, ... }.
 * reconstruction.instances is an object { instanceId: value, ... }.
 * Preserves exact computation logic including exponential stabilization weight
 * and prevSum monotonicity.
 */
function redistributeSum (stateByTimestamp, instances, options, bootstrapState) {
  const { redistributionMs, k = 0.5, sumValues = defaultSumValues } = options

  let prevSum = bootstrapState?.prevSum

  for (let i = 0; i < stateByTimestamp.length; i++) {
    const entry = stateByTimestamp[i]
    if (!entry.reconstruction) continue // Skip bootstrap tick

    const timestamp = entry.timestamp
    const {
      instances: tickInstances,
      unknownValue = 0,
      unknownCount = 0
    } = entry.reconstruction

    // Single pass: classify instances + compute weights
    const stableInstances = {}
    let knownStableCount = 0
    let knownNewCount = 0
    let sumOfWeights = 0

    for (const id in tickInstances) {
      const startedAt = instances[id]?.startTime
      if (startedAt !== undefined && startedAt <= timestamp) {
        const age = timestamp - startedAt
        if (age < redistributionMs) {
          knownNewCount++
          sumOfWeights += getStabilizationWeight(age, redistributionMs, k)
          continue
        }
      }
      stableInstances[id] = tickInstances[id]
      knownStableCount++
    }

    // Find unmatched new instances + add their weights
    let unknownNewCount = 0
    if (unknownCount > 0) {
      let unmatchedCount = 0
      for (const id in instances) {
        const startedAt = instances[id].startTime
        if (startedAt > timestamp) continue
        const age = timestamp - startedAt
        if (age >= redistributionMs) continue
        if (tickInstances[id]) continue
        if (unmatchedCount < unknownCount) {
          sumOfWeights += getStabilizationWeight(age, redistributionMs, k)
        }
        unmatchedCount++
      }
      unknownNewCount = Math.min(unmatchedCount, unknownCount)
    }

    const unknownStableCount = unknownCount - unknownNewCount
    const stableCount = knownStableCount + unknownStableCount
    const newCount = knownNewCount + unknownNewCount
    const stableSum = sumValues(stableInstances, unknownStableCount, unknownValue)

    let sum, count
    if (newCount === 0) {
      sum = stableSum
      count = stableCount
    } else {
      const total = sumValues(tickInstances, unknownCount, unknownValue)
      const newVal = total - stableSum

      // Handle zero newVal to avoid NaN from 0/0 division
      if (newVal === 0) {
        sum = stableSum
        count = stableCount + newCount
      } else {
        const baseShare = sumOfWeights / newCount

        sum = stableSum + newVal * baseShare
        if (prevSum !== undefined && prevSum > sum) {
          sum = Math.min(total, prevSum)
        }

        const share = (sum - stableSum) / newVal
        count = stableCount + newCount * share
      }
    }

    prevSum = sum
    entry.redistribution = { count, value: sum, prevSum }
  }
}

/**
 * Calculate stabilization weight using exponential curve.
 * Weight goes from 0 (just added) to 1 (fully stable).
 */
function getStabilizationWeight (age, redistributionMs, k) {
  const t = age / redistributionMs
  return (Math.exp(k * t) - 1) / (Math.exp(k) - 1)
}

module.exports = { redistributeSum, getStabilizationWeight }
