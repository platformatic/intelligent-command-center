'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { shouldExpire, REQUIRED_ZERO_CHECKS } = require('../../lib/expire-policies/http-traffic')

const mockLog = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {}
}

test('expires only after REQUIRED_ZERO_CHECKS consecutive zero readings', async () => {
  const version = { appLabel: 'my-app', versionLabel: 'consecutive' }
  const getVersionRPS = async () => 0
  for (let i = 1; i < REQUIRED_ZERO_CHECKS; i++) {
    assert.strictEqual(
      await shouldExpire(version, { getVersionRPS, log: mockLog }),
      false,
      `check ${i} should not expire yet`
    )
  }
  assert.strictEqual(
    await shouldExpire(version, { getVersionRPS, log: mockLog }),
    true,
    'expires on the Nth consecutive zero'
  )
})

test('a non-zero reading resets the zero streak', async () => {
  const version = { appLabel: 'my-app', versionLabel: 'reset' }
  let rps = 0
  const getVersionRPS = async () => rps

  // One short of the threshold: not yet enough to expire
  for (let i = 1; i < REQUIRED_ZERO_CHECKS; i++) {
    assert.strictEqual(await shouldExpire(version, { getVersionRPS, log: mockLog }), false)
  }

  // Traffic returns: streak resets
  rps = 5
  assert.strictEqual(await shouldExpire(version, { getVersionRPS, log: mockLog }), false)

  // A fresh full streak of zeros is now required before expiring
  rps = 0
  for (let i = 1; i < REQUIRED_ZERO_CHECKS; i++) {
    assert.strictEqual(await shouldExpire(version, { getVersionRPS, log: mockLog }), false)
  }
  assert.strictEqual(await shouldExpire(version, { getVersionRPS, log: mockLog }), true)
})

test('does not expire while RPS > 0', async () => {
  const version = { appLabel: 'my-app', versionLabel: 'busy' }
  const getVersionRPS = async () => 42.5
  assert.strictEqual(await shouldExpire(version, { getVersionRPS, log: mockLog }), false)
})

test('does not expire when the RPS query fails (null)', async () => {
  const version = { appLabel: 'my-app', versionLabel: 'nullq' }
  const getVersionRPS = async () => null
  assert.strictEqual(await shouldExpire(version, { getVersionRPS, log: mockLog }), false)
})
