'use strict'

const fp = require('fastify-plugin')

const DEFAULT_COOKIE_NAME = '__plt_dpl'

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  const enabled = app.env.PLT_FEATURE_SKEW_PROTECTION
  if (!enabled) return

  const clusterDefaults = {
    httpGracePeriodMs: app.env.PLT_SKEW_HTTP_GRACE_PERIOD_MS,
    httpMaxAliveMs: app.env.PLT_SKEW_HTTP_MAX_ALIVE_MS,
    workflowGracePeriodMs: app.env.PLT_SKEW_WORKFLOW_GRACE_PERIOD_MS,
    workflowMaxAliveMs: app.env.PLT_SKEW_WORKFLOW_MAX_ALIVE_MS,
    maxAgeS: app.env.PLT_SKEW_COOKIE_MAX_AGE,
    maxVersions: null,
    cookieName: DEFAULT_COOKIE_NAME,
    autoCleanup: app.env.PLT_SKEW_AUTO_CLEANUP
  }

  app.decorate('clusterSkewDefaults', clusterDefaults)

  app.decorate('getSkewPolicyOverrides', async (applicationId) => {
    const { entities } = app.platformatic
    const rows = await entities.skewProtectionPolicy.find({
      where: { applicationId: { eq: applicationId } }
    })
    return rows.length > 0 ? rows[0] : null
  })

  app.decorate('saveSkewPolicy', async (applicationId, overrides) => {
    const { entities } = app.platformatic
    const existing = await entities.skewProtectionPolicy.find({
      where: { applicationId: { eq: applicationId } }
    })

    const input = {
      applicationId,
      httpGracePeriodMs: overrides.httpGracePeriodMs ?? null,
      httpMaxAliveMs: overrides.httpMaxAliveMs ?? null,
      workflowGracePeriodMs: overrides.workflowGracePeriodMs ?? null,
      workflowMaxAliveMs: overrides.workflowMaxAliveMs ?? null,
      maxAgeS: overrides.maxAgeS ?? null,
      maxVersions: overrides.maxVersions ?? null,
      cookieName: overrides.cookieName ?? null,
      autoCleanup: overrides.autoCleanup ?? null,
      updatedAt: new Date().toISOString()
    }

    if (existing.length > 0) {
      input.id = existing[0].id
    }

    return entities.skewProtectionPolicy.save({ input })
  })

  app.decorate('resolveSkewPolicy', async (applicationId) => {
    const overrides = await app.getSkewPolicyOverrides(applicationId)

    return {
      httpGracePeriodMs: overrides?.httpGracePeriodMs ?? clusterDefaults.httpGracePeriodMs,
      httpMaxAliveMs: overrides?.httpMaxAliveMs ?? clusterDefaults.httpMaxAliveMs,
      workflowGracePeriodMs: overrides?.workflowGracePeriodMs ?? clusterDefaults.workflowGracePeriodMs,
      workflowMaxAliveMs: overrides?.workflowMaxAliveMs ?? clusterDefaults.workflowMaxAliveMs,
      maxAgeS: overrides?.maxAgeS ?? clusterDefaults.maxAgeS,
      maxVersions: overrides?.maxVersions ?? clusterDefaults.maxVersions,
      cookieName: overrides?.cookieName ?? clusterDefaults.cookieName,
      autoCleanup: overrides?.autoCleanup ?? clusterDefaults.autoCleanup
    }
  })
}, {
  name: 'skew-policy',
  dependencies: ['env']
})
