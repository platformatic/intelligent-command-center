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
    const { entities } = app.platformatic

    const existing = await entities.versionRegistry.find({
      where: {
        appLabel: { eq: opts.appLabel },
        versionLabel: { eq: opts.versionLabel }
      }
    })

    if (existing.length > 0) {
      ctx.logger.debug({
        appLabel: opts.appLabel,
        versionLabel: opts.versionLabel,
        status: existing[0].status
      }, 'version already registered')

      return {
        isNew: false,
        ...(await getVersionState(opts.appLabel))
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
      }
    })

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
      }
    })

    for (const v of otherActive) {
      await entities.versionRegistry.save({
        input: { id: v.id, status: 'draining' }
      })
      ctx.logger.info({
        appLabel: opts.appLabel,
        versionLabel: v.versionLabel
      }, 'marked version as draining')
    }

    return {
      isNew: true,
      ...(await getVersionState(opts.appLabel))
    }
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

  async function getVersionState (appLabel) {
    const { entities } = app.platformatic

    const versions = await entities.versionRegistry.find({
      where: {
        appLabel: { eq: appLabel },
        status: { in: ['active', 'draining'] }
      }
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
