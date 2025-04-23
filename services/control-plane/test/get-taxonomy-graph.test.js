'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const {
  startControlPlane,
  startMetrics,
  startActivities,
  startMachinist,
  generateApplicationState,
  startUpdates
} = require('./helper')

test('should get a generation graph', async (t) => {
  await startMetrics(t, {
    postServices: () => {
      return {
        averageCallsCount: 1000,
        overall50pLatency: 200,
        overall95pLatency: 300,
        servicesLinks: {
          X: {
            [app1Service1TelemetryId]: {
              count: 200,
              latency: 123
            }
          },
          [app1Service1TelemetryId]: {
            [app1Service2TelemetryId]: {
              count: 1500,
              latency: 350
            }
          },
          [app1Service2TelemetryId]: {
            [app2Service1TelemetryId]: {
              count: 999,
              latency: 345
            }
          },
          [app2Service2TelemetryId]: {
            [app1Service1TelemetryId]: {
              count: 999,
              latency: 222
            }
          }
        }
      }
    }
  })

  const controlPlane = await startControlPlane(t)

  const {
    application: application1,
    deployment: deployment1
  } = await controlPlane.testApi.saveDetectedPod(
    'test-app-1',
    'test-image-1',
    'test-pod-1'
  )

  const {
    generation,
    application: application2,
    deployment: deployment2
  } = await controlPlane.testApi.saveDetectedPod(
    'test-app-2',
    'test-image-2',
    'test-pod-2'
  )

  const applicationState1 = generateApplicationState(application1.id)
  const applicationState2 = generateApplicationState(application2.id)

  await controlPlane.platformatic.entities.applicationState.insert({
    inputs: [applicationState1, applicationState2]
  })
  await controlPlane.platformatic.entities.deployment.save({
    input: { id: deployment1.id, applicationStateId: applicationState1.id }
  })
  await controlPlane.platformatic.entities.deployment.save({
    input: { id: deployment2.id, applicationStateId: applicationState2.id }
  })

  const app1Service1TelemetryId = `${application1.name}-service1`
  const app1Service2TelemetryId = `${application1.name}-service2`
  const app2Service1TelemetryId = `${application2.name}-service1`
  const app2Service2TelemetryId = `${application2.name}-service2`

  const { statusCode, body } = await controlPlane.inject({ url: '/graph' })

  assert.strictEqual(statusCode, 200, body)

  const { applications, links } = JSON.parse(body)

  assert.strictEqual(applications.length, 2)

  const application1Node = applications.find((app) => app.id === application1.id)
  const application1State = JSON.parse(applicationState1.state)
  assert.deepStrictEqual(application1Node, {
    id: application1.id,
    name: 'test-app-1',
    services: [
      {
        ...application1State.services[0],
        dependencies: [{
          applicationId: application1.id,
          serviceId: 'service2'
        }]
      },
      {
        ...application1State.services[1],
        dependencies: [{
          applicationId: application2.id,
          serviceId: 'service1'
        }]
      }
    ]
  })

  const application2Node = applications.find((app) => app.id === application2.id)
  const application2State = JSON.parse(applicationState2.state)
  assert.deepStrictEqual(application2Node, {
    id: application2.id,
    name: 'test-app-2',
    services: [
      {
        ...application2State.services[0],
        dependencies: []
      },
      {
        ...application2State.services[1],
        dependencies: [{
          applicationId: application1.id,
          serviceId: 'service1'
        }]
      }
    ]
  })

  assert.strictEqual(links.length, 5)

  {
    const incomeLinks = links.filter(
      (link) => link.source.telemetryId === 'X'
    )

    assert.strictEqual(incomeLinks.length, 2)

    assert.deepStrictEqual(
      incomeLinks.sort(
        (l1, l2) => l1.target.telemetryId.localeCompare(l2.target.telemetryId)
      ),
      [
        {
          source: {
            applicationId: null,
            serviceId: null,
            telemetryId: 'X'
          },
          target: {
            applicationId: application1.id,
            serviceId: 'service1',
            telemetryId: app1Service1TelemetryId
          },
          requestsAmount: 'no_requests',
          responseTime: 'no_requests'
        },
        {
          source: {
            applicationId: null,
            serviceId: null,
            telemetryId: 'X'
          },
          target: {
            applicationId: application2.id,
            serviceId: 'service1',
            telemetryId: app2Service1TelemetryId
          },
          requestsAmount: 'no_requests',
          responseTime: 'no_requests'
        }
      ])
  }

  {
    const application1Links = links.filter(
      (link) => link.source.applicationId === application1.id
    )
    assert.strictEqual(application1Links.length, 2)
    assert.deepStrictEqual(application1Links, [
      {
        source: {
          applicationId: application1.id,
          serviceId: 'service1',
          telemetryId: 'test-app-1-service1'
        },
        target: {
          applicationId: application1.id,
          serviceId: 'service2',
          telemetryId: 'test-app-1-service2'
        },
        requestsAmount: 'high',
        responseTime: 'slow'
      },
      {
        source: {
          applicationId: application1.id,
          serviceId: 'service2',
          telemetryId: 'test-app-1-service2'
        },
        target: {
          applicationId: application2.id,
          serviceId: 'service1',
          telemetryId: 'test-app-2-service1'
        },
        requestsAmount: 'medium',
        responseTime: 'slow'
      }
    ])
  }

  {
    const application2Links = links.filter(
      (link) => link.source.applicationId === application2.id
    )
    assert.strictEqual(application2Links.length, 1)
    assert.deepStrictEqual(application2Links, [
      {
        source: {
          applicationId: application2.id,
          serviceId: 'service2',
          telemetryId: 'test-app-2-service2'
        },
        target: {
          applicationId: application1.id,
          serviceId: 'service1',
          telemetryId: 'test-app-1-service1'
        },
        requestsAmount: 'medium',
        responseTime: 'medium'
      }
    ])
  }

  const graphs = await controlPlane.platformatic.entities.graph.find()
  assert.strictEqual(graphs.length, 2)

  const graph = graphs.find((g) => g.generationId === generation.id)
  assert.strictEqual(graph.generationId, generation.id)

  const linksWithoutMetrics = links.map((link) => {
    return { ...link, requestsAmount: 'no_requests', responseTime: 'no_requests' }
  })
  assert.deepStrictEqual(graph.graph, { applications, links: linksWithoutMetrics })
})

test('should get a previous generation graph', async (t) => {
  const app1Service1TelemetryId = 'test-app-1-service1'
  const app1Service2TelemetryId = 'test-app-1-service2'

  await startActivities(t)

  await startMetrics(t, {
    postServices: () => {
      return {
        averageCallsCount: 1000,
        overall50pLatency: 200,
        overall95pLatency: 300,
        servicesLinks: {
          X: {
            [app1Service1TelemetryId]: {
              count: 200,
              latency: 123
            }
          },
          [app1Service1TelemetryId]: {
            [app1Service2TelemetryId]: {
              count: 1500,
              latency: 350
            }
          }
        }
      }
    }
  })

  await startMachinist(t, {
    getPodDetails: (podId) => ({ imageId: 'test-image-2' })
  })

  await startUpdates(t)

  const controlPlane = await startControlPlane(t)

  const {
    generation: generation1,
    application,
    deployment
  } = await controlPlane.testApi.saveDetectedPod(
    'test-app-1',
    'test-image-1',
    'test-pod-1'
  )

  const applicationState = generateApplicationState(application.id)

  await controlPlane.platformatic.entities.applicationState.insert({
    inputs: [applicationState]
  })
  await controlPlane.platformatic.entities.deployment.save({
    input: { id: deployment.id, applicationStateId: applicationState.id }
  })

  {
    const applicationName = 'test-app-2'
    const podId = 'test-pod-2'

    const { statusCode, body } = await controlPlane.inject({
      method: 'POST',
      url: `/pods/${podId}/instance`,
      headers: {
        'content-type': 'application/json'
      },
      body: { applicationName }
    })
    assert.strictEqual(statusCode, 200, body)
  }

  const { statusCode, body } = await controlPlane.inject({
    method: 'GET',
    url: '/graph',
    query: { generationId: generation1.id }
  })

  assert.strictEqual(statusCode, 200, body)

  const { applications, links } = JSON.parse(body)

  assert.strictEqual(applications.length, 1)
  assert.strictEqual(links.length, 2)

  const incomeLinks = links.filter(
    (link) => link.source.telemetryId === 'X'
  )

  assert.strictEqual(incomeLinks.length, 1)

  assert.deepStrictEqual(incomeLinks, [
    {
      source: {
        applicationId: null,
        serviceId: null,
        telemetryId: 'X'
      },
      target: {
        applicationId: application.id,
        serviceId: 'service1',
        telemetryId: app1Service1TelemetryId
      },
      requestsAmount: 'no_requests',
      responseTime: 'no_requests'
    }
  ])

  const applicationLinks = links.filter(
    (link) => link.source.applicationId === application.id &&
      link.target.applicationId === application.id
  )
  assert.strictEqual(applicationLinks.length, 1)
  assert.deepStrictEqual(applicationLinks, [
    {
      source: {
        applicationId: application.id,
        serviceId: 'service1',
        telemetryId: app1Service1TelemetryId
      },
      target: {
        applicationId: application.id,
        serviceId: 'service2',
        telemetryId: app1Service2TelemetryId
      },
      requestsAmount: 'no_requests',
      responseTime: 'no_requests'
    }
  ])

  const graphs = await controlPlane.platformatic.entities.graph.find()
  assert.strictEqual(graphs.length, 1)

  const graph = graphs.find((g) => g.generationId === generation1.id)
  assert.strictEqual(graph.generationId, generation1.id)

  const linksWithoutMetrics = links.map((link) => {
    return { ...link, requestsAmount: 'no_requests', responseTime: 'no_requests' }
  })
  assert.deepStrictEqual(graph.graph, { applications, links: linksWithoutMetrics })
})
