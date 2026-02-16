'use strict'

const { getPodsCountAt } = require('./instances')

/**
 * Adds .reconstruction to each entry in stateByTimestamp array.
 *
 * With bootstrapState: Index 0 is already-processed bootstrap tick (context only).
 *   Use bootstrapState.rawSum as initial prevTickSum. Process from index 1.
 *
 * Without bootstrapState: Index 0 is the first data point (cold start).
 *   Process all entries from index 0. First entry gets unknownValue = 0
 *   since there's no previous data for estimation.
 */
function reconstructMetrics (stateByTimestamp, podsCountHistory, bootstrapState) {
  if (stateByTimestamp.length === 0) return

  let prevTick = null
  let prevTickSum = 0
  let startIndex = 0

  if (bootstrapState) {
    // Bootstrap case: index 0 is context only, start from index 1
    prevTick = stateByTimestamp[0].aligned
    prevTickSum = bootstrapState.rawSum
    startIndex = 1
  }

  for (let i = startIndex; i < stateByTimestamp.length; i++) {
    const entry = stateByTimestamp[i]
    const tick = entry.aligned
    const tickTimestamp = entry.timestamp
    const tickInstances = tick.instances
    const knownInstances = Object.keys(tickInstances).length

    // Use actual instance count if it exceeds tracked pods count.
    // Real data wins over tracking - we should not ignore instances.
    let podsCount = getPodsCountAt(tickTimestamp, podsCountHistory)
    if (knownInstances > podsCount) {
      podsCount = knownInstances
    }
    if (podsCount === 0) continue

    let estimatedSum = prevTickSum
    let unknownCount = podsCount
    let unknownValue = 0
    let tickSum = 0

    for (const id in tickInstances) {
      if (prevTick) {
        const prevValue = prevTick.instances[id]
        if (prevValue) {
          estimatedSum -= prevValue
        }
      }
      tickSum += tickInstances[id]
      unknownCount--
    }

    if (unknownCount > 0 && estimatedSum > 0) {
      unknownValue = estimatedSum / unknownCount
      tickSum += estimatedSum
    }

    entry.reconstruction = {
      instances: tickInstances,
      unknownValue,
      unknownCount,
      rawSum: tickSum,
      podsCount
    }

    prevTick = tick
    prevTickSum = tickSum
  }
}

module.exports = { reconstructMetrics }
