'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const {
  startControlPlane,
  startMetrics,
  startMachinist,
  startActivities,
  startMainService,
  generateK8sHeader
} = require('./helper')

const { startCompliance } = require('../../compliance/test/helper')

test('should reencrypt a valkey user password', async (t) => {
  const applicationName = 'test-app'
  const podId = randomUUID()
  const imageId = randomUUID()

  await startActivities(t)
  await startMetrics(t)

  const iccUpdates = []
  await startMainService(t, {
    saveIccUpdate: (update) => {
      iccUpdates.push(update)
    }
  })

  await startCompliance(t)

  await startMachinist(t, {
    getPodDetails: () => ({ image: imageId })
  })

  const oldSecret = 'old_secret'
  const newSecret = 'new_secret'

  const controlPlane = await startControlPlane(t, {}, {
    PLT_CONTROL_PLANE_SECRET_KEYS: oldSecret
  })

  let cachePassword = null
  let encryptedPassword = null

  {
    const { statusCode, body } = await controlPlane.inject({
      method: 'POST',
      url: `/pods/${podId}/instance`,
      headers: {
        'content-type': 'application/json',
        'x-k8s': generateK8sHeader(podId)
      },
      body: { applicationName }
    })

    assert.strictEqual(statusCode, 200, body)

    const { httpCache } = JSON.parse(body)

    assert.ok(httpCache.clientOpts.username)
    assert.ok(httpCache.clientOpts.password)

    cachePassword = httpCache.clientOpts.password

    const valkeyUsers = await controlPlane.platformatic.entities.valkeyUser.find()
    assert.strictEqual(valkeyUsers.length, 1)

    const valkeyUser = valkeyUsers[0]
    encryptedPassword = valkeyUser.encryptedPassword
  }

  controlPlane.env.PLT_CONTROL_PLANE_SECRET_KEYS = `${oldSecret},${newSecret}`

  {
    const { statusCode, body } = await controlPlane.inject({
      method: 'POST',
      url: `/pods/${podId}/instance`,
      headers: {
        'content-type': 'application/json',
        'x-k8s': generateK8sHeader(podId)
      },
      body: { applicationName }
    })

    assert.strictEqual(statusCode, 200, body)

    const { httpCache } = JSON.parse(body)

    assert.ok(httpCache.clientOpts.username)
    assert.ok(httpCache.clientOpts.password)

    assert.strictEqual(httpCache.clientOpts.password, cachePassword)

    const valkeyUsers = await controlPlane.platformatic.entities.valkeyUser.find()
    assert.strictEqual(valkeyUsers.length, 1)

    const valkeyUser = valkeyUsers[0]
    assert.notStrictEqual(valkeyUser.encryptedPassword, encryptedPassword)
  }
})
