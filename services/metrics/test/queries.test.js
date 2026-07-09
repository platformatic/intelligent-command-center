'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createVersionRPSQuery, createRequestPerSecondQuery } = require('../lib/queries')

// http_request_all_summary_seconds_count resets on every scrape, so it is not a
// monotonic counter and rate() returns ~0 even under steady traffic. The version
// RPS query must use sum_over_time() (total requests in the window) normalized by
// the window length, otherwise the draining checker expires live versions.
test('createVersionRPSQuery uses sum_over_time (not rate) over the window', () => {
  const q = createVersionRPSQuery({ instance: 'my-app-v1', timeWindow: '60s' })
  assert.ok(
    q.includes('sum_over_time(http_request_all_summary_seconds_count{callerTelemetryId=""}[60s])'),
    'aggregates the per-scrape ingress counts over the window'
  )
  assert.ok(!/\brate\(/.test(q), 'does not use rate() on the reset-per-scrape summary')
  // Filter on the workload instance (exposed by kube-state-metrics, unique per
  // version), not plt.dev/version (unexposed, absent on image-derived deploys).
  assert.ok(q.includes('label_app_kubernetes_io_instance="my-app-v1"'))
  assert.ok(q.trim().endsWith('/ 60'), 'normalizes by the window length in seconds')
})

// Internal service-to-service hops carry a callerTelemetryId; ingress requests
// do not. Filtering to the empty match keeps only ingress so the per-version RPS
// is not inflated by the Watt mesh fan-out.
test('createVersionRPSQuery counts ingress only (excludes internal mesh hops)', () => {
  const q = createVersionRPSQuery({ instance: 'my-app-v1', timeWindow: '60s' })
  assert.ok(q.includes('callerTelemetryId=""'), 'filters out internal service-to-service calls')
})

test('createVersionRPSQuery normalizes the window units to seconds', () => {
  const ends = (timeWindow, divisor) =>
    createVersionRPSQuery({ instance: 'a-v', timeWindow }).trim().endsWith(`/ ${divisor}`)
  assert.ok(ends('45s', 45), 'seconds')
  assert.ok(ends('2m', 120), 'minutes')
  assert.ok(ends('1h', 3600), 'hours')
})

test('createRequestPerSecondQuery uses sum_over_time normalized by the window', () => {
  const q = createRequestPerSecondQuery({ applicationId: 'app-1', timeWindow: '5m' })
  assert.ok(
    q.includes('sum_over_time(http_request_all_summary_seconds_count{callerTelemetryId=""}[5m]) / 300'),
    'per-pod ingress RPS from sum_over_time over the window divided by window seconds'
  )
  assert.ok(!/\brate\(/.test(q), 'does not use rate() on the reset-per-scrape summary')
  assert.ok(q.includes('label_platformatic_dev_application_id="app-1"'))
  assert.ok(q.includes('> 0'), 'keeps the >0 filter so idle pods do not skew the average')
})
