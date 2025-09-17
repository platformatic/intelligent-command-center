/// <reference path="../global.d.ts" />

'use strict'

const { randomUUID } = require('node:crypto')
const fp = require('fastify-plugin')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  const {
    PLT_TRAFFIC_INSPECTOR_RECOMMENDATION_TIME_WINDOW_SEC: timeWindow,
    PLT_TRAFFIC_INSPECTOR_REQUEST_CACHE_TTL_SEC: requestCacheTTL,
    PLT_TRAFFIC_INSPECTOR_ROUTE_CACHE_TTL_SEC: routeCacheTTL,
    PLT_TRAFFIC_INSPECTOR_ROUTE_EXAMPLE_CACHE_TTL_SEC: routeExampleCacheTTL
  } = app.env

  app.decorate('saveRequestHash', async (
    applicationId,
    timestamp,
    request,
    response
  ) => {
    const { hostname: domain, pathname: urlPath } = new URL(request.url)
    const { bodyHash, bodySize } = response

    const version = await app.getCurrentVersion()

    const requestKey = app.generateRequestHashKey(applicationId, version)
    await app.redis.hset(requestKey, {
      url: urlPath,
      bodyHash,
      bodySize,
      domain,
      timestamp
    })
    await app.redis.expire(requestKey, timeWindow)
  })

  app.decorate('saveRequest', async (
    applicationId,
    request,
    response,
    ctx
  ) => {
    const {
      hostname: domain,
      pathname: urlPath,
      search: querystring
    } = new URL(request.url)
    const domains = await app.getDomains(ctx)

    const serviceMetadata = app.getServiceMetadataByDomain(
      domain,
      applicationId,
      domains
    )

    if (!serviceMetadata) {
      ctx.logger.warn(`Internal service not found for domain ${domain}`)
      return
    }

    const { telemetryId } = serviceMetadata

    const requestKey = app.generateRequestKey(
      applicationId,
      telemetryId,
      urlPath
    )

    const isRequestSaved = await app.redis.exists(requestKey)
    if (isRequestSaved) return

    request.querystring = Object.fromEntries(new URLSearchParams(querystring))

    await app.redis.hset(requestKey, {
      request: JSON.stringify(request),
      response: JSON.stringify(response)
    })
    await app.redis.expire(requestKey, requestCacheTTL)

    await app.saveRouteExample(
      applicationId,
      telemetryId,
      urlPath,
      ctx
    )
  })

  app.decorate('saveRouteExample', async (
    applicationId,
    telemetryId,
    urlPath,
    ctx
  ) => {
    const routeKey = app.generateRouteKey(
      applicationId,
      telemetryId,
      urlPath
    )

    const route = await app.redis.get(routeKey)
    if (!route) return

    const routeExampleKey = app.generateRouteExampleKey(
      applicationId,
      telemetryId,
      route
    )

    const isRouteExampleSaved = await app.redis.exists(routeExampleKey)
    if (isRouteExampleSaved) return

    const requestKey = app.generateRequestKey(
      applicationId,
      telemetryId,
      urlPath
    )

    const isRequestSaved = await app.redis.exists(requestKey)
    if (!isRequestSaved) return

    const request = await app.redis.hgetall(requestKey)
    if (Object.keys(request).length === 0) return

    await app.redis.set(routeExampleKey, 1)
    await app.redis.expire(routeExampleKey, routeExampleCacheTTL)
    await app.redis.del(requestKey)

    let requestExample = null
    try {
      requestExample = JSON.parse(request.request)
    } catch (err) {
      ctx.logger.error(`Failed to parse request example: ${err.message}`)
      return
    }

    requestExample.params = parsePathParams(urlPath, route)

    await app.upsertRouteRequestExample(
      applicationId,
      telemetryId,
      route,
      JSON.stringify(requestExample),
      request.response,
      ctx
    )
  })

  app.decorate('upsertRouteRequestExample', async (
    applicationId,
    telemetryId,
    route,
    request,
    response,
    ctx
  ) => {
    const routeExamples = await app.platformatic.entities.routeExample.find({
      where: {
        applicationId: { eq: applicationId },
        telemetryId: { eq: telemetryId },
        route: { eq: route }
      },
      skipAuth: true
    })

    const exampleId = routeExamples[0]?.id || randomUUID()

    await app.platformatic.entities.routeExample.save({
      input: {
        id: exampleId,
        applicationId,
        telemetryId,
        route,
        request,
        response
      },
      skipAuth: true
    })
  })

  app.decorate('saveRoutes', async (routes, ctx) => {
    const promises = []
    for (const route of routes) {
      const promise = app.saveRoute(
        route.applicationId,
        route.serviceId,
        route.url,
        route.route,
        ctx
      )
      promises.push(promise)
    }
    await Promise.all(promises)
  })

  app.decorate('saveRoute', async (
    applicationId,
    telemetryId,
    urlPath,
    route
  ) => {
    const routeKey = app.generateRouteKey(
      applicationId,
      telemetryId,
      urlPath
    )
    await app.redis.set(routeKey, route)
    await app.redis.expire(routeKey, routeCacheTTL)

    await app.saveRouteExample(
      applicationId,
      telemetryId,
      urlPath
    )
  })

  app.decorate('getRouteRequests', async (version, ctx) => {
    const appsByDomain = await app.getDomains(ctx)
    const routes = {}

    const requestsPattern = generateRequestsHashesPattern(version)
    await scanByPattern(requestsPattern, async (requestsKeys) => {
      for (const requestKey of requestsKeys) {
        const { applicationId } = app.parseRequestKey(requestKey)
        const {
          url,
          domain,
          bodyHash,
          bodySize,
          timestamp
        } = await app.redis.hgetall(requestKey)

        const serviceMetadata = app.getServiceMetadataByDomain(
          domain,
          applicationId,
          appsByDomain
        )
        if (!serviceMetadata) {
          ctx.logger.warn(`Internal service not found by domain ${domain}`)
          continue
        }

        const { telemetryId, serviceName } = serviceMetadata

        const routeKey = app.generateRouteKey(
          applicationId,
          telemetryId,
          url
        )

        const route = await app.redis.get(routeKey)
        if (!route) continue

        if (!routes[applicationId]) {
          routes[applicationId] = {}
        }

        if (!routes[applicationId][route]) {
          routes[applicationId][route] = {}
        }

        if (!routes[applicationId][route][url]) {
          routes[applicationId][route][url] = {
            telemetryId,
            serviceName,
            domain,
            requests: []
          }
        }

        const urlMetrics = routes[applicationId][route][url]
        urlMetrics.requests.push({
          bodyHash,
          bodySize: parseInt(bodySize),
          timestamp: parseInt(timestamp)
        })
      }
    })

    return routes
  })

  app.decorate('getCurrentVersion', async () => {
    const versionKey = 'traffic-inspector:versions'

    let version = await app.redis.get(versionKey)
    if (version !== null) return parseInt(version)

    const recommendations = await app.platformatic.entities.recommendation.find({
      fields: ['version'],
      orderBy: [{ field: 'version', direction: 'desc' }]
    })

    version = recommendations.length > 0 ? recommendations[0].version : 0

    await app.redis.set(versionKey, version)
    return version
  })

  app.decorate('setCurrentVersion', async (version) => {
    const versionKey = 'traffic-inspector:versions'
    await app.redis.set(versionKey, version)
  })

  app.decorate('generateRouteKey', (applicationId, telemetryId, url) => {
    const encodedUrl = encodeURIComponent(url)
    return `traffic-inspector:url-routes:${applicationId}:${telemetryId}:${encodedUrl}`
  })

  app.decorate('generateRouteExampleKey', (applicationId, telemetryId, route) => {
    const encodedRoute = encodeURIComponent(route)
    return `traffic-inspector:examples:${applicationId}:${telemetryId}:${encodedRoute}`
  })

  app.decorate('generateRequestKey', (applicationId, telemetryId, url) => {
    const encodedUrl = encodeURIComponent(url)
    return `traffic-inspector:requests:${applicationId}:${telemetryId}:${encodedUrl}`
  })

  app.decorate('generateRequestHashKey', (applicationId, version) => {
    const reqId = randomUUID()
    return `traffic-inspector:hashes:${applicationId}:${version}:${reqId}`
  })

  app.decorate('parseRequestKey', (requestKey) => {
    const [applicationId, version] = requestKey.split(':').slice(-3)
    return { applicationId, version }
  })

  function generateRequestsHashesPattern (version) {
    return `traffic-inspector:hashes:*:${version}:*`
  }

  function scanByPattern (pattern, callback) {
    const stream = app.redis.scanStream({ match: pattern })
    const promises = []

    return new Promise((resolve, reject) => {
      stream.on('data', (keys) => promises.push(callback(keys)))
      stream.on('end', () => Promise.all(promises).then(() => resolve(), reject))
      stream.on('error', reject)
    })
  }

  function parsePathParams (urlPath, route) {
    const pathParams = {}
    const routeParts = route.split('/')
    const urlParts = urlPath.split('/')

    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        const paramName = routeParts[i].slice(1)
        pathParams[paramName] = urlParts[i]
      }
    }

    return pathParams
  }
}, {
  name: 'requests',
  dependencies: ['env']
})
