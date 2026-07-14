'use strict'

const fp = require('fastify-plugin')
const { resolveActuation } = require('../lib/actuation')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  const enabled = app.env.PLT_FEATURE_SKEW_PROTECTION
  if (!enabled) return

  app.onBecomeLeader(async () => {
    await reconcileHTTPRoutes(app)
  })

  async function reconcileHTTPRoutes (app) {
    const { entities } = app.platformatic

    const versions = await entities.versionRegistry.find({
      where: {
        status: { in: ['active', 'draining', 'staged'] }
      }
    })

    if (versions.length === 0) {
      app.log.info('httproute reconciler: no active, draining, or staged versions found')
      return
    }

    // Group by appLabel
    const appMap = new Map()
    for (const v of versions) {
      if (!appMap.has(v.appLabel)) {
        appMap.set(v.appLabel, [])
      }
      appMap.get(v.appLabel).push(v)
    }

    let reconciled = 0
    let skipped = 0

    for (const [appLabel, appVersions] of appMap) {
      try {
        let productionVersion = null
        let activeVersion = null
        const drainingVersions = []
        const stagedVersions = []

        for (const v of appVersions) {
          const versionRef = {
            versionId: v.versionLabel,
            serviceName: v.serviceName,
            port: v.servicePort
          }
          if (v.status === 'active') {
            productionVersion = versionRef
            activeVersion = v
          } else if (v.status === 'staged') {
            stagedVersions.push(versionRef)
          } else {
            drainingVersions.push(versionRef)
          }
        }

        if (!productionVersion) {
          app.log.warn({ appLabel }, 'httproute reconciler: no active version, skipping')
          skipped++
          continue
        }

        // Routing metadata (namespace, pathPrefix, hostname) must come from the
        // ACTIVE version, not an arbitrary appVersions[0]: versions can disagree
        // (e.g. an old path-based version still draining alongside a new
        // hostname-based one), and only the active version reflects how the app
        // is currently served.
        const ref = activeVersion

        // Advise mode: ICC actuates no routing, so it must not rebuild the route
        // on failover. The external actor owns cluster routing state.
        if (app.resolveSkewPolicy) {
          const { mode } = await app.resolveSkewPolicy(ref.applicationId)
          if (resolveActuation(mode).routing !== 'apply') {
            app.log.info({ appLabel }, 'httproute reconciler: advise mode, skipping route rebuild')
            skipped++
            continue
          }
        }

        await app.applyHTTPRoute({
          appName: appLabel,
          namespace: ref.namespace,
          pathPrefix: ref.pathPrefix,
          hostname: ref.hostname || null,
          productionVersion,
          drainingVersions,
          stagedVersions,
          applicationId: ref.applicationId
        }, { logger: app.log })

        reconciled++
      } catch (err) {
        app.log.error({ err, appLabel }, 'httproute reconciler: failed to reconcile app')
      }
    }

    app.log.info({
      reconciled,
      skipped,
      total: appMap.size
    }, 'httproute reconciler: reconciliation complete')
  }
}, {
  name: 'httproute-reconciler',
  dependencies: ['env', 'leader', 'version-registry', 'gateway']
})
