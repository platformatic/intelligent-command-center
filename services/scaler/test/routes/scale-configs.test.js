'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')
const { buildServer } = require('../helper')
const { randomUUID } = require('node:crypto')

test('should save application min and max pods', async (t) => {
  const server = await buildServer(t)
  const applicationId = randomUUID()

  t.after(async () => {
    await server.close()
  })

  {
    const { statusCode, body } = await server.inject({
      method: 'POST',
      url: `/applications/${applicationId}/scale-configs`,
      headers: {
        'content-type': 'application/json'
      },
      payload: JSON.stringify({ minPods: 2, maxPods: 4 })
    })

    assert.strictEqual(statusCode, 200)

    const data = JSON.parse(body)
    assert.deepStrictEqual(data, { success: true })
  }

  {
    const { statusCode, body } = await server.inject({
      url: `/applications/${applicationId}/scale-configs`
    })

    assert.strictEqual(statusCode, 200)

    const scaleConfig = JSON.parse(body)
    assert.strictEqual(scaleConfig.applicationId, applicationId)
    assert.strictEqual(scaleConfig.minPods, 2)
    assert.strictEqual(scaleConfig.maxPods, 4)
  }
})
