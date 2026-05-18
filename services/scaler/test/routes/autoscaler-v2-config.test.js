'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const { buildServer } = require('../helper')

test('should return autoscaler v2 config sections and entries', async (t) => {
  const server = await buildServer(t)
  const applicationId = randomUUID()

  const { statusCode, body } = await server.inject({
    method: 'GET',
    url: `/applications/${applicationId}/autoscaler-v2-config`
  })

  assert.strictEqual(statusCode, 200)

  const data = JSON.parse(body)
  assert.strictEqual(data.applicationId, applicationId)
  assert.ok(Array.isArray(data.sections))
  assert.ok(data.sections.length > 0)

  const firstSection = data.sections[0]
  assert.ok(firstSection.id)
  assert.ok(firstSection.title)
  assert.ok(Array.isArray(firstSection.entries))
  assert.ok(firstSection.entries.length > 0)
  assert.ok(firstSection.entries[0].key)
  assert.notStrictEqual(firstSection.entries[0].value, undefined)
})
