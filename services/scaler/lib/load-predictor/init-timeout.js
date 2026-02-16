'use strict'

function median (values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

function calculateInitTimeout (window, currentTimeout, config) {
  const { stepRate, upFactor, downFactor } = config
  const target = median(window)

  const delta = target - currentTimeout
  const maxUp = currentTimeout * stepRate * upFactor
  const maxDown = currentTimeout * stepRate * downFactor
  const clampedDelta = Math.min(Math.max(delta, -maxDown), maxUp)

  return Math.round(currentTimeout + clampedDelta)
}

module.exports = { calculateInitTimeout, median }
