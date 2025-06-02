/// <reference path="../global.d.ts" />

'use strict'

const { randomUUID } = require('node:crypto')
const fp = require('fastify-plugin')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  app.decorate('getInterceptorConfig', async (
    recommendation,
    applicationId,
    ctx
  ) => {
    const interceptorConfigs = await app.platformatic.entities.interceptorConfig.find({
      where: {
        recommendationId: { eq: recommendation.id },
        applicationId: { eq: applicationId }
      },
      limit: 1,
      skipAuth: true
    })
    if (interceptorConfigs.length > 0) {
      return interceptorConfigs[0]
    }

    const interceptorConfig = await app.generateInterceptorConfig(
      recommendation,
      applicationId,
      ctx
    )
    return interceptorConfig
  })

  app.decorate('saveInterceptorConfig', async (
    recommendation,
    applicationId,
    ctx
  ) => {
    const { entities } = app.platformatic

    const interceptorConfigs = await entities.interceptorConfig.find({
      where: {
        recommendationId: { eq: recommendation.id },
        applicationId: { eq: applicationId }
      },
      limit: 1,
      skipAuth: true
    })

    let interceptorConfigId = randomUUID()
    if (interceptorConfigs.length > 0) {
      interceptorConfigId = interceptorConfigs[0].id
    }

    const interceptorConfig = await app.generateInterceptorConfig(
      recommendation,
      applicationId,
      ctx
    )

    await entities.interceptorConfig.save({
      input: {
        id: interceptorConfigId,
        applicationId,
        applied: true,
        recommendationId: recommendation.id,
        config: JSON.stringify(interceptorConfig)
      }
    })

    return interceptorConfig
  })

  app.decorate('getLatestInterceptorConfig', async (applicationId) => {
    const interceptorConfigs = await app.platformatic.entities.interceptorConfig.find({
      where: {
        applicationId: { eq: applicationId }
      },
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: 1,
      skipAuth: true
    })
    return interceptorConfigs.length > 0 ? interceptorConfigs[0] : null
  })

  app.decorate('generateInterceptorConfig', async (recommendation, applicationId) => {
    const { entities } = app.platformatic

    const routes = await entities.recommendationsRoute.find({
      where: {
        recommendationId: { eq: recommendation.id },
        applicationId: { eq: applicationId },
        recommended: { eq: true },
        selected: { eq: true }
      },
      skipAuth: true
    })

    let rules = []

    const prevInterceptorConfig = await app.getLatestInterceptorConfig(
      applicationId
    )
    if (prevInterceptorConfig !== null) {
      rules = prevInterceptorConfig.config.rules
    }

    for (const route of routes) {
      const rule = app.generateInterceptorRule(route)
      const ruleIndex = rules.findIndex(
        r => r.routeToMatch === rule.routeToMatch
      )
      if (ruleIndex !== -1) {
        rules[ruleIndex] = rule
      } else {
        rules.push(rule)
      }
    }

    return { rules }
  })

  app.decorate('generateInterceptorRule', (routeConfig) => {
    const { route, domain, ttl, cacheTag, varyHeaders } = routeConfig

    const config = {
      routeToMatch: `http://${domain}${route}`,
      headers: {
        'cache-control': `public, max-age=${ttl}`
      }
    }

    if (cacheTag) {
      config.cacheTags = { fgh: cacheTag }
    }

    if (varyHeaders && varyHeaders.length > 0) {
      config.headers.vary = varyHeaders.join(',')
    }

    return config
  })
}, {
  name: 'interceptor-configs'
})
