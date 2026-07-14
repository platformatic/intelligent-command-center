/// <reference path="../global.d.ts" />

'use strict'

const errors = require('../plugins/errors')
const { resourceName, APP_PORT } = require('../lib/deployment-builder')
const { deriveVersion } = require('../lib/version')

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  const planArraySchema = {
    type: 'array',
    items: { type: 'object', additionalProperties: true }
  }

  const deployBodySchema = {
    type: 'object',
    properties: {
      image: { type: 'string', minLength: 1 },
      version: { type: 'string', minLength: 1 },
      namespace: { type: 'string' },
      hostname: { type: ['string', 'null'] },
      pathPrefix: { type: ['string', 'null'] },
      expirePolicy: { type: 'string' },
      port: { type: ['integer', 'null'], minimum: 1, maximum: 65535 },
      minReplicas: { type: ['integer', 'null'], minimum: 1 },
      maxReplicas: { type: ['integer', 'null'], minimum: 1 },
      env: { type: 'object', additionalProperties: { type: 'string' } },
      // Registry credentials for a private image. ICC builds a dockerconfigjson
      // Secret from these and references it via the pod's imagePullSecrets; the
      // caller (CI) needs no cluster access. Sent per deploy, never persisted.
      pullSecret: {
        type: ['object', 'null'],
        properties: {
          registry: { type: 'string', minLength: 1 },
          username: { type: 'string', minLength: 1 },
          password: { type: 'string', minLength: 1 }
        },
        required: ['registry', 'username', 'password'],
        additionalProperties: false
      }
    },
    required: ['image'],
    additionalProperties: false
  }

  // Resolve the deploy options (namespace + templating inputs) from the request.
  async function resolveOpts (application, body, ctx) {
    // Namespace: explicit override, else the app's latest deployment, else default.
    let namespace = body.namespace
    if (!namespace) {
      const latest = await app.getLatestDeployment(application.id, ctx).catch(() => null)
      namespace = latest?.namespace || 'platformatic'
    }
    const appLabel = application.name
    // Cluster-derived public hostname: `{app-name}.${PLT_APPS_DOMAIN}` (e.g.
    // leads-demo.apps.platformatic.run). This lets CI keep calling /deploy with
    // no hostname/pathPrefix; an explicit body value still wins. Without a
    // configured apps domain there is no hostname (path-based routing).
    const appsDomain = app.env?.PLT_APPS_DOMAIN ?? null
    const hostname = body.hostname ?? (appsDomain ? `${appLabel}.${appsDomain}` : null)
    return {
      appName: appLabel,
      image: body.image,
      version: body.version || deriveVersion(body.image),
      namespace,
      hostname,
      // A hostname owns the whole host, so the app serves at the root. The
      // reactive registration path derives the same '/' from the hostname label.
      pathPrefix: body.pathPrefix ?? '/',
      expirePolicy: body.expirePolicy ?? null,
      // The app's HTTP port. ICC has no running pod to learn it from in advise
      // mode, so it comes from the request; default to the Watt convention (3042).
      port: body.port ?? APP_PORT,
      isWorkflow: body.expirePolicy === 'workflow',
      minReplicas: body.minReplicas ?? null,
      maxReplicas: body.maxReplicas ?? null,
      envVars: body.env ?? {},
      pullSecret: body.pullSecret ?? null
    }
  }

  // Build the deploy plan for a not-yet-registered version: the workload
  // (Deployment + Service) AND the routing (HTTPRoute that makes it the gateway
  // default). Read-only -- it templates manifests and mutates nothing. The
  // version is not registered yet (it registers reactively when the pod boots),
  // so the route is planned against a prospective production version. Without the
  // route step the version never becomes the default and pending-apply-checker
  // never confirms it.
  async function buildDeployPlan (opts, applicationId, ctx) {
    const appLabel = opts.appName
    const plan = app.planWorkload(opts)
    if (app.planHTTPRoute && app.getDesiredRouting) {
      const prospective = {
        versionId: opts.version,
        serviceName: resourceName(appLabel, opts.version, opts.image),
        port: opts.port
      }
      const desired = await app.getDesiredRouting(appLabel, opts.version, prospective)
      if (desired.productionVersion) {
        const routeStep = await app.planHTTPRoute({
          appName: appLabel,
          namespace: opts.namespace,
          pathPrefix: opts.pathPrefix,
          hostname: opts.hostname,
          productionVersion: desired.productionVersion,
          drainingVersions: desired.drainingVersions,
          stagedVersions: desired.stagedVersions,
          applicationId
        }, ctx)
        if (routeStep) plan.push(routeStep)
      }
    }
    return plan
  }

  // Resolve the target application from the URL id (app-scoped route) or, when
  // there is none, from the deploy-token principal (token-scoped route). The
  // token is app-bound, so the CI never has to carry the application UUID.
  async function resolveApplication (req) {
    const applicationId = req.params.id ?? req.user?.applicationId
    if (!applicationId) {
      throw new errors.DeployTokenScopeRequired()
    }
    const application = await app.getApplicationById(applicationId)
    if (application === null) {
      throw new errors.ApplicationNotFound(applicationId)
    }
    return { applicationId, application }
  }

  // Core of the read-only deploy plan: templates the manifests for a new version
  // and mutates nothing, whatever the mode.
  async function planDeploy (req) {
    const { applicationId, application } = await resolveApplication(req)
    const logger = req.log.child({ applicationId })
    const ctx = { req, logger }

    const { mode } = await app.resolveActuationMode(applicationId)
    const opts = await resolveOpts(application, req.body, ctx)
    const plan = await buildDeployPlan(opts, applicationId, ctx)
    return { intent: 'deploy', mode, plan }
  }

  // The deploy API is the deploy mechanism: it creates the workload (Deployment +
  // Service, plus the image-pull Secret when credentials were sent). The booting
  // pod then self-registers via /pods/:podId/instance and ICC learns the running
  // state by observing it; the reactive path drives routing, so we do not apply
  // the HTTPRoute here. Read-only manifests are available via /deploy/plan.
  async function deploy (req) {
    const { applicationId, application } = await resolveApplication(req)
    const logger = req.log.child({ applicationId })
    const ctx = { req, logger }

    const opts = await resolveOpts(application, req.body, ctx)
    const result = await app.applyWorkload(opts, ctx)
    return {
      deployed: true,
      controllerName: result.controllerName,
      serviceName: result.serviceName
    }
  }

  const planResponse = {
    200: {
      type: 'object',
      properties: {
        intent: { type: 'string' },
        mode: { type: 'string' },
        plan: planArraySchema
      },
      required: ['intent', 'plan'],
      additionalProperties: false
    }
  }

  const deployResponse = {
    200: {
      type: 'object',
      properties: {
        deployed: { type: 'boolean' },
        controllerName: { type: ['string', 'null'] },
        serviceName: { type: ['string', 'null'] }
      },
      required: ['deployed'],
      additionalProperties: false
    }
  }

  const idParams = {
    type: 'object',
    properties: { id: { type: 'string' } },
    required: ['id']
  }

  // Read-only: the deploy plan for a new version, without mutating anything,
  // whatever the mode. The parallel of GET .../versions/:v/actuation-plan for a
  // version that does not exist yet (so it takes image/version in the body).
  // Tooling (desk get-plan) fetches this to show what to apply.
  app.post('/applications/:id/deploy/plan', {
    logLevel: 'info',
    schema: { operationId: 'planApplicationDeploy', params: idParams, body: deployBodySchema, response: planResponse },
    handler: planDeploy
  })

  // Token-scoped mirror: no application id in the path; the app comes from the
  // deploy token. This is the CI path -- the pipeline holds only the token.
  app.post('/deploy/plan', {
    logLevel: 'info',
    schema: { operationId: 'planDeploy', body: deployBodySchema, response: planResponse },
    handler: planDeploy
  })

  // CI (deploy token) or an admin asks ICC to create a versioned workload.
  // manage mode -> ICC creates the Deployment + Service via machinist and the
  // booting pod reconciles through the reactive registration path. advise mode
  // -> ICC returns the manifests as a plan. observe mode -> rejected (you own
  // workload creation).
  app.post('/applications/:id/deploy', {
    logLevel: 'info',
    schema: { operationId: 'deployApplicationVersion', params: idParams, body: deployBodySchema, response: deployResponse },
    handler: deploy
  })

  // Token-scoped mirror: the app comes from the deploy token, not the URL.
  app.post('/deploy', {
    logLevel: 'info',
    schema: { operationId: 'deploy', body: deployBodySchema, response: deployResponse },
    handler: deploy
  })
}
