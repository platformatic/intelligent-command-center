'use strict'

const fp = require('fastify-plugin')
const { buildHTTPRoute } = require('../lib/httproute-builder')
const { planStep } = require('../lib/actuation')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  const enabled = app.env.PLT_FEATURE_SKEW_PROTECTION
  if (!enabled) return

  let gateway = null

  /**
   * Discovers the Gateway resource in the given namespace via Machinist.
   * Caches the result per namespace. For now, picks the first Gateway found.
   */
  async function discoverGateway (namespace, ctx) {
    if (gateway && gateway.namespace === namespace) return gateway

    const gateways = await app.machinist.listGateways(namespace, ctx)
    if (gateways.length === 0) {
      ctx.logger.warn({ namespace }, 'no Gateway found in namespace')
      return null
    }

    gateway = {
      name: gateways[0].metadata.name,
      namespace
    }

    ctx.logger.info({
      gatewayName: gateway.name, namespace
    }, 'discovered Gateway')

    return gateway
  }

  /**
   * Builds and applies an HTTPRoute for an application.
   *
   * @param {object} opts
   * @param {string} opts.appName - app.kubernetes.io/name label value
   * @param {string} opts.namespace - K8s namespace
   * @param {string} opts.pathPrefix - path prefix for HTTPRoute rules
   * @param {string} [opts.hostname] - optional hostname for the HTTPRoute
   * @param {object} opts.productionVersion - { versionId, serviceName, port }
   * @param {Array}  opts.drainingVersions - [{ versionId, serviceName, port }]
   * @param {Array}  [opts.stagedVersions] - [{ versionId, serviceName, port }] reachable by __plt_dpl cookie or preview header (no default route)
   * @param {object} ctx - Fastify request context with logger
   */
  // Build the desired HTTPRoute for an app without applying it. Gateway
  // discovery is a read, so it is safe in advise mode. Returns null when no
  // Gateway exists in the namespace.
  async function buildRoute (opts, ctx) {
    const gw = await discoverGateway(opts.namespace, ctx)
    if (!gw) return null

    let cookieMaxAge = app.env.PLT_SKEW_COOKIE_MAX_AGE
    let cookieName
    if (opts.applicationId && app.resolveSkewPolicy) {
      const policy = await app.resolveSkewPolicy(opts.applicationId)
      cookieMaxAge = policy.maxAgeS
      cookieName = policy.cookieName
    }

    return buildHTTPRoute({
      appName: opts.appName,
      namespace: opts.namespace,
      pathPrefix: opts.pathPrefix,
      hostname: opts.hostname || null,
      gateway: gw,
      productionVersion: opts.productionVersion,
      drainingVersions: opts.drainingVersions || [],
      stagedVersions: opts.stagedVersions || [],
      cookieMaxAge,
      cookieName
    })
  }

  app.decorate('applyHTTPRoute', async (opts, ctx) => {
    const httpRoute = await buildRoute(opts, ctx)
    if (!httpRoute) return null

    ctx.logger.info({
      routeName: httpRoute.metadata.name,
      namespace: opts.namespace,
      rulesCount: httpRoute.spec.rules.length
    }, 'applying HTTPRoute')

    const applied = await app.machinist.applyHTTPRoute(
      opts.namespace,
      httpRoute,
      ctx
    )

    return applied
  })

  // Advise-mode routing actuator: compute the HTTPRoute the app would need and
  // return it as a plan step (manifest + command) instead of applying it.
  app.decorate('planHTTPRoute', async (opts, ctx) => {
    const httpRoute = await buildRoute(opts, ctx)
    if (!httpRoute) return null

    return planStep('HTTPRoute', 'apply', {
      manifest: httpRoute,
      command: `kubectl apply -n ${opts.namespace} -f - # HTTPRoute/${httpRoute.metadata.name}`,
      description: opts.productionVersion
        ? `route default traffic to ${opts.productionVersion.versionId}`
        : 'apply gateway route'
    })
  })

  app.decorate('deleteHTTPRoute', async (appName, namespace, ctx) => {
    const routeName = appName

    ctx.logger.info({
      routeName, namespace
    }, 'deleting HTTPRoute')

    await app.machinist.deleteHTTPRoute(namespace, routeName, ctx)
  })
}, {
  name: 'gateway',
  dependencies: ['env', 'machinist', 'skew-policy']
})
