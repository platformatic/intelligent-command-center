'use strict'

const fp = require('fastify-plugin')

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
        status: { in: ['active', 'draining'] }
      }
    })

    if (versions.length === 0) {
      app.log.info('httproute reconciler: no active or draining versions found')
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
        const drainingVersions = []

        for (const v of appVersions) {
          if (v.status === 'active') {
            productionVersion = {
              versionId: v.versionLabel,
              serviceName: v.serviceName,
              port: v.servicePort
            }
          } else {
            drainingVersions.push({
              versionId: v.versionLabel,
              serviceName: v.serviceName,
              port: v.servicePort
            })
          }
        }

        if (!productionVersion) {
          app.log.warn({ appLabel }, 'httproute reconciler: no active version, skipping')
          skipped++
          continue
        }

        const ref = appVersions[0]
        await app.applyHTTPRoute({
          appName: appLabel,
          namespace: ref.namespace,
          pathPrefix: ref.pathPrefix,
          hostname: ref.hostname || null,
          productionVersion,
          drainingVersions,
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
