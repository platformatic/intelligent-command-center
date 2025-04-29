'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { startCompliance } = require('../helper')
const { randomUUID } = require('node:crypto')

test('should store a single row for all application metadata', async (t) => {
  const applicationId = randomUUID()
  const metadata = {
    testObject: {
      foo: 'bar'
    },
    testArray: [1, 2, 3, 4, 5]
  }
  const server = await startCompliance(t)
  const res = await server.inject({
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    url: '/metadata',
    body: JSON.stringify({
      applicationId,
      data: metadata
    })
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
})

test('should not store twice metadata for the same application', async (t) => {
  const applicationId = randomUUID()
  const metadata = {
    testObject: {
      foo: 'bar'
    },
    testArray: [1, 2, 3, 4, 5]
  }
  const server = await startCompliance(t)
  const res = await server.inject({
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    url: '/metadata',
    body: JSON.stringify({
      applicationId,
      data: metadata
    })
  })

  assert.strictEqual(res.statusCode, 201)

  // second request
  const secondRes = await server.inject({
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    url: '/metadata',
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
})
