'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { startCompliance } = require('../helper')
const { randomUUID } = require('node:crypto')

test('should return true if all rules returns true', async (t) => {
  const applicationId = randomUUID()
  const server = await startCompliance(t, {}, [{
    name: 'application-has-name',
    metadata: {
      applicationId,
      data: {
        applicationName: 'Test Application'
      }
    },
    options: {
      minLength: 10
    },
    enabled: true
  }])
  const res = await server.inject({
    method: 'post',
    url: '/compliance',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      applicationId
    })
  })
  const payload = await res.json()
  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(payload.compliant, true)
  assert.strictEqual(payload.report.applicationId, applicationId)
  assert.strictEqual(payload.report.ruleSet.length, 1)
  assert.strictEqual(payload.report.ruleSet[0].name, 'application-has-name')
  assert.strictEqual(payload.report.ruleSet[0].result, true)
})

test('should return false if a rule returns false', async (t) => {
  const applicationId = randomUUID()

  const server = await startCompliance(t, {}, [
    {
      name: 'application-has-name',
      enabled: true,
      metadata: {
        applicationId,
        data: {
          applicationName: 'Test Application'
        }
      }
    },
    { name: 'always-false', enabled: true }
  ])
  const res = await server.inject({
    method: 'post',
    url: '/compliance',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      applicationId
    })
  })
  const payload = await res.json()
  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(payload.compliant, false)
  assert.strictEqual(payload.report.ruleSet.length, 2)
  assert.strictEqual(payload.report.ruleSet[0].result, true)
  assert.strictEqual(payload.report.ruleSet[0].name, 'application-has-name')
  assert.strictEqual(payload.report.ruleSet[1].result, false)
  assert.strictEqual(payload.report.ruleSet[1].name, 'always-false')
})

test('should ignore disabled rules', async (t) => {
  const applicationId = randomUUID()
  const server = await startCompliance(t, {}, [
    {
      name: 'application-has-name',
      enabled: true,
      metadata: {
        applicationId,
        data: {
          applicationName: 'Test Application'
        }
      }
    },
    { name: 'always-false', enabled: false }
  ])
  const res = await server.inject({
    method: 'post',
    url: '/compliance',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      applicationId
    })
  })
  const payload = await res.json()
  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(payload.compliant, true)
  assert.strictEqual(payload.report.ruleSet.length, 1)
  assert.strictEqual(payload.report.ruleSet[0].name, 'application-has-name')
  assert.strictEqual(payload.report.ruleSet[0].result, true)
})

test('local rules should override global ones', async (t) => {
  const applicationId = randomUUID()

  const server = await startCompliance(t, {}, [
    { name: 'application-has-name', enabled: true },
    {
      name: 'application-has-name',
      enabled: true,
      metadata: {
        applicationId,
        data: {
          applicationName: 'Test Application'
        }
      },
      options: {
        applicationId,
        minLength: 9999
      }
    }
  ])
  const res = await server.inject({
    method: 'post',
    url: '/compliance',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      applicationId
    })
  })
  assert.strictEqual(res.statusCode, 200)
  const payload = await res.json()
  assert.strictEqual(payload.compliant, false)
  assert.strictEqual(payload.report.applicationId, applicationId)
  assert.strictEqual(payload.report.ruleSet.length, 1)
  assert.strictEqual(payload.report.ruleSet[0].result, false)
  assert.strictEqual(payload.report.ruleSet[0].type, 'local')
  assert.strictEqual(payload.report.ruleSet[0].name, 'application-has-name')
})

test('local rules not overriding global ones for another applicationId', async (t) => {
  const applicationId = randomUUID()
  const server = await startCompliance(t, {}, [
    {
      name: 'application-has-name',
      enabled: true,
      metadata: {
        applicationId,
        data: {
          applicationName: 'Test Application'
        }
      }
    },
    {
      name: 'application-has-name',
      enabled: true,
      options: {
        applicationId: randomUUID(), // this is another application id
        minLength: 9999
      }
    }
  ])
  const res = await server.inject({
    method: 'post',
    url: '/compliance',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      applicationId
    })
  })
  assert.strictEqual(res.statusCode, 200)
  const payload = await res.json()
  assert.strictEqual(payload.compliant, true)
  assert.strictEqual(payload.report.applicationId, applicationId)
  assert.strictEqual(payload.report.ruleSet.length, 1)
  assert.strictEqual(payload.report.ruleSet[0].result, true)
  assert.strictEqual(payload.report.ruleSet[0].type, 'global')
  assert.strictEqual(payload.report.ruleSet[0].name, 'application-has-name')
})

test('should not run compliance twice for same applicationId', async (t) => {
  const applicationId = randomUUID()
  let firstReport
  const server = await startCompliance(t, {}, [
    {
      name: 'application-has-name',
      enabled: true,
      metadata: {
        applicationId,
        data: {
          applicationName: 'Test Application'
        }
      }
    }
  ])
  {
    // first run
    const res = await server.inject({
      method: 'post',
      url: '/compliance',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        applicationId
      })
    })
    assert.strictEqual(res.statusCode, 200)
    const payload = await res.json()
    firstReport = payload.report
    assert.strictEqual(payload.compliant, true)
    assert.strictEqual(payload.executed, true)
    assert.strictEqual(payload.report.applicationId, applicationId)
    assert.strictEqual(payload.report.ruleSet.length, 1)
    assert.strictEqual(payload.report.ruleSet[0].name, 'application-has-name')
    assert.strictEqual(payload.report.ruleSet[0].result, true)
    assert.strictEqual(payload.report.ruleSet[0].type, 'global')
  }

  {
    // second run
    const res = await server.inject({
      method: 'post',
      url: '/compliance',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        applicationId
      })
    })
    assert.strictEqual(res.statusCode, 200)
    const payload = await res.json()
    assert.deepEqual(payload.report, firstReport)
    assert.strictEqual(payload.compliant, true)
    assert.strictEqual(payload.executed, false)
  }
})
