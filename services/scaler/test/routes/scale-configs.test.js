'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const { buildServer, startMachinist } = require('../helper')

test('should save application min and max pods (triggers scale up)', async (t) => {
  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const controllerId = 'controller-id'
  const namespace = 'platformatic'
  const podId = 'pod-id'
  const kind = 'Controller'
  const apiVersion = 'v1'

  const server = await buildServer(t)
  t.after(async () => {
    await server.close()
  })

  const controllerUpdates = []
  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      kind,
      apiVersion,
      replicas: 1
    }),
    setPodController: (controller) => {
      controllerUpdates.push(controller)
    }
  })

  {
    const { statusCode } = await server.inject({
      method: 'POST',
      url: '/controllers',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        applicationId,
        deploymentId,
        namespace,
        podId
      })
    })
    assert.strictEqual(statusCode, 200)
  }

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

  assert.strictEqual(controllerUpdates.length, 1)

  const controller = controllerUpdates[0]
  assert.strictEqual(controller.controllerId, controllerId)
  assert.strictEqual(controller.namespace, namespace)
  assert.strictEqual(controller.replicas, 2)
})

test('should save application min and max pods (triggers scale down)', async (t) => {
  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const controllerId = 'controller-id'
  const namespace = 'platformatic'
  const podId = 'pod-id'
  const kind = 'Controller'
  const apiVersion = 'v1'

  const server = await buildServer(t)
  t.after(async () => {
    await server.close()
  })

  const controllerUpdates = []
  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      kind,
      apiVersion,
      replicas: 10
    }),
    setPodController: (controller) => {
      controllerUpdates.push(controller)
    }
  })

  {
    const { statusCode } = await server.inject({
      method: 'POST',
      url: '/controllers',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        applicationId,
        deploymentId,
        namespace,
        podId
      })
    })
    assert.strictEqual(statusCode, 200)
  }

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

  assert.strictEqual(controllerUpdates.length, 1)

  const controller = controllerUpdates[0]
  assert.strictEqual(controller.controllerId, controllerId)
  assert.strictEqual(controller.namespace, namespace)
  assert.strictEqual(controller.replicas, 4)
})

test('should keep history of configs and get only the last one', async (t) => {
  const applicationId = randomUUID()
  const deploymentId = randomUUID()
  const controllerId = 'controller-id'
  const namespace = 'platformatic'
  const podId = 'pod-id'
  const kind = 'Controller'
  const apiVersion = 'v1'

  const server = await buildServer(t)
  t.after(async () => {
    await server.close()
  })

  const controllerUpdates = []
  await startMachinist(t, {
    getPodController: () => ({
      name: controllerId,
      kind,
      apiVersion,
      replicas: 1
    }),
    setPodController: (controller) => {
      controllerUpdates.push(controller)
    }
  })

  {
    const { statusCode } = await server.inject({
      method: 'POST',
      url: '/controllers',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        applicationId,
        deploymentId,
        namespace,
        podId
      })
    })
    assert.strictEqual(statusCode, 200)
  }

  for (let i = 1; i <= 10; i++) {
    const { statusCode } = await server.inject({
      method: 'POST',
      url: `/applications/${applicationId}/scale-configs`,
      headers: {
        'content-type': 'application/json'
      },
      payload: JSON.stringify({ minPods: 1 * i, maxPods: 10 * i })
    })
    assert.strictEqual(statusCode, 200)
  }

  const { statusCode, body } = await server.inject({
    url: `/applications/${applicationId}/scale-configs`
  })

  assert.strictEqual(statusCode, 200)

  const scaleConfig = JSON.parse(body)
  assert.strictEqual(scaleConfig.applicationId, applicationId)
  assert.strictEqual(scaleConfig.minPods, 10)
  assert.strictEqual(scaleConfig.maxPods, 100)

  assert.strictEqual(controllerUpdates.length, 9)
})
