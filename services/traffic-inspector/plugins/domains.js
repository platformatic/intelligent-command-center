/// <reference path="../global.d.ts" />

'use strict'

const fp = require('fastify-plugin')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  const { PLT_TRAFFIC_INSPECTOR_DOMAIN_CACHE_TTL_SEC: domainsTTL } = app.env

  app.decorate('getDomains', async (ctx) => {
    const domainsKey = 'traffic-inspector:domains'

    const cachedDomains = await app.redis.get(domainsKey)
    if (cachedDomains) {
      try {
        return JSON.parse(cachedDomains)
      } catch (err) {
        app.log.error('Failed to parse cached domains', err)
      }
    }

    const applications = await ctx.req.controlPlane.getApplications()
    const applicationStates = await Promise.all(
      applications.map((application) => getApplicationState(application.id, ctx))
    )

    const domains = {}

    for (const application of applications) {
      const state = applicationStates.find(
        (state) => state.applicationId === application.id
      )
      if (state === null) continue

      domains[application.id] = {}

      for (const service of state.state?.services ?? []) {
        const internalServiceDomain = `${service.id}.plt.local`
        domains[application.id][internalServiceDomain] = {
          applicationName: application.name,
          serviceName: service.id,
          telemetryId: `${application.name}-${service.id}`
        }
      }
    }

    await app.redis.set(domainsKey, JSON.stringify(domains))
    await app.redis.expire(domainsKey, domainsTTL)

    return domains
  })

  async function getApplicationState (applicationId, ctx) {
    const applicationStates = await ctx.req.controlPlane.getApplicationStates({
      'where.applicationId.eq': applicationId,
      'orderby.createdAt': 'desc',
      limit: 1
    })
    return applicationStates[0] ?? null
  }

  app.decorate('getServiceMetadataByDomain', (domain, applicationId, domains) => {
    return domains[applicationId]?.[domain] ?? null
  })
}, {
  name: 'domains',
  dependencies: ['env']
})
