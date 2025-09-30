'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { randomUUID } = require('node:crypto')
const {
  startCompliance,
  startControlPlane,
  generateK8sHeader
} = require('../helper')

test('should store a single row for all application metadata', async (t) => {
  const applicationId = randomUUID()
  const podId = randomUUID()
  const deploymentId = randomUUID()
  const metadata = {
    testObject: {
      foo: 'bar'
    },
    testArray: [1, 2, 3, 4, 5]
  }

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

  const server = await startCompliance(t)
  const res = await server.inject({
    method: 'POST',
    url: '/metadata',
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: JSON.stringify({ applicationId, data: metadata })
  })

  const output = res.json()
  assert.strictEqual(res.statusCode, 201)
  assert.deepEqual(output, {})

  const rows = await server.platformatic.entities.metadatum.find({
    where: {
      applicationId: { eq: applicationId }
    }
  })

  assert.equal(rows.length, 1)
  assert.strictEqual(rows[0].deploymentId, deploymentId)
})

test('should not store twice metadata for the same application', async (t) => {
  const applicationId = randomUUID()
  const podId = randomUUID()
  const deploymentId = randomUUID()
  const metadata = {
    testObject: {
      foo: 'bar'
    },
    testArray: [1, 2, 3, 4, 5]
  }

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

  const server = await startCompliance(t)
  const res = await server.inject({
    method: 'POST',
    url: '/metadata',
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: JSON.stringify({ applicationId, data: metadata })
  })

  assert.strictEqual(res.statusCode, 201)

  // second request
  const secondRes = await server.inject({
    method: 'POST',
    url: '/metadata',
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: JSON.stringify({
      applicationId,
      data: {
        should_store_this: 'no'
      }
    })
  })

  assert.deepEqual(secondRes.statusCode, 200)
  const rows = await server.platformatic.entities.metadatum.find({
    where: {
      applicationId: { eq: applicationId }
    }
  })

  assert.equal(rows.length, 1)
  assert.deepEqual(rows[0].data, metadata)
  assert.strictEqual(rows[0].deploymentId, deploymentId)
})

test('should not store metadata twice for same deploymentId', async (t) => {
  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const podId = randomUUID()
  const metadata = {
    testObject: {
      foo: 'bar'
    },
    testArray: [1, 2, 3, 4, 5]
  }

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

  const server = await startCompliance(t)

  {
    // first request
    const res = await server.inject({
      method: 'POST',
      url: '/metadata',
      headers: {
        'content-type': 'application/json',
        'x-k8s': generateK8sHeader(podId)
      },
      body: JSON.stringify({ applicationId, data: metadata })
    })

    assert.strictEqual(res.statusCode, 201)
    const payload = res.json()
    assert.deepEqual(payload, {})
  }

  {
    // second request with same deploymentId
    const res = await server.inject({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-k8s': generateK8sHeader(podId)
      },
      url: '/metadata',
      body: JSON.stringify({
        applicationId,
        data: {
          different: 'metadata'
        }
      })
    })

    assert.strictEqual(res.statusCode, 200)
    const payload = res.json()
    assert.deepEqual(payload, {})
  }

  const rows = await server.platformatic.entities.metadatum.find({
    where: {
      applicationId: { eq: applicationId }
    }
  })

  assert.equal(rows.length, 1)
  assert.deepEqual(rows[0].data, metadata)
  assert.strictEqual(rows[0].deploymentId, deploymentId)
})

test('should store metadata twice for same applicationId even with different deploymentIds', async (t) => {
  const applicationId = randomUUID()

  const deploymentId1 = randomUUID()
  const deploymentId2 = randomUUID()

  const podId1 = randomUUID()
  const podId2 = randomUUID()

  const metadata1 = {
    testObject: {
      foo: 'bar'
    },
    deployment: 1
  }

  const metadata2 = {
    testObject: {
      foo: 'baz'
    },
    deployment: 2
  }

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
      throw new Error('Unknown instanceId')
    }
  })

  const server = await startCompliance(t)

  {
    // first request
    const res = await server.inject({
      method: 'POST',
      url: '/metadata',
      headers: {
        'content-type': 'application/json',
        'x-k8s': generateK8sHeader(podId1)
      },
      body: JSON.stringify({ applicationId, data: metadata1 })
    })

    assert.strictEqual(res.statusCode, 201)
    const payload = res.json()
    assert.deepEqual(payload, {})
  }

  {
    // second request with different deploymentId
    const res = await server.inject({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-k8s': generateK8sHeader(podId2)
      },
      url: '/metadata',
      body: JSON.stringify({
        applicationId,
        data: metadata2
      })
    })

    assert.strictEqual(res.statusCode, 201)
    const payload = res.json()
    assert.deepEqual(payload, {})
  }

  const rows = await server.platformatic.entities.metadatum.find({
    where: { applicationId: { eq: applicationId } },
    orderBy: { createdAt: 'asc' }
  })

  assert.equal(rows.length, 2)

  assert.strictEqual(rows[0].deploymentId, deploymentId1)
  assert.strictEqual(rows[1].deploymentId, deploymentId2)
})
