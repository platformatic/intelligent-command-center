'use strict'

const fp = require('fastify-plugin')
const errors = require('./errors')
const { resolveActuation } = require('../lib/actuation')

// Version lifecycle states.
const STATES = {
  STAGED: 'staged',
  PENDING_APPLY: 'pending-apply',
  ACTIVE: 'active',
  DRAINING: 'draining',
  PENDING_EXPIRE: 'pending-expire',
  EXPIRED: 'expired'
}

// Legal transitions of the version state machine. `pending-apply` is the single
// funnel into `active`; `pending-expire` is its mirror, the single funnel into
// `expired`. Both are transient in observe/manage (ICC actuates synchronously)
// and only linger visibly in advise, where ICC records intent and waits to
// observe the external actor apply the plan.
const TRANSITIONS = {
  staged: ['pending-apply', 'pending-expire', 'expired'], // approve / mark latest, abandon, reject
  'pending-apply': ['active', 'pending-expire'], // confirmed live, or abandoned
  active: ['draining'], // superseded by a new active (not expired directly -- see EXPIRABLE)
  draining: ['pending-apply', 'pending-expire', 'expired'], // promote / rollback, expire
  'pending-expire': ['expired', 'pending-apply'], // teardown observed, or redeploy
  expired: ['pending-apply'] // redeploy / reactivate
}

function isLegalTransition (from, to) {
  return (TRANSITIONS[from] || []).includes(to)
}

function assertTransition (from, to) {
  if (!isLegalTransition(from, to)) {
    throw new errors.IllegalVersionTransition(from, to)
  }
}

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  const enabled = app.env.PLT_FEATURE_SKEW_PROTECTION

  // Record a lifecycle audit entry if the audit plugin is loaded. The
  // actor is resolved from ctx (request user or explicit ctx.actor for jobs).
  async function audit (record, ctx, tx) {
    if (app.recordVersionAudit) await app.recordVersionAudit(record, ctx, tx)
  }

  /**
   * Funnels a version into `active` through the `pending-apply` state and
   * demotes whatever was active before it. This is the single chokepoint that
   * makes a version routable; registration, promote, approve, and redeploy all
   * go through it so the single-active invariant and the lifecycle transitions
   * are enforced in one place.
   *
   * The version row must currently be in a state that can legally reach
   * `pending-apply` (staged, draining, expired) or already be `pending-apply`.
   * In observe/manage mode actuation is synchronous, so `pending-apply` is
   * transient and we confirm `active` immediately.
   *
   * @param {object} version - the version_registry row to activate
   * @param {object} ctx - request context with logger
   * @param {object} tx - active transaction
   * @param {object} [extra] - field updates to apply while funneling (used when
   *   redeploying an expired version: deploymentId, controllerName, ...)
   * @param {object} [activation] - audit descriptor { event, fromState, reason }
   *   for the activation itself (the demote/maxVersions audits are emitted here).
   */
  async function funnelToActive (version, ctx, tx, extra = {}, activation = null, opts = {}) {
    const { entities } = app.platformatic

    // Resolve the actuation mode once (reused for maxVersions below). In advise
    // mode the gateway/workload actuators only plan, so ICC must not flip the
    // version to active until an external actor applies the plan (observed later
    // via confirmActivation). The version lingers in pending-apply and the
    // current active keeps serving. observe/manage actuate synchronously, so
    // pending-apply is transient and we confirm active immediately.
    const policy = app.resolveSkewPolicy ? await app.resolveSkewPolicy(version.applicationId) : null
    const { routing } = resolveActuation(policy?.mode)
    // Stop at pending-apply when the route must not flip yet: advise mode (nothing
    // actuated) or observe/manage with the new pods not Ready (flipping would 500
    // until the Service has endpoints). opts.confirm (the checker) forces through.
    const deferred = !opts.confirm && (routing !== 'apply' || opts.ready === false)
    const deferReason = routing !== 'apply' ? 'advise-plan' : 'awaiting-readiness'

    // staged|draining|expired -> pending-apply (record intent). A row inserted
    // straight as pending-apply skips this write.
    if (version.status !== STATES.PENDING_APPLY) {
      assertTransition(version.status, STATES.PENDING_APPLY)
      version = await entities.versionRegistry.save({
        input: { id: version.id, status: STATES.PENDING_APPLY, ...extra },
        tx
      })
    } else if (Object.keys(extra).length > 0) {
      version = await entities.versionRegistry.save({
        input: { id: version.id, ...extra },
        tx
      })
    }

    // Deferred: keep the current active serving; the checker flips this version
    // active once its side is live (external route for advise, readiness for observe).
    if (deferred) {
      if (activation) {
        await audit({
          applicationId: version.applicationId,
          versionLabel: version.versionLabel,
          event: activation.event,
          fromState: activation.fromState ?? null,
          toState: STATES.PENDING_APPLY,
          reason: activation.reason ?? deferReason
        }, ctx, tx)
      }
      if (app.sendVersionRegistryActivity && ctx.req?.activities) {
        await app.sendVersionRegistryActivity(version.applicationId, version.versionLabel, 'pending-apply', ctx)
          .catch((err) => ctx.logger.error({ err }, 'Failed to send version registry activity'))
      }
      ctx.logger.info({
        appLabel: version.appLabel,
        versionLabel: version.versionLabel,
        reason: deferReason
      }, deferReason === 'awaiting-readiness'
        ? 'version is pending-apply — awaiting pod readiness before route cutover'
        : 'version is pending-apply — advise mode, awaiting external apply')
      await app.emitUpdate('icc', {
        topic: 'ui-updates/deployments',
        type: 'version-status-changed',
        data: { applicationId: version.applicationId }
      }).catch((err) => ctx.logger.error({ err }, 'Failed to send version status update'))
      return { activated: false }
    }

    // pending-apply -> active (confirmed live).
    assertTransition(STATES.PENDING_APPLY, STATES.ACTIVE)
    await entities.versionRegistry.save({
      input: { id: version.id, status: STATES.ACTIVE, drainedAt: null, expiredAt: null },
      tx
    })

    if (app.sendVersionRegistryActivity && ctx.req?.activities) {
      await app.sendVersionRegistryActivity(version.applicationId, version.versionLabel, 'active', ctx)
        .catch((err) => ctx.logger.error({ err }, 'Failed to send version registry activity'))
    }

    ctx.logger.info({
      appLabel: version.appLabel,
      versionLabel: version.versionLabel
    }, 'version is active')

    if (activation) {
      await audit({
        applicationId: version.applicationId,
        versionLabel: version.versionLabel,
        event: activation.event,
        fromState: activation.fromState ?? null,
        toState: STATES.ACTIVE,
        reason: activation.reason ?? null
      }, ctx, tx)
    }

    // Demote every other active version for this app to draining.
    const otherActive = await entities.versionRegistry.find({
      where: {
        appLabel: { eq: version.appLabel },
        versionLabel: { neq: version.versionLabel },
        status: { eq: STATES.ACTIVE }
      },
      tx
    })

    for (const v of otherActive) {
      assertTransition(STATES.ACTIVE, STATES.DRAINING)
      await entities.versionRegistry.save({
        input: { id: v.id, status: STATES.DRAINING, drainedAt: new Date().toISOString() },
        tx
      })
      if (app.sendVersionRegistryActivity && ctx.req?.activities) {
        await app.sendVersionRegistryActivity(v.applicationId, v.versionLabel, 'draining', ctx)
          .catch((err) => ctx.logger.error({ err }, 'Failed to send version registry activity'))
      }
      await audit({
        applicationId: v.applicationId,
        versionLabel: v.versionLabel,
        event: 'drained',
        fromState: STATES.ACTIVE,
        toState: STATES.DRAINING,
        reason: 'superseded'
      }, ctx, tx)
      ctx.logger.info({
        appLabel: version.appLabel,
        versionLabel: v.versionLabel
      }, 'marked version as draining')
    }

    await app.emitUpdate('icc', {
      topic: 'ui-updates/deployments',
      type: 'version-status-changed',
      data: { applicationId: version.applicationId }
    }).catch((err) => ctx.logger.error({ err }, 'Failed to send version status update'))

    // Enforce maxVersions: auto-expire oldest draining versions over the limit.
    if (policy && policy.maxVersions !== null) {
      const allDraining = await entities.versionRegistry.find({
        where: {
          appLabel: { eq: version.appLabel },
          status: { eq: STATES.DRAINING }
        },
        tx
      })

      if (allDraining.length > policy.maxVersions) {
        allDraining.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        const excess = allDraining.length - policy.maxVersions
        for (let i = 0; i < excess; i++) {
          assertTransition(STATES.DRAINING, STATES.EXPIRED)
          await entities.versionRegistry.save({
            input: { id: allDraining[i].id, status: STATES.EXPIRED, expiredAt: new Date().toISOString() },
            tx
          })
          await entities.deployment.save({
            input: { id: allDraining[i].deploymentId, status: 'stopped' },
            tx
          })
          await audit({
            applicationId: allDraining[i].applicationId,
            versionLabel: allDraining[i].versionLabel,
            event: 'expired',
            fromState: STATES.DRAINING,
            toState: STATES.EXPIRED,
            reason: 'maxVersions',
            actor: { type: 'system', name: 'version-registry' }
          }, ctx, tx)
          ctx.logger.info({
            appLabel: version.appLabel,
            versionLabel: allDraining[i].versionLabel
          }, 'auto-expired draining version — maxVersions exceeded')
        }
      }
    }

    return { activated: true }
  }

  // Collapse to a single active version when per-app versioning is disabled:
  // expire every draining version so the app behaves like a non-versioned
  // single-backend deploy. draining -> expired is legal.
  async function collapseToSingleActive (appLabel, ctx, tx) {
    const { entities } = app.platformatic
    const draining = await entities.versionRegistry.find({
      where: { appLabel: { eq: appLabel }, status: { eq: STATES.DRAINING } },
      tx
    })
    for (const v of draining) {
      assertTransition(STATES.DRAINING, STATES.EXPIRED)
      await entities.versionRegistry.save({
        input: { id: v.id, status: STATES.EXPIRED, expiredAt: new Date().toISOString() },
        tx
      })
      await entities.deployment.save({
        input: { id: v.deploymentId, status: 'stopped' },
        tx
      })
      await audit({
        applicationId: v.applicationId,
        versionLabel: v.versionLabel,
        event: 'expired',
        fromState: STATES.DRAINING,
        toState: STATES.EXPIRED,
        reason: 'versioning-disabled'
      }, ctx, tx)
      ctx.logger.info({
        appLabel, versionLabel: v.versionLabel
      }, 'versioning disabled — collapsed draining version to expired')
    }
  }

  /**
   * Registers a version in the version registry and manages lifecycle transitions.
   *
   * - If the app requires approval (resolved config), the version is inserted as
   *   `staged` and the current active version is left untouched. Promotion
   *   happens only on explicit approve.
   * - Otherwise the version is inserted as `pending-apply` and funneled to
   *   `active`, demoting any previous active to `draining`.
   * - If the version already exists as `expired`, it is redeployed (funneled
   *   back to active). Any other existing status is a no-op.
   * - Serialized per app label via pg_advisory_xact_lock so concurrent
   *   registrations for the same app cannot both end up active.
   *
   * @param {object} opts
   * @param {string} opts.applicationId
   * @param {string} opts.deploymentId
   * @param {string} opts.appLabel - app.kubernetes.io/name label value
   * @param {string} opts.versionLabel - plt.dev/version label value
   * @param {string} opts.controllerName - owning K8s Deployment name
   * @param {string} opts.serviceName - K8s Service name
   * @param {number} opts.servicePort - K8s Service port
   * @param {string} opts.namespace - K8s namespace
   * @param {string} opts.pathPrefix - path prefix for routing
   * @param {string|null} opts.hostname - optional hostname for routing
   * @param {string} [opts.expirePolicy] - expire policy ('http-traffic' or 'workflow')
   * @param {object} ctx - Fastify request context with logger
   * @returns {{ isNew: boolean, staged?: boolean, activeVersion: object|null, drainingVersions: Array }}
   */
  app.decorate('registerVersion', async (opts, ctx) => {
    const { entities, db, sql } = app.platformatic

    const policy = app.resolveSkewPolicy ? await app.resolveSkewPolicy(opts.applicationId) : null
    // Without skew there is no gateway to route through, so there is nothing to
    // drain: treat it like versioning-disabled and collapse superseded versions
    // straight to expired (a records-only history, no HTTPRoute).
    const versioningEnabled = enabled ? (policy?.enabled ?? true) : false
    // Approval is only meaningful while versioning is enabled for the app.
    const requiresApproval = versioningEnabled && (policy?.requiresApproval ?? false)

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

      // At most one live (non-expired) version per label (partial unique index);
      // expired rows are history and may repeat a label.
      const prevLive = existing.find(v => v.status !== STATES.EXPIRED)
      const prevExpired = existing.find(v => v.status === STATES.EXPIRED)

      // Confirm an advise version: skew off records it as pending-apply at deploy
      // time (no workload yet); a real pod is now registering, so flip it active.
      // With skew on this is the pending-apply-checker's job (it also verifies the
      // live route), so leave it alone.
      if (prevLive && prevLive.status === STATES.PENDING_APPLY && !enabled) {
        const { activated } = await funnelToActive(prevLive, ctx, tx, {
          deploymentId: opts.deploymentId,
          controllerName: opts.controllerName,
          serviceName: opts.serviceName,
          servicePort: opts.servicePort
        }, { event: 'confirmed', fromState: STATES.PENDING_APPLY })

        if (!versioningEnabled) await collapseToSingleActive(opts.appLabel, ctx, tx)

        ctx.logger.info({
          appLabel: opts.appLabel,
          versionLabel: opts.versionLabel
        }, 'confirmed advise version active on pod registration')

        return {
          isNew: false,
          pendingApply: !activated,
          ...(await getVersionState(opts.appLabel, tx))
        }
      }

      if (prevLive) {
        ctx.logger.debug({
          appLabel: opts.appLabel,
          versionLabel: opts.versionLabel,
          status: prevLive.status
        }, 'version already registered')

        return {
          isNew: false,
          ...(await getVersionState(opts.appLabel, tx))
        }
      }

      // Re-activate an expired version that is being redeployed.
      if (prevExpired) {
        const { activated } = await funnelToActive(prevExpired, ctx, tx, {
          deploymentId: opts.deploymentId,
          controllerName: opts.controllerName,
          serviceName: opts.serviceName,
          servicePort: opts.servicePort
        }, { event: 'registered', fromState: STATES.EXPIRED, reason: 'redeploy' }, { ready: opts.ready })

        if (!versioningEnabled) await collapseToSingleActive(opts.appLabel, ctx, tx)

        ctx.logger.info({
          appLabel: opts.appLabel,
          versionLabel: opts.versionLabel
        }, 're-activated expired version')

        return {
          isNew: false,
          pendingApply: !activated,
          ...(await getVersionState(opts.appLabel, tx))
        }
      }

      const insertInput = {
        applicationId: opts.applicationId,
        deploymentId: opts.deploymentId,
        appLabel: opts.appLabel,
        versionLabel: opts.versionLabel,
        controllerName: opts.controllerName,
        serviceName: opts.serviceName,
        servicePort: opts.servicePort,
        namespace: opts.namespace,
        pathPrefix: opts.pathPrefix,
        hostname: opts.hostname,
        expirePolicy: opts.expirePolicy || 'http-traffic'
      }

      // Approval required: register as staged and leave the current active
      // version serving. The staged version is reachable only via the
      // x-deployment-id preview rule until it is approved.
      if (requiresApproval) {
        await entities.versionRegistry.save({
          input: { ...insertInput, status: STATES.STAGED },
          tx
        })

        if (app.sendVersionRegistryActivity && ctx.req?.activities) {
          await app.sendVersionRegistryActivity(opts.applicationId, opts.versionLabel, 'staged', ctx)
            .catch((err) => ctx.logger.error({ err }, 'Failed to send version registry activity'))
        }

        await audit({
          applicationId: opts.applicationId,
          versionLabel: opts.versionLabel,
          event: 'staged',
          fromState: null,
          toState: STATES.STAGED,
          reason: 'requires-approval'
        }, ctx, tx)

        ctx.logger.info({
          appLabel: opts.appLabel,
          versionLabel: opts.versionLabel
        }, 'registered new version as staged — awaiting approval')

        await app.emitUpdate('icc', {
          topic: 'ui-updates/deployments',
          type: 'version-status-changed',
          data: { applicationId: opts.applicationId }
        }).catch((err) => ctx.logger.error({ err }, 'Failed to send version status update'))

        return {
          isNew: true,
          staged: true,
          ...(await getVersionState(opts.appLabel, tx))
        }
      }

      // No approval: funnel toward active through pending-apply. In advise mode
      // the funnel stops at pending-apply (the new version is not yet live).
      const inserted = await entities.versionRegistry.save({
        input: { ...insertInput, status: STATES.PENDING_APPLY },
        tx
      })

      const { activated } = await funnelToActive(inserted, ctx, tx, {}, { event: 'registered', fromState: null }, { ready: opts.ready })

      if (!versioningEnabled) await collapseToSingleActive(opts.appLabel, ctx, tx)

      ctx.logger.info({
        appLabel: opts.appLabel,
        versionLabel: opts.versionLabel,
        activated
      }, activated ? 'registered new version as active' : 'registered new version as pending-apply')

      return {
        isNew: true,
        pendingApply: !activated,
        ...(await getVersionState(opts.appLabel, tx))
      }
    })
  })

  // Record (or refresh) an advise-mode version at deploy time, before any
  // workload exists. It carries the plan so the dashboard can show it, and sits
  // at pending-apply until a pod registers (registerVersion confirms it, skew
  // off) or the pending-apply-checker confirms it (skew on). Skew-independent.
  app.decorate('recordAdviseVersion', async (opts, ctx) => {
    const { entities, db, sql } = app.platformatic
    return db.tx(async (tx) => {
      await tx.query(sql`SELECT pg_advisory_xact_lock(hashtext(${opts.appLabel}))`)

      // Upsert onto any live (non-expired) row for this label; the partial unique
      // index allows at most one, so a repeated advise deploy refreshes its plan.
      const existing = await entities.versionRegistry.find({
        where: { appLabel: { eq: opts.appLabel }, versionLabel: { eq: opts.versionLabel } },
        tx
      })
      const live = existing.find(v => v.status !== STATES.EXPIRED)

      const input = {
        applicationId: opts.applicationId,
        deploymentId: opts.deploymentId ?? null,
        appLabel: opts.appLabel,
        versionLabel: opts.versionLabel,
        controllerName: opts.controllerName,
        serviceName: opts.serviceName,
        servicePort: opts.servicePort,
        namespace: opts.namespace,
        pathPrefix: opts.pathPrefix,
        hostname: opts.hostname ?? null,
        expirePolicy: opts.expirePolicy || 'http-traffic',
        status: STATES.PENDING_APPLY,
        mode: 'advise',
        // Wrap the step array in an object: the pg driver serializes a bare
        // top-level array as a PG array literal (not JSON), but an object maps to
        // jsonb correctly (same as version_audit.detail). Read back as plan.steps.
        plan: opts.plan ? { steps: opts.plan } : null
      }
      if (live) input.id = live.id

      const saved = await entities.versionRegistry.save({ input, tx })

      await app.emitUpdate('icc', {
        topic: 'ui-updates/deployments',
        type: 'version-status-changed',
        data: { applicationId: opts.applicationId }
      }).catch((err) => ctx.logger.error({ err }, 'Failed to send version status update'))

      return saved
    })
  })

  /**
   * Approve a staged version: a gated promote. Flips the staged version
   * to active, demoting the previous active to draining. Only `staged` versions
   * can be approved.
   *
   * @param {string} appLabel
   * @param {string} versionLabel
   * @param {object} ctx
   * @returns {{ approved: boolean, version: object|null, activeVersion: object|null, drainingVersions: Array }}
   */
  app.decorate('approveVersion', async (appLabel, versionLabel, ctx) => {
    if (!enabled) throw new errors.SkewProtectionDisabled()

    const { entities, db, sql } = app.platformatic

    return db.tx(async (tx) => {
      await tx.query(sql`SELECT pg_advisory_xact_lock(hashtext(${appLabel}))`)

      const rows = await entities.versionRegistry.find({
        where: { appLabel: { eq: appLabel }, versionLabel: { eq: versionLabel } },
        tx
      })

      if (rows.length === 0) {
        return { approved: false, version: null, ...(await getVersionState(appLabel, tx)) }
      }

      const version = rows[0]
      if (version.status !== STATES.STAGED) {
        throw new errors.VersionNotStaged(versionLabel, version.status)
      }

      const { activated } = await funnelToActive(version, ctx, tx, {}, { event: 'approved', fromState: STATES.STAGED })
      ctx.logger.info({ appLabel, versionLabel, activated }, 'approved staged version')

      return { approved: true, pendingApply: !activated, version, ...(await getVersionState(appLabel, tx)) }
    })
  })

  /**
   * Promote a version to active ("mark as latest"). Works for `staged`
   * and `draining` versions; both still have running pods. Promoting an
   * `expired` version is refused in observe mode (it needs re-provisioning;
   * redeploy instead). Promoting the current active is a no-op.
   *
   * @param {string} appLabel
   * @param {string} versionLabel
   * @param {object} ctx
   * @returns {{ promoted: boolean, version: object|null, activeVersion: object|null, drainingVersions: Array }}
   */
  app.decorate('promoteVersion', async (appLabel, versionLabel, ctx) => {
    if (!enabled) throw new errors.SkewProtectionDisabled()

    const { entities, db, sql } = app.platformatic

    return db.tx(async (tx) => {
      await tx.query(sql`SELECT pg_advisory_xact_lock(hashtext(${appLabel}))`)

      const rows = await entities.versionRegistry.find({
        where: { appLabel: { eq: appLabel }, versionLabel: { eq: versionLabel } },
        tx
      })

      if (rows.length === 0) {
        return { promoted: false, version: null, ...(await getVersionState(appLabel, tx)) }
      }

      const version = rows[0]

      if (version.status === STATES.ACTIVE) {
        return { promoted: false, version, ...(await getVersionState(appLabel, tx)) }
      }

      if (version.status === STATES.EXPIRED) {
        throw new errors.VersionCannotPromote(
          versionLabel, version.status,
          'expired versions must be redeployed to be promoted in observe mode'
        )
      }

      if (version.status === STATES.PENDING_APPLY) {
        throw new errors.VersionCannotPromote(versionLabel, version.status, 'version is mid-apply')
      }

      // staged or draining
      const { activated } = await funnelToActive(version, ctx, tx, {}, { event: 'promoted', fromState: version.status })
      ctx.logger.info({ appLabel, versionLabel, activated }, 'promoted version toward active')

      return { promoted: true, pendingApply: !activated, version, ...(await getVersionState(appLabel, tx)) }
    })
  })

  /**
   * Reject a staged version: staged -> expired, and stop its
   * deployment. Only `staged` versions can be rejected.
   *
   * @param {string} appLabel
   * @param {string} versionLabel
   * @param {object} ctx
   * @returns {{ rejected: boolean, version: object|null, activeVersion: object|null, drainingVersions: Array }}
   */
  app.decorate('rejectVersion', async (appLabel, versionLabel, ctx) => {
    if (!enabled) throw new errors.SkewProtectionDisabled()

    const { entities } = app.platformatic

    const rows = await entities.versionRegistry.find({
      where: { appLabel: { eq: appLabel }, versionLabel: { eq: versionLabel } }
    })

    if (rows.length === 0) {
      return { rejected: false, version: null, ...(await getVersionState(appLabel)) }
    }

    const version = rows[0]
    if (version.status !== STATES.STAGED) {
      throw new errors.VersionNotStaged(versionLabel, version.status)
    }

    assertTransition(STATES.STAGED, STATES.EXPIRED)
    await entities.versionRegistry.save({
      input: { id: version.id, status: STATES.EXPIRED, expiredAt: new Date().toISOString() }
    })
    await entities.deployment.save({
      input: { id: version.deploymentId, status: 'stopped' }
    })

    if (app.sendVersionRegistryActivity && ctx.req?.activities) {
      await app.sendVersionRegistryActivity(version.applicationId, versionLabel, 'expired', ctx)
        .catch((err) => ctx.logger.error({ err }, 'Failed to send version registry activity'))
    }

    await audit({
      applicationId: version.applicationId,
      versionLabel,
      event: 'rejected',
      fromState: STATES.STAGED,
      toState: STATES.EXPIRED,
      reason: 'manual'
    }, ctx)

    ctx.logger.info({ appLabel, versionLabel }, 'rejected staged version')

    await app.emitUpdate('icc', {
      topic: 'ui-updates/deployments',
      type: 'version-status-changed',
      data: { applicationId: version.applicationId }
    }).catch((err) => ctx.logger.error({ err }, 'Failed to send version status update'))

    return { rejected: true, version, ...(await getVersionState(appLabel)) }
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
    if (!enabled) throw new errors.SkewProtectionDisabled()

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

    // A version reaches `expired` from `draining` (manage/observe actuate the
    // teardown directly) or from `pending-expire` (advise, once ICC observes the
    // external actor tore the workload down).
    if (version.status !== STATES.DRAINING && version.status !== STATES.PENDING_EXPIRE) {
      ctx.logger.warn({
        appLabel, versionLabel, status: version.status
      }, 'only draining or pending-expire versions can be expired')
      return { expired: false, ...(await getVersionState(appLabel)) }
    }

    assertTransition(version.status, STATES.EXPIRED)
    const fromState = version.status
    await entities.versionRegistry.save({
      input: { id: version.id, status: STATES.EXPIRED, expiredAt: new Date().toISOString() }
    })

    await entities.deployment.save({
      input: { id: version.deploymentId, status: 'stopped' }
    })

    if (app.sendVersionRegistryActivity && ctx.req?.activities) {
      await app.sendVersionRegistryActivity(version.applicationId, versionLabel, 'expired', ctx)
        .catch((err) => ctx.logger.error({ err }, 'Failed to send version registry activity'))
    }

    // Reason/actor flow in from the caller via ctx (e.g. the draining-checker
    // sets ctx.actor + ctx.reason); manual route expiry leaves the default.
    await audit({
      applicationId: version.applicationId,
      versionLabel,
      event: 'expired',
      fromState,
      toState: STATES.EXPIRED,
      reason: ctx.reason ?? 'manual'
    }, ctx)

    ctx.logger.info({ appLabel, versionLabel }, 'expired version')

    await app.emitUpdate('icc', {
      topic: 'ui-updates/deployments',
      type: 'version-status-changed',
      data: { applicationId: version.applicationId }
    }).catch((err) => ctx.logger.error({ err }, 'Failed to send version status update'))

    return { expired: true, ...(await getVersionState(appLabel)) }
  })

  /**
   * Record intent to expire a version (advise mode): move it to `pending-expire`
   * without touching the cluster. The mirror of funneling into `pending-apply` on
   * the activate side. From here ICC either expires immediately (nothing routes
   * to it, so there is nothing to observe) or waits to observe the external actor
   * tear the workload down (confirmTeardown). Legal from staged / pending-apply /
   * active / draining. Idempotent: a version already pending-expire is untouched.
   */
  app.decorate('markPendingExpire', async (appLabel, versionLabel, ctx) => {
    if (!enabled) throw new errors.SkewProtectionDisabled()

    const { entities } = app.platformatic
    const versions = await entities.versionRegistry.find({
      where: { appLabel: { eq: appLabel }, versionLabel: { eq: versionLabel } }
    })
    if (versions.length === 0) {
      ctx.logger.warn({ appLabel, versionLabel }, 'version not found')
      return { pendingExpire: false, ...(await getVersionState(appLabel)) }
    }

    const version = versions[0]
    if (version.status === STATES.PENDING_EXPIRE) {
      return { pendingExpire: true, version, ...(await getVersionState(appLabel)) }
    }

    assertTransition(version.status, STATES.PENDING_EXPIRE)
    const fromState = version.status
    const saved = await entities.versionRegistry.save({
      input: { id: version.id, status: STATES.PENDING_EXPIRE, drainedAt: version.drainedAt ?? new Date().toISOString() }
    })

    if (app.sendVersionRegistryActivity && ctx.req?.activities) {
      await app.sendVersionRegistryActivity(version.applicationId, versionLabel, 'pending-expire', ctx)
        .catch((err) => ctx.logger.error({ err }, 'Failed to send version registry activity'))
    }

    await audit({
      applicationId: version.applicationId,
      versionLabel,
      event: 'expiring',
      fromState,
      toState: STATES.PENDING_EXPIRE,
      reason: ctx.reason ?? 'advise-plan'
    }, ctx)

    ctx.logger.info({ appLabel, versionLabel, fromState }, 'version is pending-expire — advise mode, awaiting observed teardown')

    await app.emitUpdate('icc', {
      topic: 'ui-updates/deployments',
      type: 'version-status-changed',
      data: { applicationId: version.applicationId }
    }).catch((err) => ctx.logger.error({ err }, 'Failed to send version status update'))

    return { pendingExpire: true, version: saved, ...(await getVersionState(appLabel)) }
  })

  app.decorate('listVersions', async (applicationId, status) => {
    // Skew-independent read: versions are recorded whether or not skew is on
    // (skew adds routing on top). Returns the rows for the Deployments view.
    const { entities } = app.platformatic
    const where = { applicationId: { eq: applicationId } }
    if (status) {
      where.status = { eq: status }
    }
    // Newest first; the route then orders the active version to the top.
    // sql-mapper's find defaults to LIMIT 10, which would silently truncate the
    // list (and the totalCount the version manager paginates on); 100 is the
    // mapper's max and far above the per-app version count.
    return entities.versionRegistry.find({
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: 100
    })
  })

  /**
   * Returns a single version row by application + version label, or null.
   */
  app.decorate('getVersion', async (applicationId, versionLabel) => {
    const { entities } = app.platformatic
    const rows = await entities.versionRegistry.find({
      where: {
        applicationId: { eq: applicationId },
        versionLabel: { eq: versionLabel }
      },
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    })
    if (rows.length === 0) return null
    // A label repeats only across expired history; prefer the live row.
    return rows.find(r => r.status !== STATES.EXPIRED) ?? rows[0]
  })

  /**
   * Confirm signal: flip a pending-apply version to active once an external
   * actor has applied the plan (advise mode). The caller in the actuation layer
   * verifies pods registered + the live route reflects the version via machinist
   * and then calls this; the registry performs only the DB transition, keeping
   * provider reads out of the lifecycle layer. Idempotent: a version that is not
   * pending-apply is left untouched.
   */
  app.decorate('confirmActivation', async (appLabel, versionLabel, ctx) => {
    if (!enabled) throw new errors.SkewProtectionDisabled()

    const { entities, db, sql } = app.platformatic

    return db.tx(async (tx) => {
      await tx.query(sql`SELECT pg_advisory_xact_lock(hashtext(${appLabel}))`)

      const rows = await entities.versionRegistry.find({
        where: { appLabel: { eq: appLabel }, versionLabel: { eq: versionLabel } },
        tx
      })

      // A label repeats only across expired history; act on the live row.
      const version = rows.find(r => r.status !== STATES.EXPIRED) ?? null
      if (!version || version.status !== STATES.PENDING_APPLY) {
        return { confirmed: false, version, ...(await getVersionState(appLabel, tx)) }
      }

      await funnelToActive(
        version, ctx, tx, {},
        { event: 'confirmed', fromState: STATES.PENDING_APPLY }, { confirm: true }
      )
      ctx.logger.info({ appLabel, versionLabel }, 'confirmed pending-apply version active')

      return { confirmed: true, version, ...(await getVersionState(appLabel, tx)) }
    })
  })

  /**
   * Desired routing if `versionLabel` were active: it becomes the production
   * version, every current active/draining demotes to draining, staged stays a
   * preview. Pure read used to render the advise-mode plan without mutating the
   * cluster.
   */
  app.decorate('getDesiredRouting', async (appLabel, versionLabel, prospective = null) => {
    if (!enabled) return { productionVersion: null, drainingVersions: [], stagedVersions: [] }

    const { entities } = app.platformatic
    const rows = await entities.versionRegistry.find({
      where: {
        appLabel: { eq: appLabel },
        status: { in: [STATES.ACTIVE, STATES.DRAINING, STATES.STAGED, STATES.PENDING_APPLY] }
      }
    })

    const ref = (v) => ({ versionId: v.versionLabel, serviceName: v.serviceName, port: v.servicePort })
    let productionVersion = null
    const drainingVersions = []
    const stagedVersions = []
    for (const v of rows) {
      if (v.versionLabel === versionLabel) {
        productionVersion = ref(v)
      } else if (v.status === STATES.ACTIVE || v.status === STATES.DRAINING) {
        drainingVersions.push(ref(v))
      } else if (v.status === STATES.STAGED) {
        stagedVersions.push(ref(v))
      }
    }
    // Advise deploy plans the route before the pod boots, so `versionLabel` is
    // not in the registry yet. Treat the incoming version as production; the
    // current active then routes as a draining backend. A registry row wins if
    // one already exists (re-deploy of the same label).
    if (!productionVersion && prospective) {
      productionVersion = prospective
    }
    return { productionVersion, drainingVersions, stagedVersions }
  })

  /**
   * Advise-ready dry-run stub: returns the steps a promote of
   * the given version would produce, without mutating the cluster. Mode-aware
   * actuation lands later; for now this surfaces the routing delta.
   *
   * @returns {{ steps: Array }|null} null when the version does not exist
   */
  app.decorate('planVersion', async (applicationId, versionLabel) => {
    if (!enabled) return { steps: [] }

    const { entities } = app.platformatic
    const rows = await entities.versionRegistry.find({
      where: {
        applicationId: { eq: applicationId },
        versionLabel: { eq: versionLabel }
      }
    })
    if (rows.length === 0) return null

    const target = rows[0]
    const steps = []

    if (target.status === STATES.ACTIVE) {
      return { steps }
    }

    if (target.status === STATES.EXPIRED) {
      steps.push({
        kind: 'Deployment',
        action: 'scale-up',
        description: `re-provision ${versionLabel} (currently expired) before it can serve`
      })
    }

    steps.push({
      kind: 'HTTPRoute',
      action: 'apply',
      description: `route default traffic to ${versionLabel}`
    })

    const actives = await entities.versionRegistry.find({
      where: {
        applicationId: { eq: applicationId },
        status: { eq: STATES.ACTIVE }
      }
    })
    for (const current of actives) {
      if (current.versionLabel !== versionLabel) {
        steps.push({
          kind: 'HTTPRoute',
          action: 'apply',
          description: `demote ${current.versionLabel} to draining`
        })
      }
    }

    return { steps }
  })

  async function getVersionState (appLabel, tx) {
    const { entities } = app.platformatic

    const versions = await entities.versionRegistry.find({
      where: {
        appLabel: { eq: appLabel },
        status: { in: [STATES.ACTIVE, STATES.DRAINING, STATES.STAGED] }
      },
      tx
    })

    let activeVersion = null
    const drainingVersions = []
    const stagedVersions = []

    for (const v of versions) {
      const ref = {
        versionId: v.versionLabel,
        serviceName: v.serviceName,
        port: v.servicePort
      }
      if (v.status === STATES.ACTIVE) {
        activeVersion = ref
      } else if (v.status === STATES.STAGED) {
        stagedVersions.push(ref)
      } else {
        drainingVersions.push(ref)
      }
    }

    return { activeVersion, drainingVersions, stagedVersions }
  }
}, {
  name: 'version-registry',
  dependencies: ['env']
})

module.exports.STATES = STATES
module.exports.TRANSITIONS = TRANSITIONS
module.exports.isLegalTransition = isLegalTransition
