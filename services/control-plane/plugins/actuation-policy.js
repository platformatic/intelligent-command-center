'use strict'

const fp = require('fastify-plugin')
const errors = require('./errors')

// The actuation mode governs how ICC handles version *routing* (the gateway
// HTTPRoute), independently of PLT_FEATURE_SKEW_PROTECTION. The deploy API always
// creates the workload; the mode does not gate it -- after a deploy the pod
// registers and ICC observes it, then routes per the mode:
//
//   - observe (default): ICC applies the route itself once a version is live.
//   - advise           : ICC returns the route as a plan; the customer applies it.
//
// The mode is stored in `skew_protection_policies.mode`, but that table (and its
// row) exist independently of the skew feature flag -- only the skew *plugins*
// are gated. This plugin exposes the mode as a skew-independent setting so the
// routing layer and the (skew-gated) skew policy read it from one place.
const MODES = ['observe', 'manage', 'advise']
const DEFAULT_MODE = 'observe'

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  async function findPolicyRow (applicationId) {
    const rows = await app.platformatic.entities.skewProtectionPolicy.find({
      where: { applicationId: { eq: applicationId } }
    })
    return rows.length > 0 ? rows[0] : null
  }

  // Resolve the per-app actuation mode, defaulting to observe. Skew-independent:
  // callable whether or not skew protection is enabled.
  app.decorate('resolveActuationMode', async (applicationId) => {
    const row = await findPolicyRow(applicationId)
    return { mode: row?.mode ?? DEFAULT_MODE }
  })

  // Persist the per-app actuation mode without touching any skew field. Upserts
  // the policy row so the mode is settable with skew protection off (the skew
  // settings PUT writes the same column when skew is on).
  app.decorate('saveActuationMode', async (applicationId, mode) => {
    if (!MODES.includes(mode)) {
      throw new errors.InvalidVersioningMode(mode)
    }
    const { entities } = app.platformatic
    const existing = await findPolicyRow(applicationId)
    const input = {
      applicationId,
      mode,
      updatedAt: new Date().toISOString()
    }
    if (existing) input.id = existing.id
    return entities.skewProtectionPolicy.save({ input })
  })
}, {
  name: 'actuation-policy',
  dependencies: ['env']
})
