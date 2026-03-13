'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { shouldExpire } = require('../../lib/expire-policies/http-traffic')

const mockLog = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {}
}

const version = { appLabel: 'my-app', versionLabel: 'v1' }

test('shouldExpire returns true when RPS is 0', async () => {
  const getVersionRPS = async () => 0
  const result = await shouldExpire(version, { getVersionRPS, log: mockLog })
  assert.strictEqual(result, true)
})

test('shouldExpire returns false when RPS > 0', async () => {
  const getVersionRPS = async () => 42.5
  const result = await shouldExpire(version, { getVersionRPS, log: mockLog })
  assert.strictEqual(result, false)
})

test('shouldExpire returns false when RPS is null', async () => {
  const getVersionRPS = async () => null
  const result = await shouldExpire(version, { getVersionRPS, log: mockLog })
  assert.strictEqual(result, false)
})
