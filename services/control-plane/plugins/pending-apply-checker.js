'use strict'

const { setTimeout } = require('node:timers/promises')
const fp = require('fastify-plugin')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  const enabled = app.env.PLT_FEATURE_SKEW_PROTECTION
  if (!enabled) return

  const confirmIntervalMs = app.env.PLT_SKEW_CONFIRM_INTERVAL_MS

  let controller = null
  let isServerClosed = false

  // Poll versions stuck in pending-apply and confirm any whose pods are
  // registered and whose live gateway route is accepted. Versions only linger
  // in pending-apply under advise mode (observe/manage confirm synchronously in
  // the funnel), so this loop is advise mode's drift check: the external actor
  // applies the plan on its own schedule, and ICC flips the version active only
  // once it observes both sides are live.
  async function checkPendingApply () {
    const { entities } = app.platformatic

    const pending = await entities.versionRegistry.find({
      where: { status: { eq: 'pending-apply' } }
    })
    if (pending.length === 0) return

    app.log.info({ count: pending.length }, 'checking pending-apply versions')

    const ctx = { logger: app.log, actor: { type: 'system', name: 'pending-apply-checker' } }

    for (const version of pending) {
      try {
        const result = await app.confirmPendingApply(version, ctx)
        if (result.confirmed) {
          app.log.info({
            appLabel: version.appLabel, versionLabel: version.versionLabel
          }, 'confirmed pending-apply version active')
        }
      } catch (err) {
        app.log.error({ err, appLabel: version.appLabel, versionLabel: version.versionLabel },
          'failed to confirm pending-apply version')
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
      await setTimeout(confirmIntervalMs, null, { signal })
      if (!signal.aborted) {
        try {
          await checkPendingApply()
        } catch (err) {
          app.log.error({ err }, 'error during pending-apply check')
        }
        scheduleCheck()
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      app.log.error({ err }, 'error in pending-apply checker schedule, retrying')
      try {
        await setTimeout(1000, null, { signal })
        scheduleCheck()
      } catch (delayErr) {
        if (delayErr.name === 'AbortError') return
        app.log.error({ err: delayErr }, 'error in pending-apply checker retry delay')
      }
    }
  }

  app.onBecomeLeader(async () => {
    if (isServerClosed) return
    controller = new AbortController()
    app.log.info('leader acquired — starting pending-apply checker')
    scheduleCheck()
  })

  app.onLoseLeadership(async () => {
    if (controller) {
      controller.abort()
      controller = null
      app.log.info('leadership lost — stopped pending-apply checker')
    }
  })

  app.addHook('onClose', async () => {
    isServerClosed = true
    if (controller) {
      controller.abort()
      controller = null
      app.log.info('stopped pending-apply checker')
    }
  })
}, {
  name: 'pending-apply-checker',
  dependencies: ['env', 'leader', 'version-registry', 'version-cleanup']
})
