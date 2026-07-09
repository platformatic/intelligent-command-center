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
// `instance` is the version's workload name (app.kubernetes.io/instance = the
// version registry's controllerName). RPS is keyed on that label, not on the
// version id: plt.dev/version is not exposed by kube-state-metrics and is absent
// on image-derived deploys, so keying on it returned 0 for every version and the
// draining checker expired live versions.
function createVersionRPS ({ metricsUrl, trafficWindowMs, log }) {
  return async function getVersionRPS (instance) {
    const window = msToPromWindow(trafficWindowMs)
    const url = `${metricsUrl}/kubernetes/instances/${encodeURIComponent(instance)}/rps?window=${window}`
    const { statusCode, body } = await request(url)
    if (statusCode !== 200) {
      const error = await body.text()
      log?.warn({ instance, statusCode, error }, 'failed to query version RPS')
      return null
    }
    const data = await body.json()
    return data.rps
  }
}

module.exports = { msToPromWindow, createVersionRPS }
