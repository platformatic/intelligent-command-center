'use strict'

const fp = require('fastify-plugin')

const SYSTEM_ACTOR = { type: 'system', id: null, name: 'system' }

/**
 * Resolve the actor (principal) responsible for a transition. The key gap
 * closed here is that background jobs are no longer anonymous "system":
 * each caller can pass an explicit principal with a reason.
 *
 * Priority: explicit record override > ctx.actor (set by routes/jobs) >
 * authenticated user on the request > generic system.
 */
function resolveActor (ctx, override) {
  const candidate = override ?? ctx?.actor
  if (candidate) {
    return {
      type: candidate.type || 'system',
      id: candidate.id ?? null,
      name: candidate.name ?? 'system'
    }
  }
  const user = ctx?.req?.user
  if (user) {
    // An impersonal deploy-token principal injected by the gateway after token
    // verification. Its name is the token's immutable label.
    if (user.type === 'deploy-token') {
      return { type: 'deploy-token', id: user.id != null ? String(user.id) : null, name: user.name ?? 'deploy-token' }
    }
    if (user.id !== undefined && user.username !== undefined) {
      return { type: 'user', id: String(user.id), name: user.username }
    }
  }
  return { ...SYSTEM_ACTOR }
}

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  const enabled = app.env.PLT_FEATURE_SKEW_PROTECTION
  if (!enabled) return

  app.decorate('resolveActor', resolveActor)

  /**
   * Append a structured audit entry for a version/routing transition.
   * Never throws: auditing must not break the lifecycle operation it records.
   *
   * @param {object} record
   * @param {string} record.applicationId
   * @param {string} [record.versionLabel]
   * @param {string} record.event - registered|staged|approved|promoted|confirmed|rejected|drained|expired|routing-update|recommendation
   * @param {string} [record.fromState]
   * @param {string} [record.toState]
   * @param {string} [record.reason] - manual|traffic-zero|max-alive|maxVersions|redeploy|versioning-disabled|...
   * @param {object} [record.detail] - structured before/after (e.g. routing diff)
   * @param {object} [record.actor] - explicit principal override
   * @param {object} ctx
   * @param {object} [tx] - record inside the caller's transaction when given
   */
  app.decorate('recordVersionAudit', async (record, ctx, tx) => {
    const { entities } = app.platformatic
    const actor = resolveActor(ctx, record.actor)
    try {
      await entities.versionAudit.save({
        input: {
          applicationId: record.applicationId,
          versionLabel: record.versionLabel ?? null,
          event: record.event,
          fromState: record.fromState ?? null,
          toState: record.toState ?? null,
          actorType: actor.type,
          actorId: actor.id,
          actorName: actor.name,
          reason: record.reason ?? null,
          detail: record.detail ?? null
        },
        tx
      })
    } catch (err) {
      ctx?.logger?.error({ err, event: record.event }, 'failed to record version audit')
    }
  })

  app.decorate('getVersionAudit', async (applicationId, versionLabel) => {
    const { entities } = app.platformatic
    const where = { applicationId: { eq: applicationId } }
    if (versionLabel) where.versionLabel = { eq: versionLabel }
    return entities.versionAudit.find({
      where,
      orderBy: [{ field: 'createdAt', direction: 'asc' }]
    })
  })
}, {
  name: 'version-audit',
  dependencies: ['env']
})

module.exports.resolveActor = resolveActor
