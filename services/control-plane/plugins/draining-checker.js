'use strict'

const { setTimeout } = require('node:timers/promises')
const { request } = require('undici')
const fp = require('fastify-plugin')

const policies = {
  'http-traffic': require('../lib/expire-policies/http-traffic'),
  workflow: require('../lib/expire-policies/workflow')
}

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  const enabled = app.env.PLT_FEATURE_SKEW_PROTECTION
  if (!enabled) return

  const checkIntervalMs = app.env.PLT_SKEW_CHECK_INTERVAL_MS
  const trafficWindowMs = app.env.PLT_SKEW_TRAFFIC_WINDOW_MS
  const metricsUrl = app.env.PLT_METRICS_URL
  const workflowUrl = app.env.PLT_WORKFLOW_URL

  let controller = null
  let isServerClosed = false

  function msToPromWindow (ms) {
    const seconds = Math.floor(ms / 1000)
    if (seconds >= 3600 && seconds % 3600 === 0) return `${seconds / 3600}h`
    if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60}m`
    return `${seconds}s`
  }

  async function getVersionRPS (appLabel, versionLabel) {
    const window = msToPromWindow(trafficWindowMs)
    const url = `${metricsUrl}/kubernetes/versions/${encodeURIComponent(appLabel)}/${encodeURIComponent(versionLabel)}/rps?window=${window}`
    const { statusCode, body } = await request(url)
    if (statusCode !== 200) {
      const error = await body.text()
      app.log.warn({ appLabel, versionLabel, statusCode, error }, 'failed to query version RPS')
      return null
    }
    const data = await body.json()
    return data.rps
  }

  async function checkDrainingVersions () {
    const { entities } = app.platformatic

    const drainingVersions = await entities.versionRegistry.find({
      where: { status: { eq: 'draining' } }
    })

    if (drainingVersions.length === 0) return

    app.log.info({ count: drainingVersions.length }, 'checking draining versions')

    const now = Date.now()
    const ctx = { logger: app.log }

    for (const version of drainingVersions) {
      const drainedAt = version.drainedAt
        ? new Date(version.drainedAt).getTime()
        : new Date(version.createdAt).getTime()

      const skewPolicy = await app.resolveSkewPolicy(version.applicationId)
      const drainAge = now - drainedAt
      const policyName = version.expirePolicy || 'http-traffic'
      const isWorkflow = policyName === 'workflow'
      const gracePeriodMs = isWorkflow ? skewPolicy.workflowGracePeriodMs : skewPolicy.httpGracePeriodMs
      const maxAliveMs = isWorkflow ? skewPolicy.workflowMaxAliveMs : skewPolicy.httpMaxAliveMs

      app.log.info({
        appLabel: version.appLabel,
        versionLabel: version.versionLabel,
        expirePolicy: policyName,
        drainAgeSec: Math.round(drainAge / 1000),
        gracePeriodSec: Math.round(gracePeriodMs / 1000),
        maxAliveSec: Math.round(maxAliveMs / 1000)
      }, 'evaluating draining version')

      // 1. Within grace period — keep alive unconditionally
      if (drainAge < gracePeriodMs) {
        app.log.info({
          appLabel: version.appLabel,
          versionLabel: version.versionLabel,
          remainingSec: Math.round((gracePeriodMs - drainAge) / 1000)
        }, 'within grace period — skipping')
        continue
      }

      // 2. Past max alive — force expire regardless
      if (drainAge > maxAliveMs) {
        app.log.info({
          appLabel: version.appLabel,
          versionLabel: version.versionLabel
        }, 'expiring draining version — max alive exceeded')

        const policy = policies[policyName]
        if (policy.forceExpire) {
          await policy.forceExpire(version, { log: app.log, workflowUrl })
        }

        try {
          await app.expireAndCleanup(version, ctx)
        } catch (err) {
          app.log.error({ err, appLabel: version.appLabel, versionLabel: version.versionLabel },
            'failed to expire draining version')
        }
        continue
      }

      // 3. Between grace period and max alive — run policy checks
      // Don't check RPS until the version has been draining longer than the
      // traffic window. The Prometheus query covers `trafficWindowMs` — if the
      // version was drained more recently than that, the metric will include
      // traffic from before the drain and a zero result is misleading.
      if (drainAge < trafficWindowMs) {
        app.log.info({
          appLabel: version.appLabel,
          versionLabel: version.versionLabel,
          drainAgeSec: Math.round(drainAge / 1000),
          trafficWindowSec: Math.round(trafficWindowMs / 1000)
        }, 'drain age less than traffic window — skipping policy check')
        continue
      }

      const policy = policies[policyName]
      const expire = await policy.shouldExpire(version, { getVersionRPS, log: app.log, workflowUrl })

      if (expire) {
        app.log.info({
          appLabel: version.appLabel,
          versionLabel: version.versionLabel
        }, 'expiring draining version — policy check passed')

        try {
          await app.expireAndCleanup(version, ctx)
        } catch (err) {
          app.log.error({ err, appLabel: version.appLabel, versionLabel: version.versionLabel },
            'failed to expire draining version')
        }
      }
    }
  }

  async function scheduleCheck () {
    const { signal } = controller

    if (signal.aborted) return

    try {
      await setTimeout(checkIntervalMs, null, { signal })
      if (!signal.aborted) {
        try {
          await checkDrainingVersions()
        } catch (err) {
          app.log.error({ err }, 'error during draining version check')
        }
        scheduleCheck()
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      app.log.error({ err }, 'error in draining checker schedule, retrying')
      try {
        await setTimeout(1000, null, { signal })
        scheduleCheck()
      } catch (delayErr) {
        if (delayErr.name === 'AbortError') return
        app.log.error({ err: delayErr }, 'error in draining checker retry delay')
      }
    }
  }

  app.onBecomeLeader(async () => {
    if (isServerClosed) return
    controller = new AbortController()
    app.log.info('leader acquired — starting draining version checker')
    scheduleCheck()
  })

  app.onLoseLeadership(async () => {
    if (controller) {
      controller.abort()
      controller = null
      app.log.info('leadership lost — stopped draining version checker')
    }
  })

  app.addHook('onClose', async () => {
    isServerClosed = true
    if (controller) {
      controller.abort()
      controller = null
      app.log.info('stopped draining version checker')
    }
  })
}, {
  name: 'draining-checker',
  dependencies: ['env', 'leader', 'version-registry', 'version-cleanup', 'skew-policy']
})
