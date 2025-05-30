'use strict'

const fp = require('fastify-plugin')
const { URL_ROUTE_NAMESPACE } = require('../lib/store-namespaces')

// Some framework instrumentation set a different http.route attribute
// for some internal spans. We want to skip span with this attributes values
const ignoreAttributes = {
  'express.type': ['middleware']
}

async function plugin (fastify) {
  const urlRouteExpire = fastify.env.PLT_RISK_SERVICE_URL_ROUTE_EXPIRE

  fastify.decorate('saveUrlsRoutes', async (trace, SpanKind, ctx) => {
    const urlRoutes = []

    let urlEntry = null

    function traverseTrace (trace, rootSpan = null) {
      rootSpan = rootSpan ?? trace.find(s => s.parentSpanId === null)

      const { applicationId, serviceName, kind, spanId, attributes } = rootSpan

      const fullUrlAttribute = attributes['url.full']
      if (kind === SpanKind.SPAN_KIND_SERVER) {
        if (fullUrlAttribute) {
          urlEntry = {
            applicationId,
            serviceId: serviceName,
            url: new URL(fullUrlAttribute).pathname,
            route: null
          }
        }
      }

      if (
        urlEntry &&
        urlEntry.route === null &&
        urlEntry.applicationId === applicationId &&
        urlEntry.serviceId === serviceName &&
        (kind === SpanKind.SPAN_KIND_SERVER || kind === SpanKind.SPAN_KIND_INTERNAL) &&
        !ignoreSpan(rootSpan)
      ) {
        const route = attributes['http.route']
        if (route) {
          urlEntry.route = route
          urlRoutes.push(urlEntry)

          urlEntry = null
        }
      }

      const childSpans = trace.filter(s => s.parentSpanId === spanId)
      for (const childSpan of childSpans) {
        traverseTrace(trace, childSpan)
      }
    }

    function ignoreSpan (span) {
      if (!span.attributes) return false

      for (const attributeName in span.attributes) {
        const ignoredValues = ignoreAttributes[attributeName]
        if (ignoredValues === undefined) continue

        const attributeValue = span.attributes[attributeName]
        if (ignoredValues.includes(attributeValue)) return true
      }

      return false
    }

    traverseTrace(trace)

    const results = await Promise.all(
      urlRoutes
        .filter(urlEntry => urlEntry.route !== null)
        .map(urlEntry => fastify.saveUrlRoute(urlEntry))
    )

    const changedRoutes = results
      .filter(result => result.changed)
      .map(result => result.urlRoute)

    if (changedRoutes.length > 0 && ctx) {
      // await ctx.req.trafficante.saveUrlsRoutes({ routes: changedRoutes })
    }
  })

  fastify.decorate('saveUrlRoute', async (urlRoute) => {
    const urlRouteKey = fastify.generateUrlRouteKey(urlRoute)
    const previousValue = await fastify.redis.set(
      urlRouteKey,
      urlRoute.route,
      'GET'
    )
    await fastify.redis.expire(urlRouteKey, urlRouteExpire)

    const changed = previousValue !== urlRoute.route
    return { changed, urlRoute }
  })

  fastify.decorate('generateUrlRouteKey', (urlRoute) => {
    const { applicationId, serviceId, url } = urlRoute
    const encodedUrl = encodeURIComponent(url)
    return `${URL_ROUTE_NAMESPACE}${applicationId}:${serviceId}:${encodedUrl}`
  })
}

module.exports = fp(plugin, { name: 'routes' })
