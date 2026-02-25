'use strict'

const { setTimeout } = require('node:timers/promises')
const { request } = require('undici')
const fp = require('fastify-plugin')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  const enabled = app.env.PLT_FEATURE_SKEW_PROTECTION
  if (!enabled) return

  const gracePeriodMs = app.env.PLT_SKEW_GRACE_PERIOD_MS
  const checkIntervalMs = app.env.PLT_SKEW_CHECK_INTERVAL_MS
  const trafficWindowMs = app.env.PLT_SKEW_TRAFFIC_WINDOW_MS
  const metricsUrl = app.env.PLT_METRICS_URL

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

    const now = Date.now()
    const ctx = { logger: app.log }

    for (const version of drainingVersions) {
      const drainedAt = version.drainedAt
        ? new Date(version.drainedAt).getTime()
        : new Date(version.createdAt).getTime()

      const gracePeriodExceeded = (now - drainedAt) > gracePeriodMs

      if (gracePeriodExceeded) {
        app.log.info({
          appLabel: version.appLabel,
          versionLabel: version.versionLabel
        }, 'expiring draining version — grace period exceeded')

        try {
          await app.expireAndCleanup(version, ctx)
        } catch (err) {
          app.log.error({ err, appLabel: version.appLabel, versionLabel: version.versionLabel },
            'failed to expire draining version')
        }
        continue
      }

      // Don't check RPS until the version has been draining longer than the
      // traffic window. The Prometheus query covers `trafficWindowMs` — if the
      // version was drained more recently than that, the metric will include
      // traffic from before the drain and a zero result is misleading.
      const drainAge = now - drainedAt
      if (drainAge < trafficWindowMs) continue

      const rps = await getVersionRPS(version.appLabel, version.versionLabel)
      if (rps === null) continue

      if (rps === 0) {
        app.log.info({
          appLabel: version.appLabel,
          versionLabel: version.versionLabel
        }, 'expiring draining version — no traffic in window')

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

  app.addHook('onReady', async () => {
    if (isServerClosed) return
    controller = new AbortController()
    scheduleCheck()
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
  dependencies: ['env', 'version-registry', 'version-cleanup']
})
