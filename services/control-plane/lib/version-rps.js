'use strict'

const { request } = require('undici')

// Format a millisecond window as a Prometheus range string (e.g. 1800000 -> '30m').
function msToPromWindow (ms) {
  const seconds = Math.floor(ms / 1000)
  if (seconds >= 3600 && seconds % 3600 === 0) return `${seconds / 3600}h`
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60}m`
  return `${seconds}s`
}

// Build a per-version RPS reader against the metrics service. Returns null when
// the metric is unavailable so callers degrade gracefully instead of throwing.
function createVersionRPS ({ metricsUrl, trafficWindowMs, log }) {
  return async function getVersionRPS (appLabel, versionLabel) {
    const window = msToPromWindow(trafficWindowMs)
    const url = `${metricsUrl}/kubernetes/versions/${encodeURIComponent(appLabel)}/${encodeURIComponent(versionLabel)}/rps?window=${window}`
    const { statusCode, body } = await request(url)
    if (statusCode !== 200) {
      const error = await body.text()
      log?.warn({ appLabel, versionLabel, statusCode, error }, 'failed to query version RPS')
      return null
    }
    const data = await body.json()
    return data.rps
  }
}

module.exports = { msToPromWindow, createVersionRPS }
