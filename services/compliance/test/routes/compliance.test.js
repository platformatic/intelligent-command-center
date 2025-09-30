'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { randomUUID } = require('node:crypto')
const {
  startCompliance,
  startControlPlane,
  generateK8sHeader
} = require('../helper')

test('should return true if all rules returns true', async (t) => {
  const applicationId = randomUUID()
  const podId = randomUUID()

  await startControlPlane(t, {
    getInstances: (options) => {
      return [{
        podId,
        applicationId,
        deploymentId: randomUUID()
      }]
    }
  })

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
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: JSON.stringify({ applicationId })
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
  const podId = randomUUID()

  await startControlPlane(t, {
    getInstances: (options) => {
      return [{
        podId,
        applicationId,
        deploymentId: randomUUID()
      }]
    }
  })

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
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: JSON.stringify({ applicationId })
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
  const podId = randomUUID()

  await startControlPlane(t, {
    getInstances: (options) => {
      return [{
        podId,
        applicationId,
        deploymentId: randomUUID()
      }]
    }
  })

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
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: JSON.stringify({ applicationId })
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
  const podId = randomUUID()

  await startControlPlane(t, {
    getInstances: (options) => {
      return [{
        podId,
        applicationId,
        deploymentId: randomUUID()
      }]
    }
  })

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
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: JSON.stringify({ applicationId })
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
  const podId = randomUUID()

  await startControlPlane(t, {
    getInstances: (options) => {
      return [{
        podId,
        applicationId,
        deploymentId: randomUUID()
      }]
    }
  })

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
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: JSON.stringify({ applicationId })
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

test('should not run compliance twice for same deploymentId', async (t) => {
  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const podId = randomUUID()

  await startControlPlane(t, {
    getInstances: (options) => {
      assert.strictEqual(options.applicationId, applicationId)
      assert.strictEqual(options.podId, podId)

      return [{
        podId,
        applicationId,
        deploymentId
      }]
    }
  })

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
        'content-type': 'application/json',
        'x-k8s': generateK8sHeader(podId)
      },
      body: JSON.stringify({ applicationId })
    })

    assert.strictEqual(res.statusCode, 200)
    const payload = await res.json()
    firstReport = payload.report
    assert.strictEqual(payload.compliant, true)
    assert.strictEqual(payload.executed, true)
    assert.strictEqual(payload.report.applicationId, applicationId)
    assert.strictEqual(payload.report.deploymentId, deploymentId)
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
        'content-type': 'application/json',
        'x-k8s': generateK8sHeader(podId)
      },
      body: JSON.stringify({ applicationId })
    })

    assert.strictEqual(res.statusCode, 200)
    const payload = await res.json()
    assert.deepEqual(payload.report, firstReport)
    assert.strictEqual(payload.compliant, true)
    assert.strictEqual(payload.executed, false)
  }
})

test('should run compliance twice for same applicationId', async (t) => {
  const applicationId = randomUUID()

  const deploymentId1 = randomUUID()
  const deploymentId2 = randomUUID()

  const podId1 = randomUUID()
  const podId2 = randomUUID()

  await startControlPlane(t, {
    getInstances: (options) => {
      assert.strictEqual(options.applicationId, applicationId)

      if (options.podId === podId1) {
        return [{
          podId: podId1,
          applicationId,
          deploymentId: deploymentId1
        }]
      }
      if (options.podId === podId2) {
        return [{
          podId: podId2,
          applicationId,
          deploymentId: deploymentId2
        }]
      }
      throw new Error('Unknown podId')
    }
  })

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
        'content-type': 'application/json',
        'x-k8s': generateK8sHeader(podId1)
      },
      body: JSON.stringify({ applicationId })
    })

    assert.strictEqual(res.statusCode, 200)
    const payload = await res.json()
    firstReport = payload.report
    assert.strictEqual(payload.compliant, true)
    assert.strictEqual(payload.executed, true)
    assert.strictEqual(payload.report.applicationId, applicationId)
    assert.strictEqual(payload.report.deploymentId, deploymentId1)
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
        'content-type': 'application/json',
        'x-k8s': generateK8sHeader(podId2)
      },
      body: JSON.stringify({ applicationId })
    })

    assert.strictEqual(res.statusCode, 200)
    const payload = await res.json()
    assert.notDeepEqual(payload.report, firstReport)
    assert.strictEqual(payload.compliant, true)
    assert.strictEqual(payload.executed, true)
    assert.strictEqual(payload.report.applicationId, applicationId)
    assert.strictEqual(payload.report.deploymentId, deploymentId2)
    assert.strictEqual(payload.report.ruleSet.length, 1)
    assert.strictEqual(payload.report.ruleSet[0].name, 'application-has-name')
    assert.strictEqual(payload.report.ruleSet[0].result, true)
    assert.strictEqual(payload.report.ruleSet[0].type, 'global')
  }
})
