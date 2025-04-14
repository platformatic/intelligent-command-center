'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const {
  startControlPlane,
  startMetrics,
  generateGeneration,
  generateApplication,
  generateApplicationState,
  generateDeployment,
  generateGraph
} = require('./helper')

test.skip('should get a generation graph', async (t) => {
  const generation = generateGeneration()

  const application1 = generateApplication('test-app-1')
  const application2 = generateApplication('test-app-2')

  const applicationState1 = generateApplicationState(application1.id)
  const applicationState2 = generateApplicationState(application2.id)

  const deployment1 = generateDeployment(
    application1.id,
    applicationState1.id
  )
  const deployment2 = generateDeployment(
    application2.id,
    applicationState2.id
  )

  const app1Service1TelemetryId = `${application1.name}-service1`
  const app1Service2TelemetryId = `${application1.name}-service2`
  const app2Service1TelemetryId = `${application2.name}-service1`
  const app2Service2TelemetryId = `${application2.name}-service2`

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

  const controlPlane = await startControlPlane(t, {
    generations: [generation],
    applications: [application1, application2],
    applicationStates: [applicationState1, applicationState2],
    deployments: [deployment1, deployment2]
  })

  const { statusCode, body } = await controlPlane.inject({
    method: 'GET',
    url: '/graph'
  })

  assert.strictEqual(statusCode, 200, body)

  const { applications, links } = JSON.parse(body)

  assert.strictEqual(applications.length, 2)

  const application1Node = applications.find((app) => app.id === application1.id)
  const application1State = JSON.parse(applicationState1.state)
  assert.deepStrictEqual(application1Node, {
    id: application1.id,
    name: 'test-app-1',
    path: '/test-app-1',
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
    path: null,
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

  assert.strictEqual(links.length, 4)

  {
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
          applicationId: application1.id,
          serviceId: 'service1',
          telemetryId: app1Service1TelemetryId
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

  const graphs = await controlPlane.platformatic.entities.graph.find({
    skipAuth: true
  })
  assert.strictEqual(graphs.length, 1)

  const graph = graphs[0]
  assert.strictEqual(graph.generationId, generation.id)

  const linksWithoutMetrics = links.map((link) => {
    return { ...link, requestsAmount: 'no_requests', responseTime: 'no_requests' }
  })
  assert.deepStrictEqual(graph.graph, { applications, links: linksWithoutMetrics })
})

test.skip('should get a previous generation graph', async (t) => {
  const generation1 = generateGeneration()
  const generation2 = generateGeneration()
  const graph = generateGraph(generation1.id)

  const controlPlane = await startControlPlane(t, {
    generations: [generation1],
    graphs: [graph]
  })

  await controlPlane.platformatic.entities.generation.save({
    input: generation2,
    skipAuth: true
  })

  const { statusCode, body } = await controlPlane.inject({
    method: 'GET',
    url: '/graph',
    query: { generationId: generation1.id }
  })

  assert.strictEqual(statusCode, 200, body)

  const { applications, links } = JSON.parse(body)
  assert.deepStrictEqual(applications, graph.graph.applications)
  assert.deepStrictEqual(links, graph.graph.links)
})
