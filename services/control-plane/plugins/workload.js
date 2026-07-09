'use strict'

const fp = require('fastify-plugin')
const { buildDeployment, buildService, resourceName } = require('../lib/deployment-builder')
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
  function buildWorkload (opts) {
    return {
      deployment: buildDeployment(opts),
      service: buildService(opts)
    }
  }
  app.decorate('buildWorkload', buildWorkload)

  // manage mode: create/update the Deployment + Service. The booting pod then
  // registers via /pods/:podId/instance and the reactive path enters the
  // version lifecycle, exactly as an externally-created deploy would.
  app.decorate('applyWorkload', async (opts, ctx) => {
    const { deployment, service } = buildWorkload(opts)
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
    const { deployment, service } = buildWorkload(opts)
    const name = resourceName(opts.appName, opts.version, opts.image)
    return [
      planStep('Deployment', 'apply', {
        manifest: deployment,
        command: `kubectl apply -n ${opts.namespace} -f - # Deployment/${name}`,
        description: `create workload ${name} (image ${opts.image})`
      }),
      planStep('Service', 'apply', {
        manifest: service,
        command: `kubectl apply -n ${opts.namespace} -f - # Service/${name}`,
        description: `create service ${name}`
      })
    ]
  })
}, {
  name: 'workload',
  dependencies: ['env', 'machinist']
})
