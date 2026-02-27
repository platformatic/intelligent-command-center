'use strict'

const fp = require('fastify-plugin')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  const enabled = app.env.PLT_FEATURE_SKEW_PROTECTION
  if (!enabled) return

  /**
   * Registers a version in the version registry and manages lifecycle transitions.
   *
   * - If the version does not exist, inserts it as `active` and marks all other
   *   active versions for the same app as `draining`.
   * - If the version already exists (any status), does nothing.
   * - Serialized per app label via pg_advisory_xact_lock to prevent a race
   *   condition where two concurrent registrations (e.g. v1 and v2 pods starting
   *   at the same time) both insert as active and then each marks the other as
   *   draining, leaving zero active versions.
   *
   * @param {object} opts
   * @param {string} opts.applicationId
   * @param {string} opts.deploymentId
   * @param {string} opts.appLabel - app.kubernetes.io/name label value
   * @param {string} opts.versionLabel - plt.dev/version label value
   * @param {string} opts.k8SDeploymentName - owning K8s Deployment name
   * @param {string} opts.serviceName - K8s Service name
   * @param {number} opts.servicePort - K8s Service port
   * @param {string} opts.namespace - K8s namespace
   * @param {string} opts.pathPrefix - path prefix for routing
   * @param {string|null} opts.hostname - optional hostname for routing
   * @param {object} ctx - Fastify request context with logger
   * @returns {{ isNew: boolean, activeVersion: object|null, drainingVersions: Array }}
   */
  app.decorate('registerVersion', async (opts, ctx) => {
    const { entities, db, sql } = app.platformatic

    return db.tx(async (tx) => {
      // Acquire a per-app advisory lock so concurrent registrations for the
      // same app are serialized. Different apps use different lock keys and
      // do not block each other. The lock is released when the transaction
      // commits, so there is no deadlock risk (we never hold two locks).
      await tx.query(sql`SELECT pg_advisory_xact_lock(hashtext(${opts.appLabel}))`)

      const existing = await entities.versionRegistry.find({
        where: {
          appLabel: { eq: opts.appLabel },
          versionLabel: { eq: opts.versionLabel }
        },
        tx
      })

      if (existing.length > 0) {
        ctx.logger.debug({
          appLabel: opts.appLabel,
          versionLabel: opts.versionLabel,
          status: existing[0].status
        }, 'version already registered')

        return {
          isNew: false,
          ...(await getVersionState(opts.appLabel, tx))
        }
      }

      await entities.versionRegistry.save({
        input: {
          applicationId: opts.applicationId,
          deploymentId: opts.deploymentId,
          appLabel: opts.appLabel,
          versionLabel: opts.versionLabel,
          k8SDeploymentName: opts.k8SDeploymentName,
          serviceName: opts.serviceName,
          servicePort: opts.servicePort,
          namespace: opts.namespace,
          pathPrefix: opts.pathPrefix,
          hostname: opts.hostname,
          status: 'active'
        },
        tx
      })

      if (app.sendVersionRegistryActivity && ctx.req?.activities) {
        await app.sendVersionRegistryActivity(opts.applicationId, opts.versionLabel, 'active', ctx)
          .catch((err) => ctx.logger.error({ err }, 'Failed to send version registry activity'))
      }

      ctx.logger.info({
        appLabel: opts.appLabel,
        versionLabel: opts.versionLabel
      }, 'registered new version as active')

      // Mark all other active versions for this app as draining
      const otherActive = await entities.versionRegistry.find({
        where: {
          appLabel: { eq: opts.appLabel },
          versionLabel: { neq: opts.versionLabel },
          status: { eq: 'active' }
        },
        tx
      })

      for (const v of otherActive) {
        await entities.versionRegistry.save({
          input: { id: v.id, status: 'draining', drainedAt: new Date().toISOString() },
          tx
        })
        if (app.sendVersionRegistryActivity && ctx.req?.activities) {
          await app.sendVersionRegistryActivity(v.applicationId, v.versionLabel, 'draining', ctx)
            .catch((err) => ctx.logger.error({ err }, 'Failed to send version registry activity'))
        }
        ctx.logger.info({
          appLabel: opts.appLabel,
          versionLabel: v.versionLabel
        }, 'marked version as draining')
      }

      // Enforce maxVersions: auto-expire oldest draining versions if over limit
      if (app.resolveSkewPolicy) {
        const policy = await app.resolveSkewPolicy(opts.applicationId)
        if (policy.maxVersions !== null) {
          const allDraining = await entities.versionRegistry.find({
            where: {
              appLabel: { eq: opts.appLabel },
              status: { eq: 'draining' }
            },
            tx
          })

          if (allDraining.length > policy.maxVersions) {
            // Sort by createdAt ascending — oldest first
            allDraining.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            const excess = allDraining.length - policy.maxVersions
            for (let i = 0; i < excess; i++) {
              await entities.versionRegistry.save({
                input: { id: allDraining[i].id, status: 'expired', expiredAt: new Date().toISOString() },
                tx
              })
              await entities.deployment.save({
                input: { id: allDraining[i].deploymentId, status: 'stopped' },
                tx
              })
              ctx.logger.info({
                appLabel: opts.appLabel,
                versionLabel: allDraining[i].versionLabel
              }, 'auto-expired draining version — maxVersions exceeded')
            }
          }
        }
      }

      return {
        isNew: true,
        ...(await getVersionState(opts.appLabel, tx))
      }
    })
  })

  /**
   * Expires a draining version. Only versions with status `draining` can be expired.
   *
   * @param {string} appLabel - app.kubernetes.io/name label value
   * @param {string} versionLabel - plt.dev/version label value
   * @param {object} ctx - Fastify request context with logger
   * @returns {{ expired: boolean, activeVersion: object|null, drainingVersions: Array }}
   */
  app.decorate('expireVersion', async (appLabel, versionLabel, ctx) => {
    const { entities } = app.platformatic

    const versions = await entities.versionRegistry.find({
      where: {
        appLabel: { eq: appLabel },
        versionLabel: { eq: versionLabel }
      }
    })

    if (versions.length === 0) {
      ctx.logger.warn({ appLabel, versionLabel }, 'version not found')
      return { expired: false, ...(await getVersionState(appLabel)) }
    }

    const version = versions[0]

    if (version.status !== 'draining') {
      ctx.logger.warn({
        appLabel, versionLabel, status: version.status
      }, 'only draining versions can be expired')
      return { expired: false, ...(await getVersionState(appLabel)) }
    }

    await entities.versionRegistry.save({
      input: { id: version.id, status: 'expired', expiredAt: new Date().toISOString() }
    })

    await entities.deployment.save({
      input: { id: version.deploymentId, status: 'stopped' }
    })

    if (app.sendVersionRegistryActivity && ctx.req?.activities) {
      await app.sendVersionRegistryActivity(version.applicationId, versionLabel, 'expired', ctx)
        .catch((err) => ctx.logger.error({ err }, 'Failed to send version registry activity'))
    }

    ctx.logger.info({ appLabel, versionLabel }, 'expired version')

    return { expired: true, ...(await getVersionState(appLabel)) }
  })

  app.decorate('listVersions', async (applicationId, status) => {
    const { entities } = app.platformatic
    const where = { applicationId: { eq: applicationId } }
    if (status) {
      where.status = { eq: status }
    }
    return entities.versionRegistry.find({ where })
  })

  async function getVersionState (appLabel, tx) {
    const { entities } = app.platformatic

    const versions = await entities.versionRegistry.find({
      where: {
        appLabel: { eq: appLabel },
        status: { in: ['active', 'draining'] }
      },
      tx
    })

    let activeVersion = null
    const drainingVersions = []

    for (const v of versions) {
      if (v.status === 'active') {
        activeVersion = {
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

    return { activeVersion, drainingVersions }
  }
}, {
  name: 'version-registry',
  dependencies: ['env']
})
