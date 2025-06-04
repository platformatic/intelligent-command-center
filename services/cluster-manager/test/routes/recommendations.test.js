'use strict'

const assert = require('node:assert')
const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const {
  bootstrap,
  getRandomElementFromArray,
  startControlPlane,
  startRiskService,
  startMetrics
} = require('../helper')

test('should update recommendation status', async (t) => {
  const server = await bootstrap(t)

  const recommendation = await server.platformatic.entities.recommendation.insert({
    inputs: [{ status: 'new', data: {} }]
  })

  const res = await server.inject({
    method: 'PUT',
    url: `/recommendations/${recommendation[0].id}`,
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      status: 'skipped',
      data: {},
      count: null
    })
  })

  const body = res.json()
  assert.strictEqual(res.statusCode, 200, JSON.stringify(body))
  assert.equal(recommendation[0].id, body.id)
  assert.equal(body.status, 'skipped')
})

test('should NOT update recommendation status with an invalid value', async (t) => {
  const server = await bootstrap(t)

  const recommendation = await server.platformatic.entities.recommendation.insert({
    inputs: [{ status: 'new', data: {} }]
  })

  const res = await server.inject({
    method: 'PUT',
    url: `/recommendations/${recommendation[0].id}`,
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      status: 'invalid',
      count: null
    })
  })
  const body = res.json()
  assert.strictEqual(res.statusCode, 400, JSON.stringify(body))
  assert.deepEqual(body, {
    code: 'FST_ERR_VALIDATION',
    error: 'Bad Request',
    message: 'body/status must be equal to one of the allowed values',
    statusCode: 400
  })
})

test('should set status \'aborted\' or \'done\' only to recommendations with status \'in_progress\'', async (t) => {
  for (const newStatus of ['done', 'aborted']) {
    const server = await bootstrap(t)

    const newRecommendation = await server.platformatic.entities.recommendation.insert({
      inputs: [{ status: 'new', data: {} }]
    })
    const inProgressRecommendation = await server.platformatic.entities.recommendation.insert({
      inputs: [{ status: 'in_progress', data: {} }]
    })

    {
      const res = await server.inject({
        method: 'PUT',
        url: `/recommendations/${newRecommendation[0].id}`,
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          count: null
        })
      })

      const body = res.json()
      assert.strictEqual(res.statusCode, 400, JSON.stringify(body))
      assert.deepEqual(body, {
        code: 'PLT_CLUSTER_MANAGER_INVALID_STATUS_FLOW',
        error: 'Bad Request',
        message: `New status "${newStatus}" is not valid for recommendation in status "new"`,
        statusCode: 400
      })
    }
    {
      const res = await server.inject({
        method: 'PUT',
        url: `/recommendations/${inProgressRecommendation[0].id}`,
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          count: null
        })
      })
      const body = res.json()
      assert.strictEqual(res.statusCode, 200, JSON.stringify(body))
      assert.deepEqual(body.status, newStatus)
    }
  }
})

test('should set status \'skipped\' only to recommendations with status \'new\'', async (t) => {
  const server = await bootstrap(t)

  const newRecommendation = await server.platformatic.entities.recommendation.insert({
    inputs: [{ status: 'new', data: {} }]
  })

  const res = await server.inject({
    method: 'PUT',
    url: `/recommendations/${newRecommendation[0].id}`,
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      status: 'skipped',
      count: null
    })
  })
  const body = res.json()
  assert.strictEqual(res.statusCode, 200, JSON.stringify(body))
  assert.deepEqual(body.status, 'skipped')
})

test('should NOT set status \'calculating\' for an recommendation', async (t) => {
  const server = await bootstrap(t)

  const inProgressRecommendation = await server.platformatic.entities.recommendation.insert({
    inputs: [{ status: 'in_progress', data: {} }]
  })

  const res = await server.inject({
    method: 'PUT',
    url: `/recommendations/${inProgressRecommendation[0].id}`,
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      status: 'calculating',
      count: null
    })
  })
  const body = res.json()
  assert.strictEqual(res.statusCode, 400, JSON.stringify(body))
  assert.deepEqual(body, {
    code: 'PLT_CLUSTER_MANAGER_INVALID_STATUS',
    error: 'Bad Request',
    message: 'Invalid status "calculating"',
    statusCode: 400
  })
})

test('should NOT set status \'expired\' for an recommendation', async (t) => {
  const server = await bootstrap(t)

  const inProgressRecommendation = await server.platformatic.entities.recommendation.insert({
    inputs: [{ status: 'in_progress', data: {} }]
  })

  const res = await server.inject({
    method: 'PUT',
    url: `/recommendations/${inProgressRecommendation[0].id}`,
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      status: 'expired',
      count: null
    })
  })

  const body = res.json()
  assert.strictEqual(res.statusCode, 400, JSON.stringify(body))
  assert.deepEqual(body, {
    code: 'PLT_CLUSTER_MANAGER_INVALID_STATUS',
    error: 'Bad Request',
    message: 'Invalid status "expired"',
    statusCode: 400
  })
})

test('should set status \'expired\' to all previous optmizations with status \'new\'', async (t) => {
  const server = await bootstrap(t)
  const OPT_COUNT = 3

  const inputs = []
  inputs.push({ status: 'new', data: {} })

  for (let i = 0; i < OPT_COUNT; i++) {
    inputs.push({
      status: getRandomElementFromArray(['in_progress', 'skipped', 'aborted', 'done']),
      data: {}
    })
  }

  const insertResult = await server.platformatic.entities.recommendation.insert({ inputs })
  const recommendationMap = {}
  insertResult.forEach((ir) => {
    recommendationMap[ir.id] = ir.status
  })

  // store a new recommendation for the same taxonomy
  const recommendation = await server.startRecommendation({})
  await server.storeRecommendation(recommendation, { foo: 'bar' }, {})

  const allRecommendations = await server.platformatic.entities.recommendation.find({
    orderBy: [{ field: 'createdAt', direction: 'DESC' }]
  })

  // latest saved recommendation is the 'new' one
  assert.equal(allRecommendations[0].status, 'new')
  assert.ok(allRecommendations[0].count)

  for (let i = 1; i < allRecommendations.length; i++) {
    const oldRecommendation = allRecommendations[i]
    if (oldRecommendation.status === 'expired') {
      // this one has changed from 'new' to 'expired'
      assert.equal(recommendationMap[oldRecommendation.id], 'new')
    } else {
      // the others have the same status as before
      assert.equal(oldRecommendation.status, recommendationMap[oldRecommendation.id])
    }
    assert.ok(oldRecommendation.count >= 0)
  }
})

test('should NOT delete an recommendation', async (t) => {
  const server = await bootstrap(t)

  const res = await server.inject({
    method: 'DELETE',
    url: `/recommendations/${randomUUID()}`
  })
  const body = res.json()
  assert.strictEqual(res.statusCode, 404, JSON.stringify(body))
})

test('can set status \'in_progress\' to recommendations with status \'skipped\' or \'new\'', async (t) => {
  const server = await bootstrap(t)

  const skippedRecommendation = await server.platformatic.entities.recommendation.insert({
    inputs: [{ status: 'skipped', data: {} }]
  })
  const newRecommendation = await server.platformatic.entities.recommendation.insert({
    inputs: [{ status: 'skipped', data: {} }]
  })

  {
    const res = await server.inject({
      method: 'PUT',
      url: `/recommendations/${skippedRecommendation[0].id}`,
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        status: 'in_progress',
        count: null
      })
    })
    const body = res.json()
    assert.strictEqual(res.statusCode, 200, JSON.stringify(body))
    assert.deepEqual(body.status, 'in_progress')
  }

  {
    const res = await server.inject({
      method: 'PUT',
      url: `/recommendations/${newRecommendation[0].id}`,
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        status: 'in_progress',
        count: null
      })
    })
    const body = res.json()
    assert.strictEqual(res.statusCode, 200, JSON.stringify(body))
    assert.deepEqual(body.status, 'in_progress')
  }
})

test('should get recommendations count', async (t) => {
  const server = await bootstrap(t)
  {
    const res = await server.inject({
      method: 'GET',
      url: '/recommendations/count'
    })
    const body = await res.body
    assert.equal(res.statusCode, 200)
    assert.equal(parseInt(body), 0)
  }

  {
    await server.platformatic.entities.recommendation.insert({
      inputs: [
        {
          status: 'new',
          data: {}
        }
      ]
    })
    const res = await server.inject({
      method: 'GET',
      url: '/recommendations/count'
    })
    const body = await res.body
    assert.equal(res.statusCode, 200)
    assert.equal(parseInt(body), 1)
  }
})

test('have \'count\' field auto incremented', async (t) => {
  const server = await bootstrap(t)

  const recommendationData = [
    { status: 'new', data: {} },
    { status: 'in_progress', data: {} }
  ]

  await server.platformatic.entities.recommendation.insert({
    inputs: recommendationData
  })
  const res = await server.inject({
    method: 'GET',
    url: '/recommendations'
  })
  const body = await res.json()
  assert.equal(res.statusCode, 200)
  assert.equal(body[0].count, 1)
  assert.equal(body[1].count, 2)
})

test('do not override \'count\' field', async (t) => {
  const server = await bootstrap(t)

  const recommendationData = [
    { status: 'new', data: {} },
    { status: 'in_progress', data: {} }
  ]
  const saved = await server.platformatic.entities.recommendation.insert({
    inputs: recommendationData
  })
  const newRecommendation = saved[0]
  const res = await server.inject({
    method: 'PUT',
    url: `/recommendations/${newRecommendation.id}`,
    body: {
      status: 'new',
      count: 123
    }
  })
  const body = await res.json()
  assert.equal(res.statusCode, 200)
  assert.equal(body.count, newRecommendation.count)

  {
    // the counter keeps going
    const saved = await server.platformatic.entities.recommendation.insert({
      inputs: [{ status: 'in_progress', data: {} }]
    })

    assert.equal(saved[0].count, 3)
  }
  {
    // the counter keeps going
    const all = await server.platformatic.entities.recommendation.find({
      fields: ['count'],
      orderBy: [{ field: 'count', direction: 'ASC' }]
    })

    assert.deepEqual(all.map((row) => row.count), [1, 2, 3])
  }
})

test('should delete calculating recommendation on caught error', async (t) => {
  await startRiskService(t, { getLatencies: () => [] })
  await startMetrics(t, {
    postServicesMetrics: () => ({ applications: [] })
  })
  await startControlPlane(t, {
    getGraphs: () => ({ applications: [] })
  })

  const server = await bootstrap(t)
  {
    // If throws an error, the calculating recommendation should be deleted
    const res = await server.inject({ url: '/optimize' })
    const body = res.json()
    const recommendations = await server.platformatic.entities.recommendation.find({})
    assert.deepEqual(recommendations, [])
    assert.deepEqual(body, { apps: [], steps: [] })
  }
})
