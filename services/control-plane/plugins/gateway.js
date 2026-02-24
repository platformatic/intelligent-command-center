'use strict'

const fp = require('fastify-plugin')
const { buildHTTPRoute } = require('../lib/httproute-builder')

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
   * @param {object} ctx - Fastify request context with logger
   */
  app.decorate('applyHTTPRoute', async (opts, ctx) => {
    const gw = await discoverGateway(opts.namespace, ctx)
    if (!gw) return null

    const httpRoute = buildHTTPRoute({
      appName: opts.appName,
      namespace: opts.namespace,
      pathPrefix: opts.pathPrefix,
      hostname: opts.hostname || null,
      gateway: gw,
      productionVersion: opts.productionVersion,
      drainingVersions: opts.drainingVersions || []
    })

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

  app.decorate('deleteHTTPRoute', async (appName, namespace, ctx) => {
    const routeName = appName

    ctx.logger.info({
      routeName, namespace
    }, 'deleting HTTPRoute')

    await app.machinist.deleteHTTPRoute(namespace, routeName, ctx)
  })
}, {
  name: 'gateway',
  dependencies: ['env', 'machinist']
})
