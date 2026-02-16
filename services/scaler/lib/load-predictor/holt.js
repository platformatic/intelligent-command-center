'use strict'

/**
 * Double Exponential Smoothing (Holt's Method)
 *
 * Uses asymmetric smoothing parameters:
 *   - alphaUp/betaUp: when value is above forecast (trending up)
 *   - alphaDown/betaDown: when value is below forecast (trending down)
 *
 * Includes trend dampening when smoothed is above real value to prevent undershoot.
 *
 * Reads from redistribution namespace, writes to holt namespace.
 */
function holt (stateByTimestamp, options, bootstrapState) {
  const { alphaUp, alphaDown, betaUp, betaDown } = options

  let level = bootstrapState?.level ?? null
  let trend = bootstrapState?.trend ?? 0

  for (let i = 0; i < stateByTimestamp.length; i++) {
    const entry = stateByTimestamp[i]
    if (!entry.redistribution) continue // Skip bootstrap tick

    const input = entry.redistribution.value

    if (level === null) {
      level = input
      trend = 0
      entry.holt = { level, trend, value: level }
      continue
    }

    const forecast = level + trend
    const isAboveForecast = input > forecast

    const alpha = isAboveForecast ? alphaUp : alphaDown
    const beta = isAboveForecast ? betaUp : betaDown

    const prevLevel = level
    level = alpha * input + (1 - alpha) * forecast

    const levelDiff = level - prevLevel
    trend = beta * levelDiff + (1 - beta) * trend

    // Dampen trend when smoothed is above real value to prevent undershoot
    if (level > input) {
      const gap = level - input
      trend *= gap / (gap + Math.abs(trend) + 1e-9)
    }

    entry.holt = { level, trend, value: level }
  }
}

module.exports = { holt }
