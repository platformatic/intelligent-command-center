/// <reference path="../global.d.ts" />

'use strict'

const fp = require('fastify-plugin')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  app.decorate('getBaseGraph', async (generation, ctx) => {
    const { db, sql } = app.platformatic

    const applicationsWithStates = await db.query(sql`
      SELECT
        a.id as "id",
        a.name as "name",
        s.state as "state"
      FROM applications a
      JOIN deployments d ON
        d.application_id = a.id
      LEFT JOIN application_states s ON
        d.application_state_id = s.id
      LEFT JOIN generations_deployments gd ON
        gd.deployment_id = d.id
      WHERE gd.generation_id = ${generation.id}
    `)

    const applications = []
    const links = []

    for (const application of applicationsWithStates) {
      const services = application.state?.services ?? []

      if (services.length > 0) {
        const entrypoint = services.find(
          (service) => service.entrypoint === true
        )

        links.push({
          source: {
            applicationId: null,
            serviceId: null,
            telemetryId: 'X'
          },
          target: {
            applicationId: application.id,
            serviceId: entrypoint.id,
            telemetryId: `${application.name}-${entrypoint.id}`
          },
          requestsAmount: 'no_requests',
          responseTime: 'no_requests'
        })
      }

      applications.push({
        id: application.id,
        name: application.name,
        services
      })
    }

    let historyServiceLinks = null
    try {
      ({ servicesLinks: historyServiceLinks } = await ctx.req.metrics.postServices({
        applications,
        start: new Date(new Date(generation.createdAt).getTime() + 5000).toISOString(),
        end: new Date().toISOString()
      }))
    } catch (error) {
      app.log.error({ error }, 'Error while getting services metrics')
      throw error
    }

    function findServiceByTelemetryId (telemetryId) {
      for (const application of applications) {
        if (!telemetryId.startsWith(application.name)) {
          continue
        }

        const serviceTelemetryId = telemetryId.slice(
          application.name.length + 1
        )
        for (const service of application.services) {
          if (serviceTelemetryId === service.id) {
            return { application, service }
          }
        }
      }
      return { application: null, service: null }
    }

    for (const application of applications) {
      for (const service of application.services) {
        service.dependencies = []
      }
    }

    for (const sourceTelemetryId in historyServiceLinks) {
      for (const targetTelemetryId in historyServiceLinks[sourceTelemetryId]) {
        if (sourceTelemetryId === 'X') continue

        const {
          application: sourceApplication,
          service: sourceService
        } = findServiceByTelemetryId(sourceTelemetryId)

        const {
          application: targetApplication,
          service: targetService
        } = findServiceByTelemetryId(targetTelemetryId)

        if (
          sourceApplication &&
          targetApplication &&
          targetService.entrypoint !== true &&
          sourceApplication.id !== targetApplication.id
        ) {
          // Cross entrypoint link. This should never happen.
          app.log.error(
            { sourceApplication, targetApplication, targetService },
            'Cross entrypoint link found'
          )
          continue
        }

        const link = {
          source: {
            applicationId: sourceApplication?.id ?? null,
            serviceId: sourceService?.id ?? null,
            telemetryId: sourceTelemetryId
          },
          target: {
            applicationId: targetApplication?.id ?? null,
            serviceId: targetService?.id ?? null,
            telemetryId: targetTelemetryId
          },
          requestsAmount: 'no_requests',
          responseTime: 'no_requests'
        }

        if (sourceService) {
          sourceService.dependencies.push({
            applicationId: targetApplication?.id,
            serviceId: targetService?.id
          })
        }

        links.push(link)
      }
    }

    await app.saveHistoryGraph(
      generation,
      { applications, links }
    )

    return { applications, links }
  })

  app.decorate('getMainGraph', async (generation, ctx) => {
    const { applications, links } = await app.getBaseGraph(generation, ctx)

    const {
      averageCallsCount,
      overall50pLatency,
      overall95pLatency,
      servicesLinks: onlineServiceLinks
    } = await ctx.req.metrics.postServices({ applications })

    for (const sourceTelemetryId in onlineServiceLinks) {
      for (const targetTelemetryId in onlineServiceLinks[sourceTelemetryId]) {
        if (sourceTelemetryId === 'X') continue

        const link = links.find(
          (link) =>
            link.source.telemetryId === sourceTelemetryId &&
            link.target.telemetryId === targetTelemetryId
        )

        if (link === undefined) continue

        const onlineLinkData = onlineServiceLinks[sourceTelemetryId][targetTelemetryId]

        const { count, latency } = onlineLinkData
        link.requestsAmount = getRequestAmountLabel(count, averageCallsCount)
        link.responseTime = getResponseTimeLabel(
          latency,
          overall50pLatency,
          overall95pLatency
        )
      }
    }

    return { applications, links }
  })

  app.decorate('saveHistoryGraph', async (generation, graph) => {
    const graphs = await app.platformatic.entities.graph.find({
      where: { generationId: { eq: generation.id } }
    })

    const graphEntity = graphs.length === 0
      ? { generationId: generation.id }
      : graphs[0]

    graphEntity.graph = graph

    await app.platformatic.entities.graph.save({
      input: graphEntity
    })
  })

  app.decorate('getHistoryGraph', async (generation) => {
    const graphs = await app.platformatic.entities.graph.find({
      where: { generationId: { eq: generation.id } }
    })
    return graphs.length === 1 ? graphs[0].graph : null
  })

  // Very simple euristic.
  // If the count is 0, it's a no request
  // If the count is more than 130% of the average count, it's a high request.
  // If the count is less than 70% of the average count, it's a small request.
  // We can improve this, but keep in mind that it's hard to have "noemal" distribution behavior for all the services.
  // (realistically the real distributions won't be a normal distributions, will follow the pareto principle)
  function getRequestAmountLabel (count, averageCallsCount) {
    if (count === 0) {
      return 'no_request'
    }
    if (count > averageCallsCount * 1.3) {
      return 'high'
    }
    if (count < averageCallsCount * 0.7) {
      return 'small'
    }
    return 'medium'
  }

  // Less than 50p => fast
  // More than 95p => slow
  // Between 50p and 95p => medium
  function getResponseTimeLabel (latency, overall50pLatency, overall95pLatency) {
    // If the latency is not 0 and overall95pLatency is 0, it means that
    // prometheus ha no calculated the p50/p95 (yet).
    // So it's OK to say that we don't have enough info to say that the response is fast or slow.
    // We will return `no_info` in this case.
    if (overall50pLatency === 0 && overall95pLatency === 0) {
      return 'no_info'
    }

    if (latency === 0) {
      return 'no_request'
    }
    if (latency > overall95pLatency) {
      return 'slow'
    }
    if (latency < overall50pLatency) {
      return 'fast'
    }
    return 'medium'
  }
})
