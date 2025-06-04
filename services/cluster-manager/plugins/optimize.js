/// <reference path="../global.d.ts" />

'use strict'

const fp = require('fastify-plugin')
const { Cluster } = require('@platformatic/service-grouping')
const { OptimizeError, RecommendationCalculating } = require('../lib/errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  app.decorate('optimizeAndRecommend', async (metricsData = {}, ctx) => {
    const { composerCosts, podBudget } = metricsData
    let calculatingRecommendation
    try {
      calculatingRecommendation = await app.startRecommendation(ctx)
    } catch (err) {
      if (err instanceof RecommendationCalculating) {
        ctx.req.log.info('Recommendation already in progress')
        return
      }
      throw err
    }
    try {
      const result = await app.optimize(podBudget, composerCosts, ctx)
      if (result.steps.length === 0) {
        // delete calculatingRecommendation
        await app.platformatic.entities.recommendation.delete({
          where: { id: { eq: calculatingRecommendation.id } }
        })
      } else {
        await app.storeRecommendation(calculatingRecommendation, result, ctx)
      }
      return result
    } catch (err) {
      // Delete calculating recommendation as something happened
      await app.platformatic.entities.recommendation.delete({
        where: { id: { eq: calculatingRecommendation.id } }
      })
      throw err
    }
  })

  app.decorate('defaultPodBudget', (podBudget) => {
    const { cpu, heap, loop } = podBudget ?? {}
    return {
      cpu: {
        min: cpu?.min ?? 0,
        max: cpu?.max ?? 100
      },
      heap: {
        min: heap?.min ?? 0,
        max: heap?.max ?? 1024
      },
      loop: {
        min: loop?.min ?? 0,
        max: loop?.max ?? 100
      }
    }
  })

  app.decorate('defaultComposerCosts', (composerCosts) => {
    const { cpu, heap, loop } = composerCosts ?? {}
    return {
      cpu: cpu ?? 5,
      heap: heap ?? 256,
      loop: loop ?? 1
    }
  })

  app.decorate('optimize', async (podBudget, composerCosts, ctx) => {
    const { controlPlane, metrics, riskService, log } = ctx.req

    // Create a child logger for the optimization task
    const logger = log

    try {
      // Apply defaults to any missing budgets or composer costs
      podBudget = app.defaultPodBudget(podBudget)
      composerCosts = app.defaultComposerCosts(composerCosts)

      logger.info('Optimizing taxonomy graph')

      // Extract list of all services from every application in current taxonomy graph
      const { applications = [] } = await controlPlane.getGenerationGraph()
      logger.info({ applications }, 'applications:')

      // Get path metrics
      const serviceLinks = await riskService.getLatencies()
      logger.info(serviceLinks, 'service links:')

      // Build map of services by app and list of app ids
      const appIds = []
      const appNames = {}
      const appServices = {}
      for (const { id, name, services } of applications) {
        appServices[id] = services
        appNames[id] = name
        appIds.push(id)
      }

      // Get metrics data for all services in the taxonomy
      const metricsData = await metrics.postServicesMetrics({
        applications: appIds.map(id => {
          const services = appServices[id]?.map(({ id }) => ({ serviceId: id }))
          return { applicationId: id, services }
        })
      })
      logger.info(metricsData, 'metrics:')

      if (!Array.isArray(metricsData.applications)) {
        throw new Error('metricsData.applications is not an array')
      }
      if (metricsData.applications.length === 0) {
        // return empty optimization
        return { apps: [], steps: [] }
      }

      // Extract list of all services from every application in current taxonomy graph
      const services = appIds.flatMap((appId) => {
        const services = appServices[appId]
        const serviceMetrics = metricsData.applications
          .find(app => app.appId === appId)
          .services

        return services.map((service) => {
          const { cpu, heap, loop } = serviceMetrics
            .find(({ serviceId }) => serviceId === service.id)

          return {
            id: service.id,
            appName: appNames[appId],
            serviceName: service.id,
            appServiceName: `${appNames[appId]}:${service.id}`,
            costs: { cpu, heap: heap / (1 << 20), loop }
          }
        })
      })
      logger.info(services, 'services:')

      // Create graph paths for each service-to-service communication,
      // at this stage the traffic data is unidirectional
      const links = serviceLinks
        .filter(d => d.from !== '' && d.to !== '')
        .map(({ from, to, count, mean }) => {
          const [fromTarget, toTarget] = [from, to].map((s) => {
            const index = s.indexOf('__')
            const appId = s.slice(0, index)
            const app = appNames[appId]
            const serviceTarget = s.slice(index + 2)
            const service = services
              .find(({ appName, serviceName }) => {
                return `${appName}-${serviceName}` === serviceTarget
              })
            return [app, service?.id]
          })

          return {
            from: fromTarget,
            to: toTarget,
            count,
            average: mean
          }
        })
      logger.info(links, 'links:')

      // Create cluster representation from current state
      const clusterConfig = {
        // TODO: Also make min configurable
        budgets: podBudget,
        composerCosts,
        applications: Object.fromEntries(
          Object.entries(appServices).map(([appId, serviceSet]) => {
            const app = appNames[appId]
            const found = serviceSet.map(({ id, type }) => {
              const service = services.find(({ appName, serviceName }) => appName === app && serviceName === id)
              if (!service) return undefined
              return {
                type,
                name: service.id,
                costs: service.costs
              }
            }).filter(b => b !== undefined)
            return [app, found]
          })
        ),
        links
      }
      logger.info(clusterConfig, 'cluster config:')
      const cluster = Cluster.from(clusterConfig, logger)

      // Calculate the optimal cluster set for the given services and links
      cluster.optimize()

      const result = cluster.toJSON()

      return result
    } catch (err) {
      logger.error(err)
      throw new OptimizeError(err.stack)
    }
  })
}, {
  name: 'optimize',
  dependencies: []
})
