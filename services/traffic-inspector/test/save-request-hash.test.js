'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const { startTrafficInspector } = require('./helper')
const { scanKeys } = require('../../../lib/redis-utils')

test('should save application requests hashes', async (t) => {
  const applicationId = randomUUID()
  const telemetryId = 'test-app-1-service-1'

  const domain = 'service-1.plt.local'
  const urlPath = '/test?foo=bar'
  const requestUrl1 = `http://${domain}${urlPath}`

  const trafficInspector = await startTrafficInspector(t, {
    domains: {
      domains: {
        [applicationId]: {
          [domain]: {
            telemetryId,
            serviceName: 'service-1',
            applicationName: 'test-app-1'
          }
        }
      }
    }
  })

  const responseSize1 = 41
  const responseHash1 = 'hash-1'

  for (let i = 0; i < 10; i++) {
    const { statusCode, body } = await trafficInspector.inject({
      method: 'POST',
      url: '/requests/hash',
      headers: {
        'x-labels': JSON.stringify({ applicationId })
      },
      body: {
        timestamp: Date.now(),
        request: {
          url: requestUrl1
        },
        response: {
          bodySize: responseSize1,
          bodyHash: responseHash1
        }
      }
    })
    assert.strictEqual(statusCode, 200, body)
  }

  const responseSize2 = 42
  const responseHash2 = 'hash-2'

  for (let i = 0; i < 4; i++) {
    const { statusCode, body } = await trafficInspector.inject({
      method: 'POST',
      url: '/requests/hash',
      headers: {
        'x-labels': JSON.stringify({ applicationId })
      },
      body: {
        applicationId,
        timestamp: Date.now(),
        request: {
          url: requestUrl1
        },
        response: {
          bodySize: responseSize2,
          bodyHash: responseHash2
        }
      }
    })
    assert.strictEqual(statusCode, 200, body)
  }

  const keys = await scanKeys(trafficInspector.redis, '*')
  assert.strictEqual(keys.length, 16)

  const version = await trafficInspector.getCurrentVersion()
  assert.strictEqual(version, 0)

  const requestKeys = keys.filter((key) => key.includes(':hashes:'))
  assert.strictEqual(requestKeys.length, 14)

  for (const requestKey of requestKeys) {
    const requestMetrics = await trafficInspector.redis.hgetall(requestKey)
    assert.ok(requestMetrics.url)
    assert.ok(requestMetrics.bodyHash)
    assert.ok(requestMetrics.bodySize)
    assert.ok(requestMetrics.domain)
    assert.ok(requestMetrics.timestamp)
  }
})

test('should save application requests hashes (with a saved recommendation)', async (t) => {
  const applicationId = randomUUID()
  const telemetryId = 'test-app-1-service-1'

  const domain = 'service-1.plt.local'
  const urlPath = '/test?foo=bar'
  const requestUrl1 = `http://${domain}${urlPath}`

  const trafficInspector = await startTrafficInspector(t, {
    recommendations: [{ version: 44 }],
    domains: {
      domains: {
        [applicationId]: {
          [domain]: {
            telemetryId,
            serviceName: 'service-1',
            applicationName: 'test-app-1'
          }
        }
      }
    }
  })

  const responseSize1 = 41
  const responseHash1 = 'hash-1'

  for (let i = 0; i < 10; i++) {
    const { statusCode, body } = await trafficInspector.inject({
      method: 'POST',
      url: '/requests/hash',
      headers: {
        'x-labels': JSON.stringify({ applicationId })
      },
      body: {
        applicationId,
        timestamp: Date.now(),
        request: {
          url: requestUrl1
        },
        response: {
          bodySize: responseSize1,
          bodyHash: responseHash1
        }
      }
    })
    assert.strictEqual(statusCode, 200, body)
  }

  const responseSize2 = 42
  const responseHash2 = 'hash-2'

  for (let i = 0; i < 4; i++) {
    const { statusCode, body } = await trafficInspector.inject({
      method: 'POST',
      url: '/requests/hash',
      headers: {
        'x-labels': JSON.stringify({ applicationId })
      },
      body: {
        applicationId,
        timestamp: Date.now(),
        request: {
          url: requestUrl1
        },
        response: {
          bodySize: responseSize2,
          bodyHash: responseHash2
        }
      }
    })
    assert.strictEqual(statusCode, 200, body)
  }

  const keys = await scanKeys(trafficInspector.redis, '*')
  assert.strictEqual(keys.length, 16)

  const version = await trafficInspector.getCurrentVersion()
  assert.strictEqual(version, 44)

  const requestKeys = keys.filter((key) => key.includes(':hashes:'))
  assert.strictEqual(requestKeys.length, 14)

  for (const requestKey of requestKeys) {
    const requestMetrics = await trafficInspector.redis.hgetall(requestKey)
    assert.ok(requestMetrics.url)
    assert.ok(requestMetrics.bodyHash)
    assert.ok(requestMetrics.bodySize)
    assert.ok(requestMetrics.domain)
    assert.ok(requestMetrics.timestamp)
  }
})
