'use strict'

const assert = require('node:assert')
const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const {
  bootstrap,
  startControlPlane,
  startRiskService,
  startMetrics
} = require('../helper')

test('optimize taxonomy', async (t) => {
  const applicationId1 = randomUUID()
  const applicationId2 = randomUUID()

  const applicationName1 = 'test-app-1'
  const applicationName2 = 'test-app-2'

  const graph = {
    applications: [
      {
        id: applicationId1,
        name: applicationName1,
        services: [
          {
            id: 'service1',
            type: 'composer',
            plugins: [],
            version: '1.42.0',
            entrypoint: true
          },
          {
            id: 'service2',
            type: 'db',
            plugins: [],
            version: '1.42.0',
            entrypoint: false
          }
        ]
      },
      {
        id: applicationId2,
        name: applicationName2,
        services: [
          {
            id: 'service1',
            type: 'composer',
            plugins: [],
            version: '1.42.0',
            entrypoint: true
          },
          {
            id: 'service2',
            type: 'db',
            plugins: [],
            version: '1.42.0',
            entrypoint: false
          }
        ]
      }
    ]
  }

  await startRiskService(t, {
    getLatencies: () => {
      return [
        {
          from: `${applicationId1}__${applicationName1}-service1`,
          to: `${applicationId1}__${applicationName1}-service2`,
          count: 12,
          mean: 4345
        },
        {
          from: `${applicationId1}__${applicationName1}-service1`,
          to: `${applicationId2}__${applicationName2}-service2`,
          count: 10,
          mean: 4242
        },
        {
          from: `${applicationId2}__${applicationName2}-service2`,
          to: `${applicationId1}__${applicationName1}-service1`,
          count: 5,
          mean: 4243
        },
        {
          from: `${applicationId2}__${applicationName2}-service2`,
          to: `${applicationId1}__${applicationName1}-service2`,
          count: 8,
          mean: 4143
        },
        {
          from: '',
          to: `${applicationName2}__${applicationName2}-service1`,
          count: 200,
          mean: 4244
        }
      ]
    }
  })

  await startMetrics(t, {
    postServices: () => {
      const metrics = {
        averageCallsCount: 1000,
        overall50pLatency: 200,
        overall95pLatency: 300
      }

      metrics.servicesLinks = {
        X: {
          [`${applicationName1}-service1`]: { count: 42, latency: 42 }
        },
        [`${applicationName1}-service1`]: {
          [`${applicationName1}-service2`]: { count: 42, latency: 42 }
        },
        [`${applicationName1}-service2`]: {
          [`${applicationName1}-service1`]: { count: 42, latency: 42 }
        },
        [`${applicationName2}-service1`]: {
          [`${applicationName2}-service2`]: { count: 42, latency: 42 }
        },
        [`${applicationName2}-service2`]: {
          [`${applicationName2}-service1`]: { count: 42, latency: 42 }
        }
      }
      return metrics
    },
    postServicesMetrics: ({ applications }) => {
      return {
        applications: [
          {
            appId: applicationId1,
            services: [
              { serviceId: 'service1', cpu: 40, heap: 270, loop: 14 },
              { serviceId: 'service2', cpu: 45, heap: 111, loop: 17 }
            ]
          },
          {
            appId: applicationId2,
            services: [
              { serviceId: 'service1', cpu: 48, heap: 180, loop: 5 },
              { serviceId: 'service2', cpu: 30, heap: 94, loop: 7 }
            ]
          }
        ]
      }
    }
  })

  await startControlPlane(t, { getGraph: () => graph })

  const server = await bootstrap(t, {
    // logLevel: 'trace'
  })

  const res = await server.inject({ url: '/optimize' })
  const body = res.json()

  assert.strictEqual(res.statusCode, 200, JSON.stringify(body, null, 2))

  const { apps, steps } = body
  assert(typeof apps === 'object')
  assert(Array.isArray(steps))

  // Has expected set of apps
  assert(apps.length > 2)
  const [app1, app2, app3] = apps

  // Has expected app names
  assert.strictEqual(app1.name, applicationName1)
  assert.strictEqual(app2.name, applicationName2)
  assert.match(app3.name, /test-app-1-reassigned-\d+/)

  // Has expected app budgets
  for (const app of apps) {
    assert.strictEqual(typeof app.budgets, 'object')
    for (const type of ['cpu', 'heap', 'loop']) {
      const budget = app.budgets[type]
      assert.strictEqual(typeof budget, 'object')
      for (const field of ['allocated', 'available', 'max', 'min', 'used']) {
        assert.strictEqual(typeof budget[field], 'number')
        assert(budget[field] >= 0, `${budget[field]}, ${field}, ${JSON.stringify(budget)}`)
      }
    }
  }

  // Every app has a composer
  for (const app of apps) {
    const composer = app.services.find(s => s.type === 'composer')
    if (!composer) {
      console.log(app.services)
    }
    assert.ok(composer, 'has composer')
    // assert.deepStrictEqual(composer, {
    //   name: 'composer',
    //   costs: { cpu: 5, heap: 256, loop: 1 },
    //   links: []
    // })
  }

  // Has expected services
  assert(
    apps.every(app => app.services.length),
    'every app has services'
  )

  // Apps have been duplicated
  const allServices = apps.flatMap(a => a.services)
  assert(
    allServices.filter(s => /-dupe-/.test(s.name)).length,
    'has duplicated apps'
  )

  // Some apps have links
  assert(
    allServices.filter(s => s.links.length).length,
    'services have links'
  )

  // Saw a duplicate-service step
  const duplicateStep = body.steps
    .find(s => s.type === 'duplicate-service')
  assert(duplicateStep, 'A service has been duplicated')
  assert.strictEqual(typeof duplicateStep.sourceApplicationName, 'string')
  assert.strictEqual(typeof duplicateStep.targetApplicationName, 'string')
  assert.strictEqual(typeof duplicateStep.sourceServiceId, 'string')
  assert.strictEqual(typeof duplicateStep.targetServiceId, 'string')
  assert.notStrictEqual(
    (duplicateStep.sourceApplicationName !== duplicateStep.targetApplicationName) ||
    (duplicateStep.sourceServiceId !== duplicateStep.targetServiceId),
    'App or service name have changed'
  )
  assert.match(duplicateStep.message, /Duplicate service/)

  // Saw a create-application step
  const createAppStep = body.steps
    .find(s => s.type === 'create-application')
  assert(createAppStep, 'An application has been duplicated')
  assert.strictEqual(typeof createAppStep.applicationName, 'string')
  assert.match(createAppStep.message, /new application/)

  // Saw a move-service step
  const moveStep = body.steps
    .find(s => s.type === 'move-service')
  assert(moveStep, 'A service has been moved')
  assert.strictEqual(typeof moveStep.sourceApplicationName, 'string')
  assert.strictEqual(typeof moveStep.targetApplicationName, 'string')
  assert.strictEqual(typeof moveStep.sourceServiceId, 'string')
  assert.strictEqual(typeof moveStep.targetServiceId, 'string')
  assert.notStrictEqual(
    (moveStep.sourceApplicationName !== moveStep.targetApplicationName) ||
    (moveStep.sourceServiceId !== moveStep.targetServiceId),
    'App or service name have changed'
  )
  assert.match(moveStep.message, /Move service/)

  // the data should be stored in database
  const storedData = await server.platformatic.entities.recommendation.find()
  assert.equal(storedData.length, 1)
  const recommendation = storedData[0]
  assert.ok(recommendation.id)

  // all steps have a 'status' field after save
  for (const step of recommendation.data.steps) {
    assert.ok(step.id)
    assert.equal(step.status, null)
  }

  assert.equal(recommendation.status, 'new')
})
