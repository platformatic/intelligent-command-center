'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createVersionRPSQuery } = require('../lib/queries')

// http_request_all_summary_seconds_count resets on every scrape, so it is not a
// monotonic counter and rate() returns ~0 even under steady traffic. The version
// RPS query must use sum_over_time() (total requests in the window) normalized by
// the window length, otherwise the draining checker expires live versions.
test('createVersionRPSQuery uses sum_over_time (not rate) over the window', () => {
  const q = createVersionRPSQuery({ appLabel: 'my-app', versionLabel: 'v1', timeWindow: '60s' })
  assert.ok(
    q.includes('sum_over_time(http_request_all_summary_seconds_count[60s])'),
    'aggregates the per-scrape counts over the window'
  )
  assert.ok(!/\brate\(/.test(q), 'does not use rate() on the reset-per-scrape summary')
  assert.ok(q.includes('label_app_kubernetes_io_name="my-app"'))
  assert.ok(q.includes('label_plt_dev_version="v1"'))
  assert.ok(q.trim().endsWith('/ 60'), 'normalizes by the window length in seconds')
})

test('createVersionRPSQuery normalizes the window units to seconds', () => {
  const ends = (timeWindow, divisor) =>
    createVersionRPSQuery({ appLabel: 'a', versionLabel: 'v', timeWindow }).trim().endsWith(`/ ${divisor}`)
  assert.ok(ends('45s', 45), 'seconds')
  assert.ok(ends('2m', 120), 'minutes')
  assert.ok(ends('1h', 3600), 'hours')
})
