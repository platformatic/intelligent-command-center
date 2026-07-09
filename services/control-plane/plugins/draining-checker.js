'use strict'

const { setTimeout } = require('node:timers/promises')
const fp = require('fastify-plugin')
const { createVersionRPS } = require('../lib/version-rps')
const { resolveActuation } = require('../lib/actuation')

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

  const getVersionRPS = createVersionRPS({ metricsUrl, trafficWindowMs, log: app.log })

  // Exposed for the version manager's traffic-split view (read-only).
  if (!app.hasDecorator('getVersionRPS')) {
    app.decorate('getVersionRPS', getVersionRPS)
  }

  // Record the "you should expire this" nudge ONCE per version. In advise mode
  // ICC only advises; without this guard the checker would append a recommendation
  // to the audit on every interval and flood the timeline.
  const recommended = new Set()
  async function recommendOnce (version, reason, ctx) {
    if (recommended.has(version.id)) return
    recommended.add(version.id)
    await recommendExpire(version, reason, ctx)
  }

  // Advise mode: instead of scaling pods down, the checker records a
  // recommendation (with the command an operator would run) and leaves the
  // version draining. This is the advisor behavior from the design doc §17.2.
  async function recommendExpire (version, reason, ctx) {
    app.log.info({
      appLabel: version.appLabel,
      versionLabel: version.versionLabel,
      reason
    }, 'advise mode — recommending expire instead of executing')
    if (app.recordVersionAudit) {
      await app.recordVersionAudit({
        applicationId: version.applicationId,
        versionLabel: version.versionLabel,
        event: 'recommendation',
        reason,
        detail: {
          action: 'expire',
          command: `kubectl -n ${version.namespace} scale deployment/${version.controllerName} --replicas=0`
        }
      }, ctx)
    }
  }

  // Advise mode: a version the customer chose to expire sits in `pending-expire`
  // until ICC observes its workload torn down, then flips to `expired`. This is
  // the teardown mirror of pending-apply-checker's confirm-activation poll. ICC
  // actuates nothing; it only reflects the observed teardown.
  async function confirmPendingExpires () {
    const { entities } = app.platformatic
    const pending = await entities.versionRegistry.find({
      where: { status: { eq: 'pending-expire' } }
    })
    if (pending.length === 0) return

    const ctx = { logger: app.log, actor: { type: 'system', name: 'draining-checker' } }
    for (const version of pending) {
      const teardown = await app.confirmTeardown(version, ctx).catch((err) => {
        app.log.error({ err, appLabel: version.appLabel, versionLabel: version.versionLabel },
          'failed to confirm pending-expire teardown')
        return { confirmed: false }
      })
      if (teardown.confirmed) {
        app.log.info({ appLabel: version.appLabel, versionLabel: version.versionLabel },
          'pending-expire: teardown observed — version expired')
      }
    }
  }

  async function checkDrainingVersions () {
    const { entities } = app.platformatic

    await confirmPendingExpires()

    const drainingVersions = await entities.versionRegistry.find({
      where: { status: { eq: 'draining' } }
    })

    if (drainingVersions.length === 0) return

    app.log.info({ count: drainingVersions.length }, 'checking draining versions')

    const now = Date.now()
    // Non-anonymous actor for audit: the draining-checker attributes its
    // expirations to itself, with a per-branch reason (max-alive / traffic-zero).
    const ctx = { logger: app.log, actor: { type: 'system', name: 'draining-checker' } }

    for (const version of drainingVersions) {
      const drainedAt = version.drainedAt
        ? new Date(version.drainedAt).getTime()
        : new Date(version.createdAt).getTime()

      const skewPolicy = await app.resolveSkewPolicy(version.applicationId)
      const adviseMode = resolveActuation(skewPolicy.mode).routing === 'plan'
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

      // Advise mode: ICC never force-expires a draining version. It records a
      // single recommendation once the version is ripe; the customer decides to
      // expire it (-> pending-expire), and the teardown is then confirmed by
      // confirmPendingExpires above. The grace/max-alive/traffic branches below
      // are the manage-mode force path.
      if (adviseMode) {
        if (drainAge >= gracePeriodMs) {
          await recommendOnce(version, drainAge > maxAliveMs ? 'max-alive' : 'traffic-zero', ctx)
        }
        continue
      }

      // 1. Within grace period — keep alive unconditionally
      if (drainAge < gracePeriodMs) {
        app.log.info({
          appLabel: version.appLabel,
          versionLabel: version.versionLabel,
          remainingSec: Math.round((gracePeriodMs - drainAge) / 1000)
        }, 'within grace period — skipping')
        continue
      }

      // 2. Past max alive — force expire regardless (manage mode; advise returned above)
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
          ctx.reason = 'max-alive'
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
          ctx.reason = 'traffic-zero'
          await app.expireAndCleanup(version, ctx)
        } catch (err) {
          app.log.error({ err, appLabel: version.appLabel, versionLabel: version.versionLabel },
            'failed to expire draining version')
        }
      }
    }
  }

  async function scheduleCheck () {
    // The loop can be closed (controller nulled) while an in-flight check awaits;
    // the recursive scheduleCheck() that follows must not destructure a null
    // controller. Bail out if we were stopped in the meantime.
    if (!controller) return
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
