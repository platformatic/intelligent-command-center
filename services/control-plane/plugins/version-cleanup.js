'use strict'

const fp = require('fastify-plugin')
const { request } = require('undici')
const { forceExpire: forceExpireWorkflow } = require('../lib/expire-policies/workflow')
const { resolveActuation, planStep } = require('../lib/actuation')

async function setScalingDisabled (scalerUrl, namespace, controllerName, disabled) {
  const url = `${scalerUrl}/controllers/${encodeURIComponent(namespace)}/${encodeURIComponent(controllerName)}/scaling-disabled`
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
  const workflowUrl = app.env.PLT_WORKFLOW_URL

  app.decorate('disableScaling', async (namespace, controllerName) => {
    return setScalingDisabled(scalerUrl, namespace, controllerName, true)
  })

  // Audit an actuation/routing change: record which versions are routable
  // after a rebuild (default active + draining preview rules).
  async function recordRouting (version, result, ctx, reason) {
    if (!app.recordVersionAudit) return
    await app.recordVersionAudit({
      applicationId: version.applicationId,
      versionLabel: result.activeVersion?.versionId ?? version.versionLabel ?? null,
      event: 'routing-update',
      reason,
      detail: {
        active: result.activeVersion?.versionId ?? null,
        draining: (result.drainingVersions || []).map(v => v.versionId),
        staged: (result.stagedVersions || []).map(v => v.versionId)
      }
    }, ctx)
  }

  // Resolve the actuator slots (workload/routing) for an app from its mode.
  async function actuationFor (applicationId) {
    const mode = app.resolveSkewPolicy
      ? (await app.resolveSkewPolicy(applicationId)).mode
      : null
    return resolveActuation(mode)
  }

  // Plan (do not execute) the workload teardown for an expired/rejected version.
  function workloadTeardownPlan (version, policy) {
    const steps = [planStep('Deployment', 'scale', {
      command: `kubectl -n ${version.namespace} scale deployment/${version.controllerName} --replicas=0`,
      description: `scale down ${version.versionLabel}`
    })]
    if (policy.autoCleanup) {
      steps.push(planStep('Deployment', 'delete', {
        command: `kubectl -n ${version.namespace} delete deployment/${version.controllerName}`,
        description: `delete controller ${version.controllerName}`
      }))
      steps.push(planStep('Service', 'delete', {
        command: `kubectl -n ${version.namespace} delete service/${version.serviceName}`,
        description: `delete service ${version.serviceName}`
      }))
    }
    return steps
  }

  // Advise-mode routing plan for the desired state after `versionLabel` goes
  // active: returns the HTTPRoute manifest + command without mutating anything.
  async function planActivation (version, versionLabel, ctx) {
    if (!app.planHTTPRoute || !app.getDesiredRouting || !version) return []
    const desired = await app.getDesiredRouting(version.appLabel, versionLabel)
    if (!desired.productionVersion) return []
    const step = await app.planHTTPRoute({
      appName: version.appLabel,
      namespace: version.namespace,
      pathPrefix: version.pathPrefix,
      hostname: version.hostname || null,
      productionVersion: desired.productionVersion,
      drainingVersions: desired.drainingVersions,
      stagedVersions: desired.stagedVersions,
      applicationId: version.applicationId
    }, ctx)
    return step ? [step] : []
  }

  // Read-only actuation plan for a version, chosen by its current state. Returns
  // command + manifest steps an operator/CI applies in advise mode (ICC mutates
  // nothing): the mirror of what the deploy flow returns, but for an existing
  // version.
  //   draining / pending-expire -> expire plan (rebuild route without it + teardown workload)
  //   pending-apply / staged     -> activate plan (route it as the default backend)
  app.decorate('planVersionActuation', async (applicationId, versionLabel, ctx) => {
    const { entities } = app.platformatic
    const rows = await entities.versionRegistry.find({
      where: { applicationId: { eq: applicationId }, versionLabel: { eq: versionLabel } }
    })
    if (rows.length === 0) return null
    const version = rows[0]

    if (version.status === 'draining' || version.status === 'pending-expire') {
      const policy = await app.resolveSkewPolicy(applicationId)
      const steps = []
      const actives = await entities.versionRegistry.find({
        where: { applicationId: { eq: applicationId }, status: { eq: 'active' } }
      })
      const activeLabel = actives[0]?.versionLabel
      if (app.planHTTPRoute && app.getDesiredRouting && activeLabel) {
        const desired = await app.getDesiredRouting(version.appLabel, activeLabel)
        // The route after expiry keeps the current active as default and drops
        // this version's cookie/preview pins.
        const drainingVersions = (desired.drainingVersions || []).filter(v => v.versionId !== versionLabel)
        const routeStep = await app.planHTTPRoute({
          appName: version.appLabel,
          namespace: version.namespace,
          pathPrefix: version.pathPrefix,
          hostname: version.hostname || null,
          productionVersion: desired.productionVersion,
          drainingVersions,
          stagedVersions: desired.stagedVersions,
          applicationId
        }, ctx)
        if (routeStep) steps.push(routeStep)
      }
      steps.push(...workloadTeardownPlan(version, policy))
      return { intent: 'expire', steps }
    }

    if (version.status === 'pending-apply' || version.status === 'staged') {
      const steps = await planActivation(version, versionLabel, ctx)
      return { intent: 'activate', steps }
    }

    return { intent: 'none', steps: [] }
  })

  // Teardown confirm (advise mode): the mirror of confirmPendingApply. A draining
  // version becomes `expired` once ICC observes the customer removed its workload
  // (no pods registered for it). ICC actuates nothing here; it only reflects that
  // the external actor applied the teardown, exactly as it confirms activation.
  app.decorate('confirmTeardown', async (version, ctx) => {
    let podsGone = false
    try {
      const machines = await app.machinist.getMachines(version.namespace, {
        'app.kubernetes.io/name': version.appLabel,
        'plt.dev/version': version.versionLabel
      }, ctx)
      const list = Array.isArray(machines) ? machines : (machines?.machines || [])
      podsGone = list.length === 0
    } catch (err) {
      ctx.logger.error({ err, appLabel: version.appLabel, versionLabel: version.versionLabel },
        'teardown check: failed to read pods')
      return { confirmed: false }
    }
    if (!podsGone) return { confirmed: false }
    ctx.reason = ctx.reason || 'teardown-observed'
    const result = await app.expireVersion(version.appLabel, version.versionLabel, ctx)
    return { confirmed: !!result.expired, ...result }
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
    const { routing } = await actuationFor(version.applicationId)
    const advise = routing === 'plan'

    // Advise mode: ICC actuates nothing. Record intent (-> pending-expire) and
    // hand back a teardown plan. If nothing in the live gateway route references
    // the version there is nothing to observe, so expire immediately; otherwise
    // stay pending-expire until confirmTeardown observes the workload removed.
    if (advise) {
      const advisePolicy = await app.resolveSkewPolicy(version.applicationId)
      const routed = await versionIsRouted(version, ctx)
      const marked = await app.markPendingExpire(version.appLabel, version.versionLabel, ctx)
      if (!marked.pendingExpire) return { expired: false, pendingExpire: false, plan: [] }

      // Stop ICC's own autoscaler from reviving the version while it is torn down.
      // ICC mutates nothing in the customer's cluster in advise, but the scaler is
      // ICC's own controller: left enabled it re-scales the Deployment back to
      // min replicas, so the customer's scale-to-zero (the teardown ICC waits to
      // observe) never sticks and the version is stuck pending-expire. Manage-mode
      // expireAndCleanup disables scaling for the same reason.
      await app.disableScaling(version.namespace, version.controllerName).catch((err) => {
        ctx.logger.error({ err, versionLabel: version.versionLabel }, 'advise expire: failed to disable scaling')
      })

      if (!routed) {
        ctx.reason = ctx.reason || 'no-route'
        const result = await app.expireVersion(version.appLabel, version.versionLabel, ctx)
        return { ...result, pendingExpire: false, plan: workloadTeardownPlan(version, advisePolicy) }
      }

      const actuation = await app.planVersionActuation(version.applicationId, version.versionLabel, ctx)
      return { expired: false, pendingExpire: true, plan: actuation?.steps ?? [] }
    }

    // For workflow-policy apps, notify the app to force-cancel active runs.
    if (version.expirePolicy === 'workflow') {
      await forceExpireWorkflow(version, { log: ctx.logger, workflowUrl })
    }

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
        stagedVersions: result.stagedVersions,
        applicationId: version.applicationId
      }, ctx).catch(err => {
        ctx.logger.error({ err }, 'failed to update HTTPRoute after expiring version')
      })
      await recordRouting(version, result, ctx, 'expire')
    }

    // Disable autoscaler so it won't fight the scale-down
    await app.disableScaling(version.namespace, version.controllerName)
      .catch(err => {
        ctx.logger.error({ err }, 'failed to disable scaling for expired version')
      })

    // Scale the expired Deployment to 0 replicas
    // Skew protection always operates on K8s Deployments — the version_registry
    // wouldn't be populated for any other resource type. The K8s provider in
    // machinist needs this metadata to build the right API path.
    const providerMetadata = { kind: 'Deployment', apiVersion: 'apps/v1' }

    await app.machinist.updateControllerReplicas(
      version.namespace,
      version.controllerName,
      0,
      providerMetadata,
      ctx
    ).catch(err => {
      ctx.logger.error({ err }, 'failed to scale expired deployment to 0')
    })

    // Optional: delete the controller and service resources
    const policy = await app.resolveSkewPolicy(version.applicationId)
    if (policy.autoCleanup) {
      await app.machinist.deleteController(
        version.namespace,
        version.controllerName,
        providerMetadata,
        ctx
      ).catch(err => {
        ctx.logger.error({ err }, 'failed to delete expired controller')
      })

      await app.machinist.deleteService(version.namespace, version.serviceName, ctx)
        .catch(err => {
          ctx.logger.error({ err }, 'failed to delete expired Service')
        })
    }

    return result
  })

  // Is `version` referenced anywhere in the live gateway route (default rule OR a
  // draining/staged preview rule)? Decides whether an advise-mode expire has a
  // route to unwind. A never-routed version (a pending-apply/staged one the
  // customer abandons before applying its route) has nothing to observe, so ICC
  // can expire it immediately. On a read failure, assume routed so ICC waits for
  // an explicit teardown rather than expiring prematurely.
  async function versionIsRouted (version, ctx) {
    try {
      const route = await app.machinist.getHTTPRoute(version.namespace, version.appLabel, ctx)
      if (!route) return false
      for (const rule of (route.spec?.rules || [])) {
        for (const ref of (rule.backendRefs || [])) {
          if (ref.name === version.serviceName) return true
        }
      }
      return false
    } catch (err) {
      ctx.logger.error({ err, appLabel: version.appLabel, versionLabel: version.versionLabel },
        'expire: failed to read live route; assuming routed')
      return true
    }
  }

  // Does the live gateway route serve `version` as the default backend? The
  // default rule is the one without a header match (staged/draining rules match
  // a Cookie or x-deployment-id header).
  function routeServesVersion (route, version) {
    const rules = route?.spec?.rules || []
    const defaultRule = rules.find(r => !(r.matches?.[0]?.headers?.length))
    return defaultRule?.backendRefs?.[0]?.name === version.serviceName
  }

  // Has the gateway controller admitted the route? The desired backend being
  // present in the spec is not enough — the controller (e.g. Envoy) reports an
  // `Accepted: True` condition on the HTTPRoute status once it has programmed
  // it, which closes the propagation window between "resource applied" and
  // "traffic actually flowing".
  function routeAccepted (route) {
    for (const parent of (route?.status?.parents || [])) {
      for (const cond of (parent.conditions || [])) {
        if (cond.type === 'Accepted' && cond.status === 'True') return true
      }
    }
    return false
  }

  /**
   * Confirm signal (advise mode): a pending-apply version becomes active only
   * once ICC observes the external actor applied the plan — the version's pods
   * are registered AND the live HTTPRoute (read via machinist) serves it as the
   * default backend with the gateway's `Accepted` condition set. This is the
   * drift check the design doc §17.2 calls for; the provider reads live here
   * (actuation layer), while the state transition stays in the registry
   * (confirmActivation). Polled by pending-apply-checker every
   * PLT_SKEW_CONFIRM_INTERVAL_MS until both sides are live.
   */
  app.decorate('confirmPendingApply', async (version, ctx) => {
    let podsReady = false
    try {
      const machines = await app.machinist.getMachines(version.namespace, {
        'app.kubernetes.io/name': version.appLabel,
        'plt.dev/version': version.versionLabel
      }, ctx)
      const list = Array.isArray(machines) ? machines : (machines?.machines || [])
      podsReady = list.length > 0
    } catch (err) {
      ctx.logger.error({ err }, 'confirm: failed to read pods')
    }

    let routeReady = false
    try {
      const route = await app.machinist.getHTTPRoute(version.namespace, version.appLabel, ctx)
      routeReady = routeServesVersion(route, version) && routeAccepted(route)
    } catch (err) {
      ctx.logger.error({ err }, 'confirm: failed to read live HTTPRoute')
    }

    if (!podsReady || !routeReady) {
      ctx.logger.info({
        appLabel: version.appLabel, versionLabel: version.versionLabel, podsReady, routeReady
      }, 'confirm: version not yet live')
      return { confirmed: false, podsReady, routeReady }
    }

    const result = await app.confirmActivation(version.appLabel, version.versionLabel, ctx)
    return { ...result, podsReady, routeReady }
  })

  // Rebuild the HTTPRoute after a version becomes active (promote/approve).
  async function applyActivationRoute (result, ctx) {
    if (!app.applyHTTPRoute || !result.version || !result.activeVersion) return
    const v = result.version
    await app.applyHTTPRoute({
      appName: v.appLabel,
      namespace: v.namespace,
      pathPrefix: v.pathPrefix,
      hostname: v.hostname || null,
      productionVersion: result.activeVersion,
      drainingVersions: result.drainingVersions,
      stagedVersions: result.stagedVersions,
      applicationId: v.applicationId
    }, ctx).catch(err => {
      ctx.logger.error({ err }, 'failed to apply HTTPRoute after activation')
    })
    await recordRouting(v, result, ctx, 'activate')
  }

  /**
   * Promote a version to active and rebuild the gateway route so it serves. In
   * advise mode the version stays pending-apply and a plan is returned instead
   * of mutating the route.
   */
  app.decorate('promoteAndApply', async (appLabel, versionLabel, ctx) => {
    const result = await app.promoteVersion(appLabel, versionLabel, ctx)
    if (result.pendingApply) {
      return { ...result, plan: await planActivation(result.version, versionLabel, ctx) }
    }
    if (result.promoted) await applyActivationRoute(result, ctx)
    return result
  })

  /**
   * Approve a staged version (gated promote) and rebuild the gateway route. In
   * advise mode the version stays pending-apply and a plan is returned.
   */
  app.decorate('approveAndApply', async (appLabel, versionLabel, ctx) => {
    const result = await app.approveVersion(appLabel, versionLabel, ctx)
    if (result.pendingApply) {
      return { ...result, plan: await planActivation(result.version, versionLabel, ctx) }
    }
    if (result.approved) await applyActivationRoute(result, ctx)
    return result
  })

  /**
   * Reject a staged version and tear its deployment down. The staged version was
   * reachable by the x-deployment-id preview rule, so the HTTPRoute is rebuilt
   * without it (when an active version exists to anchor the default rule).
   */
  app.decorate('rejectAndCleanup', async (appLabel, versionLabel, ctx) => {
    const result = await app.rejectVersion(appLabel, versionLabel, ctx)
    if (!result.rejected || !result.version) return result

    const version = result.version
    const providerMetadata = { kind: 'Deployment', apiVersion: 'apps/v1' }

    // Advise mode: the rejection is recorded, but dropping the preview rule and
    // tearing the deployment down are returned as a plan for an external actor.
    const { routing } = await actuationFor(version.applicationId)
    if (routing === 'plan') {
      const plan = []
      if (app.planHTTPRoute && result.activeVersion) {
        const routeStep = await app.planHTTPRoute({
          appName: version.appLabel,
          namespace: version.namespace,
          pathPrefix: version.pathPrefix,
          hostname: version.hostname || null,
          productionVersion: result.activeVersion,
          drainingVersions: result.drainingVersions,
          stagedVersions: result.stagedVersions,
          applicationId: version.applicationId
        }, ctx)
        if (routeStep) plan.push(routeStep)
      }
      const advisePolicy = await app.resolveSkewPolicy(version.applicationId)
      plan.push(...workloadTeardownPlan(version, advisePolicy))
      return { ...result, plan }
    }

    // Drop the rejected version's preview rule from the gateway route.
    if (app.applyHTTPRoute && result.activeVersion) {
      await app.applyHTTPRoute({
        appName: version.appLabel,
        namespace: version.namespace,
        pathPrefix: version.pathPrefix,
        hostname: version.hostname || null,
        productionVersion: result.activeVersion,
        drainingVersions: result.drainingVersions,
        stagedVersions: result.stagedVersions,
        applicationId: version.applicationId
      }, ctx).catch(err => {
        ctx.logger.error({ err }, 'failed to update HTTPRoute after rejecting version')
      })
      await recordRouting(version, result, ctx, 'reject')
    }

    await app.disableScaling(version.namespace, version.controllerName)
      .catch(err => {
        ctx.logger.error({ err }, 'failed to disable scaling for rejected version')
      })

    await app.machinist.updateControllerReplicas(
      version.namespace,
      version.controllerName,
      0,
      providerMetadata,
      ctx
    ).catch(err => {
      ctx.logger.error({ err }, 'failed to scale rejected deployment to 0')
    })

    const policy = await app.resolveSkewPolicy(version.applicationId)
    if (policy.autoCleanup) {
      await app.machinist.deleteController(
        version.namespace,
        version.controllerName,
        providerMetadata,
        ctx
      ).catch(err => {
        ctx.logger.error({ err }, 'failed to delete rejected controller')
      })

      await app.machinist.deleteService(version.namespace, version.serviceName, ctx)
        .catch(err => {
          ctx.logger.error({ err }, 'failed to delete rejected Service')
        })
    }

    return result
  })

  /**
   * Disable transition: when an app flips enabled -> disabled, force-
   * expire its draining versions and tear them down so no orphaned draining
   * states or stale routing rules remain. The current active version keeps
   * serving (single active backend).
   */
  app.decorate('applyVersioningDisable', async (applicationId, ctx) => {
    const { entities } = app.platformatic
    const draining = await entities.versionRegistry.find({
      where: {
        applicationId: { eq: applicationId },
        status: { eq: 'draining' }
      }
    })

    const expired = []
    for (const version of draining) {
      const result = await app.expireAndCleanup(version, ctx).catch(err => {
        ctx.logger.error({ err, versionLabel: version.versionLabel },
          'failed to expire draining version during disable transition')
        return { expired: false }
      })
      if (result.expired) expired.push(version.versionLabel)
    }

    ctx.logger.info({ applicationId, expired }, 'applied versioning disable transition')
    return { expired }
  })
}, {
  name: 'version-cleanup',
  dependencies: ['env', 'version-registry', 'gateway', 'machinist', 'skew-policy']
})
