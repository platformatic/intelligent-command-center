/// <reference path="../global.d.ts" />

'use strict'

const { randomUUID } = require('node:crypto')
const fp = require('fastify-plugin')
const { calculateScore } = require('../lib/algorithm')
const { getParentRoute } = require('../lib/utils')
const { InvalidStatus, InvalidStatusFlow } = require('./errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  const {
    PLT_TRAFFIC_INSPECTOR_RECOMMENDATION_SCORE_THRESHOLD: SCORE_THRESHOLD,
    PLT_TRAFFIC_INSPECTOR_RECOMMENDATION_HISTORY_LENGTH: HISTORY_LENGTH,
    PLT_TRAFFIC_INSPECTOR_RECOMMENDATION_DECAY_FACTOR: DECAY_FACTOR,
    PLT_TRAFFIC_INSPECTOR_RECOMMENDATION_EXPECTED_IDS: EXPECTED_IDS,
    PLT_TRAFFIC_INSPECTOR_RECOMMENDATION_HISTORY_WEIGHT: HISTORY_WEIGHT,
    PLT_TRAFFIC_INSPECTOR_RECOMMENDATION_PAST_SCORE_WEIGHT: PAST_SCORE_WEIGHT,
    PLT_TRAFFIC_INSPECTOR_RECOMMENDATION_SCALE_FACTOR: SCALE_FACTOR,
    PLT_TRAFFIC_INSPECTOR_RECOMMENDATION_SCALE_SIGMA: SCALE_SIGMA,
    PLT_TRAFFIC_INSPECTOR_RECOMMENDATION_BASE_TTL: BASE_TTL,
    PLT_TRAFFIC_INSPECTOR_RECOMMENDATION_MIN_TTL: MIN_TTL,
    PLT_TRAFFIC_INSPECTOR_RECOMMENDATION_MAX_TTL: MAX_TTL
  } = app.env

  app.decorate('generateRecommendation', async (ctx) => {
    const version = await app.getCurrentVersion()
    const routesMetrics = await getRoutesMetrics(version, ctx)

    let previousRecommendation = null
    let previousRecommendationRoutes = null

    if (version !== 0) {
      previousRecommendation = await app.getRecommendationByVersion(
        version - 1
      )
      if (previousRecommendation) {
        if (previousRecommendation.status === 'in_progress') return null

        previousRecommendationRoutes = await app.platformatic.entities.recommendationsRoute.find({
          where: { recommendationId: { eq: previousRecommendation.id } }
        })
      }
    }

    const recommendationId = randomUUID()
    const timestamp = new Date().toISOString()
    const routes = []

    const calculateRouteScore = (routeMetric, i) => {
      let parentRouteScore = 0
      let parentRouteRequestCount = 0

      const parentRoute = getParentRoute(routeMetric.route)
      if (parentRoute) {
        const parentRouteIndex = routesMetrics.findIndex(
          r => r.route === parentRoute
        )
        if (parentRouteIndex !== -1) {
          let parentRouteScores = routes[parentRouteIndex]
          if (parentRouteScores === undefined) {
            parentRouteScores = calculateRouteScore(
              routesMetrics[parentRouteIndex],
              parentRouteIndex
            )
          }
          parentRouteScore = parentRouteScores.score
          parentRouteRequestCount = parentRouteScores.requestsCount
        }
      }

      const {
        route,
        applicationId,
        telemetryId,
        serviceName,
        domain,
        requestsCount,
        distinctBodies,
        distinctUrls,
        maxBodySize,
        maxRequestsCount,
        hits,
        misses,
        avgInterRequestTime,
        interRequestTimes
      } = routeMetric

      let isFirstRecommendation = true
      let prevScoresHistory = null
      let prevFrequencyStats = null
      let prevStabilityStats = null

      if (previousRecommendationRoutes) {
        const previousRoute = previousRecommendationRoutes.find(
          r =>
            r.route === route &&
            r.telemetryId === telemetryId &&
            r.applicationId === applicationId
        )

        if (previousRoute) {
          const prevScores = previousRoute.scores
          isFirstRecommendation = false
          prevScoresHistory = prevScores.scoresHistory
          prevFrequencyStats = prevScores.frequencyStats
          prevStabilityStats = prevScores.stabilityStats
        }
      }

      const {
        score,
        scores,
        ttl,
        recommended,
        frequencyStats,
        stabilityStats,
        scoresHistory
      } = calculateScore({
        distinctUrls,
        distinctBodies,
        requestsCount,
        maxRequestsCount,
        avgInterRequestTime,
        interRequestTimes,
        frequencyStats: prevFrequencyStats,
        stabilityStats: prevStabilityStats,
        scoresHistory: prevScoresHistory,
        isFirstRecommendation,
        parentRouteScore,
        parentRouteRequestCount
      }, {
        HISTORY_LENGTH,
        SCORE_THRESHOLD,
        DECAY_FACTOR,
        EXPECTED_IDS,
        HISTORY_WEIGHT,
        PAST_SCORE_WEIGHT,
        SCALE_FACTOR,
        SCALE_SIGMA,
        BASE_TTL,
        MIN_TTL,
        MAX_TTL
      })

      scoresHistory.at(-1).timestamp = timestamp

      const cacheTag = app.generateCacheTag(telemetryId, route)

      routes[i] = {
        recommendationId,
        applicationId,
        telemetryId,
        serviceName,
        route,
        domain,
        recommended,
        selected: recommended,
        applied: false,
        score,
        ttl,
        cacheTag,
        hits,
        misses,
        memory: distinctUrls * maxBodySize,
        varyHeaders: '[]',
        scores: JSON.stringify({
          ...scores,
          frequencyStats,
          stabilityStats,
          scoresHistory
        })
      }

      return scores
    }

    for (let i = 0; i < routesMetrics.length; i++) {
      calculateRouteScore(routesMetrics[i], i)
    }

    const recommendedRoutes = routes.filter(route => route.recommended)
    if (recommendedRoutes.length === 0) return null

    const routesNumber = recommendedRoutes.length
    const recommendation = await app.platformatic.entities.recommendation.save({
      input: { id: recommendationId, version, count: routesNumber }
    })

    await app.platformatic.entities.recommendationsRoute.insert({ inputs: routes })

    app.setCurrentVersion(version + 1)

    if (
      previousRecommendation !== null &&
      previousRecommendation.status === 'new'
    ) {
      await app.updateRecommendationStatus(previousRecommendation, 'expired')
    }

    return recommendation
  })

  app.decorate('applyRecommendation', async (recommendation, applicationId, opts, ctx) => {
    const { saveInterceptorConfig } = opts

    await app.platformatic.entities.recommendationsRoute.updateMany({
      where: {
        recommendationId: { eq: recommendation.id },
        applicationId: { eq: applicationId },
        selected: { eq: true }
      },
      input: { applied: true }
    })

    if (saveInterceptorConfig === true) {
      await app.saveInterceptorConfig(recommendation, applicationId, ctx)
      await ctx.req.controlPlane.emitApplicationConfig({ id: applicationId })
    }
  })

  app.decorate('getRecommendationById', async (id) => {
    const recommendations = await app.platformatic.entities.recommendation.find({
      where: { id: { eq: id } },
      skipAuth: true
    })
    return recommendations.length > 0 ? recommendations[0] : null
  })

  app.decorate('getRecommendationRouteById', async (id) => {
    const routes = await app.platformatic.entities.recommendationsRoute.find({
      where: { id: { eq: id } },
      skipAuth: true
    })
    return routes.length > 0 ? routes[0] : null
  })

  app.decorate('getRecommendationByVersion', async (version) => {
    const recommendations = await app.platformatic.entities.recommendation.find({
      where: { version: { eq: version } }
    })
    return recommendations.length > 0 ? recommendations[0] : null
  })

  app.decorate('getLatestRecommendation', async () => {
    const recommendations = await app.platformatic.entities.recommendation.find({
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: 1
    })
    return recommendations.length > 0 ? recommendations[0] : null
  })

  app.decorate('updateRecommendationRoute', async (
    recommendation,
    route,
    routeConfig,
    ctx
  ) => {
    if (routeConfig.varyHeaders) {
      routeConfig.varyHeaders = JSON.stringify(routeConfig.varyHeaders)
    }

    const { db, sql, entities } = app.platformatic

    if (
      routeConfig.selected !== undefined &&
        routeConfig.selected !== route.selected
    ) {
      const sign = routeConfig.selected ? sql`+` : sql`-`
      await db.query(
        sql`
          UPDATE recommendations SET count = count ${sign} 1
          WHERE id = ${recommendation.id};
        `
      )
    }

    await entities.recommendationsRoute.save({
      input: { id: route.id, ...routeConfig }
    })
  })

  app.decorate('getRecommendationAppIds', async (recommendationId) => {
    const { db, sql } = app.platformatic
    const query = sql`
      SELECT DISTINCT(application_id) as "applicationId"
      FROM recommendations_routes
      WHERE
        recommendation_id = ${recommendationId} AND
        recommended = true AND
        selected = true
    `
    const results = await db.query(query)
    return results.map(r => r.applicationId)
  })

  async function getRoutesMetrics (version, ctx) {
    const routes = await app.getRouteRequests(version, ctx)
    const routesMetrics = []

    for (const applicationId in routes) {
      for (const route in routes[applicationId]) {
        let telemetryId = null
        let serviceName = null
        let domain = null
        let requestsCount = 0
        let distinctBodies = 0
        let distinctUrls = 0
        let maxBodySize = 0
        let maxRequestsCount = 0
        let interRequestTimesSum = 0
        const interRequestTimes = []

        for (const url in routes[applicationId][route]) {
          const urlMetrics = routes[applicationId][route][url]

          const sortedRequests = urlMetrics.requests.sort(
            (r1, r2) => r1.timestamp - r2.timestamp
          )

          const bodyHashes = new Set()

          for (let i = 0; i < urlMetrics.requests.length; i++) {
            const request = sortedRequests[i]
            bodyHashes.add(request.bodyHash)
            maxBodySize = Math.max(maxBodySize, request.bodySize)

            const nextRequest = sortedRequests[i + 1]
            if (nextRequest) {
              const interRequestTime = nextRequest.timestamp - request.timestamp
              interRequestTimesSum += interRequestTime
              interRequestTimes.push(interRequestTime)
            }
          }

          const urlRequestsCount = sortedRequests.length
          const urlDistinctBodies = bodyHashes.size

          telemetryId = urlMetrics.telemetryId
          serviceName = urlMetrics.serviceName
          domain = urlMetrics.domain
          requestsCount += urlRequestsCount
          distinctBodies += urlDistinctBodies
          distinctUrls++
          maxRequestsCount = Math.max(maxRequestsCount, urlRequestsCount)
        }

        // We need at least two requests to calculate avgInterRequestTime
        if (requestsCount <= 1) continue

        const hits = requestsCount - distinctBodies
        const misses = distinctBodies
        const avgInterRequestTime = interRequestTimesSum / (requestsCount - 1)

        // TODO: skip if maxRequestsCount < minFrequency
        routesMetrics.push({
          route,
          applicationId,
          telemetryId,
          serviceName,
          domain,
          requestsCount,
          distinctBodies,
          distinctUrls,
          maxBodySize,
          maxRequestsCount,
          hits,
          misses,
          interRequestTimes,
          avgInterRequestTime
        })
      }
    }

    return routesMetrics
  }

  app.decorate('generateCacheTag', (telemetryId, route) => {
    if (route.startsWith('/')) {
      route = route.substring(1)
    }
    if (route.endsWith('/')) {
      route = route.substring(0, route.length - 1)
    }

    let isLastParam = false

    let cacheTag = `'${telemetryId}-` + route
      .replaceAll('*', ':wildcard')
      .replaceAll(/:([a-zA-Z0-9_-]+)/g, (match, param, offset, str) => {
        isLastParam = offset + match.length === str.length
        const replacement = `' + .params["${param}"]`
        return isLastParam ? replacement : replacement + " + '"
      })
      .replaceAll('/', '-')

    if (!isLastParam) {
      cacheTag += "'"
    }

    return cacheTag
  })

  app.decorate('updateRecommendationStatus', async (recommendation, status) => {
    if (status !== recommendation.status) {
      switch (status) {
        case 'calculating':
          // Can not update status to "calculating", it can only begin there
          throw new InvalidStatus(status)
        case 'new':
          // Can only transition to "new" from "calculating"
          if (recommendation.status !== 'calculating') {
            throw new InvalidStatusFlow(status, recommendation.status)
          }
          break
        case 'expired':
          // Can only transition to "expired" from "new"
          if (recommendation.status !== 'new') {
            throw new InvalidStatus(status)
          }
          break
        case 'skipped':
          // Can only transition to "skipped" from "new"
          if (recommendation.status !== 'new') {
            throw new InvalidStatusFlow(status, recommendation.status)
          }
          break
        case 'in_progress':
          // Can only transition to "in_progress" from "new" or "skipped"
          if (recommendation.status !== 'skipped' && recommendation.status !== 'new') {
            throw new InvalidStatusFlow(status, recommendation.status)
          }
          break
        case 'done':
        case 'aborted':
          // Can only transition to "done" or "aborted" from "in_progress"
          if (recommendation.status !== 'in_progress') {
            throw new InvalidStatusFlow(status, recommendation.status)
          }
          break
        default:
          throw new InvalidStatus(status)
      }
    }

    try {
      const result = await app.platformatic.entities.recommendation.save({
        input: { id: recommendation.id, status }
      })
      return result
    } catch (err) {
      if (err.message.startsWith('invalid input value for enum recommendation_status')) {
        throw new InvalidStatus(status)
      }
      throw err
    }
  })
}, {
  name: 'recommendations'
})
