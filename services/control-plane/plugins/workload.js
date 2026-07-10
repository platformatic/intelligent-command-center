'use strict'

const fp = require('fastify-plugin')
const { buildDeployment, buildService, buildPullSecret, resourceName } = require('../lib/deployment-builder')
const { planStep } = require('../lib/actuation')

/**
 * Workload actuator: the ICC-owned counterpart to the gateway (routing)
 * actuator. `applyWorkload` creates the Deployment + Service via machinist
 * (manage mode); `planWorkload` returns them as a plan (advise mode). The
 * lifecycle layer never touches machinist directly.
 *
 * @param {import('fastify').FastifyInstance} app
 */
module.exports = fp(async function (app) {
  // Not skew-gated: the workload actuator serves manage/advise deploys, which
  // are driven by the (skew-independent) actuation mode. Routing stays skew-only.
  // The workload is the Deployment + Service, plus an image-pull Secret when the
  // deploy carries registry credentials (private image).
  function buildWorkload (opts) {
    const workload = {
      deployment: buildDeployment(opts),
      service: buildService(opts)
    }
    const pullSecret = buildPullSecret(opts)
    if (pullSecret) workload.pullSecret = pullSecret
    return workload
  }
  app.decorate('buildWorkload', buildWorkload)

  // manage mode: create/update the Deployment + Service. The booting pod then
  // registers via /pods/:podId/instance and the reactive path enters the
  // version lifecycle, exactly as an externally-created deploy would.
  app.decorate('applyWorkload', async (opts, ctx) => {
    const { deployment, service, pullSecret } = buildWorkload(opts)
    // The pull Secret must exist before the pod pulls its image, so apply it first.
    if (pullSecret) await app.machinist.applySecret(opts.namespace, pullSecret, ctx)
    await app.machinist.applyDeployment(opts.namespace, deployment, ctx)
    await app.machinist.applyService(opts.namespace, service, ctx)
    return {
      applied: true,
      controllerName: deployment.metadata.name,
      serviceName: service.metadata.name
    }
  })

  // advise mode: return the workload as plan steps (manifests + commands) for an
  // external actor to apply; ICC mutates nothing.
  app.decorate('planWorkload', (opts) => {
    const { deployment, service, pullSecret } = buildWorkload(opts)
    const name = resourceName(opts.appName, opts.version, opts.image)
    const steps = []
    if (pullSecret) {
      // Redact the credential bytes: plans are returned to callers and persisted
      // (recordAdviseVersion), and ICC never stores raw registry credentials.
      const redacted = { ...pullSecret, data: { '.dockerconfigjson': '<redacted>' } }
      steps.push(planStep('Secret', 'apply', {
        manifest: redacted,
        command: `kubectl apply -n ${opts.namespace} -f - # Secret/${pullSecret.metadata.name}`,
        description: `create image pull secret ${pullSecret.metadata.name}`
      }))
    }
    steps.push(planStep('Deployment', 'apply', {
      manifest: deployment,
      command: `kubectl apply -n ${opts.namespace} -f - # Deployment/${name}`,
      description: `create workload ${name} (image ${opts.image})`
    }))
    steps.push(planStep('Service', 'apply', {
      manifest: service,
      command: `kubectl apply -n ${opts.namespace} -f - # Service/${name}`,
      description: `create service ${name}`
    }))
    return steps
  })
}, {
  name: 'workload',
  dependencies: ['env', 'machinist']
})
