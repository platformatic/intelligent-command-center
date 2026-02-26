'use strict'

const fp = require('fastify-plugin')
const { request } = require('undici')

async function setScalingDisabled (scalerUrl, namespace, k8sDeploymentName, disabled) {
  const url = `${scalerUrl}/controllers/${encodeURIComponent(namespace)}/${encodeURIComponent(k8sDeploymentName)}/scaling-disabled`
  const { statusCode, body } = await request(url, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ disabled })
  })
  if (statusCode !== 200) {
    const error = await body.text()
    throw new Error(`Failed to set scaling disabled: ${error}`)
  }
  return body.json()
}

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  const enabled = app.env.PLT_FEATURE_SKEW_PROTECTION
  if (!enabled) return

  const scalerUrl = app.env.PLT_SCALER_URL

  app.decorate('disableScaling', async (namespace, k8sDeploymentName) => {
    return setScalingDisabled(scalerUrl, namespace, k8sDeploymentName, true)
  })

  /**
   * Orchestrates the full cleanup flow for expiring a draining version:
   * 1. Mark the version as expired in the DB
   * 2. Rebuild the HTTPRoute without the expired version
   * 3. Disable autoscaler for the expired Deployment
   * 4. Scale the expired version's K8s Deployment to 0 replicas
   * 5. (Optional) Delete the K8s Deployment and Service if auto-cleanup is enabled
   *
   * @param {object} version - version_registry row
   * @param {object} ctx - Fastify request context with logger
   * @returns {{ expired: boolean, activeVersion: object|null, drainingVersions: Array }}
   */
  app.decorate('expireAndCleanup', async (version, ctx) => {
    const result = await app.expireVersion(version.appLabel, version.versionLabel, ctx)
    if (!result.expired) return result

    // Rebuild HTTPRoute without the expired version
    if (app.applyHTTPRoute && result.activeVersion) {
      await app.applyHTTPRoute({
        appName: version.appLabel,
        namespace: version.namespace,
        pathPrefix: version.pathPrefix,
        hostname: version.hostname || null,
        productionVersion: result.activeVersion,
        drainingVersions: result.drainingVersions,
        applicationId: version.applicationId
      }, ctx).catch(err => {
        ctx.logger.error({ err }, 'failed to update HTTPRoute after expiring version')
      })
    }

    // Disable autoscaler so it won't fight the scale-down
    await app.disableScaling(version.namespace, version.k8SDeploymentName)
      .catch(err => {
        ctx.logger.error({ err }, 'failed to disable scaling for expired version')
      })

    // Scale the expired Deployment to 0 replicas
    await app.machinist.updateController(
      version.k8SDeploymentName,
      version.namespace,
      'apps/v1',
      'Deployment',
      0,
      ctx
    ).catch(err => {
      ctx.logger.error({ err }, 'failed to scale expired deployment to 0')
    })

    // Optional: delete the K8s Deployment and Service resources
    const policy = await app.resolveSkewPolicy(version.applicationId)
    if (policy.autoCleanup) {
      await app.machinist.deleteDeployment(version.namespace, version.k8SDeploymentName, ctx)
        .catch(err => {
          ctx.logger.error({ err }, 'failed to delete expired Deployment')
        })

      await app.machinist.deleteService(version.namespace, version.serviceName, ctx)
        .catch(err => {
          ctx.logger.error({ err }, 'failed to delete expired Service')
        })
    }

    return result
  })
}, {
  name: 'version-cleanup',
  dependencies: ['env', 'version-registry', 'gateway', 'machinist', 'skew-policy']
})
