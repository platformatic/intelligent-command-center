/// <reference path="../global.d.ts" />

'use strict'

const errors = require('../plugins/errors')

// Display order for the version manager: the active version first, then incoming
// (pending-apply/staged), then draining, then expired. Within a group the input
// order (newest first, from listVersions) is preserved by the stable sort.
const LIFECYCLE_ORDER = { active: 0, 'pending-apply': 1, staged: 2, draining: 3, 'pending-expire': 4, expired: 5 }

function sortVersionsForDisplay (versions) {
  return [...versions].sort((a, b) =>
    (LIFECYCLE_ORDER[a.status] ?? 9) - (LIFECYCLE_ORDER[b.status] ?? 9)
  )
}

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  const versionObjectSchema = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      applicationId: { type: 'string' },
      deploymentId: { type: ['string', 'null'] },
      appLabel: { type: 'string' },
      versionLabel: { type: 'string' },
      controllerName: { type: 'string' },
      serviceName: { type: 'string' },
      servicePort: { type: 'number' },
      namespace: { type: 'string' },
      pathPrefix: { type: 'string' },
      hostname: { type: ['string', 'null'] },
      status: { type: 'string' },
      mode: { type: ['string', 'null'] },
      plan: { type: ['object', 'null'], additionalProperties: true },
      expirePolicy: { type: 'string' },
      createdAt: { type: ['string', 'null'] },
      drainedAt: { type: ['string', 'null'] },
      expiredAt: { type: ['string', 'null'] }
    },
    additionalProperties: false
  }

  const versionSummarySchema = {
    type: ['object', 'null'],
    properties: {
      versionId: { type: 'string' },
      serviceName: { type: 'string' },
      port: { type: 'number' }
    },
    additionalProperties: false
  }

  const drainingArraySchema = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        versionId: { type: 'string' },
        serviceName: { type: 'string' },
        port: { type: 'number' }
      },
      additionalProperties: false
    }
  }

  // Advise-mode plan: kind/action plus an optional manifest + command. Steps are
  // left loosely typed so the (arbitrary) manifest passes through serialization.
  const planArraySchema = {
    type: 'array',
    items: { type: 'object', additionalProperties: true }
  }

  // Result shape shared by promote/approve/reject: a boolean outcome flag plus
  // the resulting active/draining routing state. In advise mode the action is
  // deferred (`pendingApply: true`) and a `plan` is returned instead of acting.
  function activationResultSchema (flagName) {
    return {
      type: 'object',
      properties: {
        [flagName]: { type: 'boolean' },
        pendingApply: { type: 'boolean' },
        plan: planArraySchema,
        activeVersion: versionSummarySchema,
        drainingVersions: drainingArraySchema
      },
      required: [flagName, 'activeVersion', 'drainingVersions'],
      additionalProperties: false
    }
  }

  app.get('/applications/:id/versions', {
    logLevel: 'info',
    schema: {
      operationId: 'getApplicationVersions',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'staged', 'pending-apply', 'draining', 'expired']
          },
          limit: { type: 'integer', minimum: 1 },
          offset: { type: 'integer', minimum: 0 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            versions: {
              type: 'array',
              items: versionObjectSchema
            },
            totalCount: { type: 'integer' }
          },
          required: ['versions', 'totalCount'],
          additionalProperties: false
        }
      }
    },
    handler: async (req) => {
      const applicationId = req.params.id
      const { status, limit, offset } = req.query

      const application = await app.getApplicationById(applicationId)
      if (application === null) {
        throw new errors.ApplicationNotFound(applicationId)
      }

      const ordered = sortVersionsForDisplay(await app.listVersions(applicationId, status))

      // Server-side pagination: the client receives a single page. Only slice when
      // a limit is requested; other callers (autoscaler, deployment-history
      // enrichment) get the full ordered list.
      if (limit !== undefined) {
        const start = offset ?? 0
        return { versions: ordered.slice(start, start + limit), totalCount: ordered.length }
      }

      return { versions: ordered, totalCount: ordered.length }
    }
  })

  // Per-version request rate for the version manager's traffic-split view.
  // Static `rps` segment resolves ahead of the `:versionLabel` param in
  // find-my-way, mirroring the existing static `expire` route below.
  app.get('/applications/:id/versions/rps', {
    logLevel: 'info',
    schema: {
      operationId: 'getApplicationVersionsRPS',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            rps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  versionLabel: { type: 'string' },
                  status: { type: 'string' },
                  rps: { type: ['number', 'null'] }
                },
                required: ['versionLabel', 'status', 'rps'],
                additionalProperties: false
              }
            }
          },
          required: ['rps'],
          additionalProperties: false
        }
      }
    },
    handler: async (req) => {
      const applicationId = req.params.id

      const application = await app.getApplicationById(applicationId)
      if (application === null) {
        throw new errors.ApplicationNotFound(applicationId)
      }

      // Versions that have a route rule and a running workload can report RPS:
      // active/draining take client traffic, and staged takes preview traffic
      // (a browser pinned via the __plt_dpl cookie or x-deployment-id header).
      // This mirrors the reconciler's routed set. Expired versions have no
      // workload, so they never report traffic.
      const versions = await app.listVersions(applicationId)
      const live = versions.filter(v =>
        v.status === 'active' || v.status === 'draining' || v.status === 'staged')

      const rps = await Promise.all(live.map(async (v) => ({
        versionLabel: v.versionLabel,
        status: v.status,
        // RPS is keyed by the version's workload instance (controllerName), the
        // label kube-state-metrics exposes; the version id is not on the pods.
        rps: app.getVersionRPS ? await app.getVersionRPS(v.controllerName) : null
      })))

      return { rps }
    }
  })

  app.post('/applications/:id/versions/:versionLabel/expire', {
    logLevel: 'info',
    schema: {
      operationId: 'expireApplicationVersion',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          versionLabel: { type: 'string' }
        },
        required: ['id', 'versionLabel']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            expired: { type: 'boolean' },
            pendingExpire: { type: 'boolean' },
            plan: planArraySchema,
            activeVersion: {
              type: ['object', 'null'],
              properties: {
                versionId: { type: 'string' },
                serviceName: { type: 'string' },
                port: { type: 'number' }
              },
              additionalProperties: false
            },
            drainingVersions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  versionId: { type: 'string' },
                  serviceName: { type: 'string' },
                  port: { type: 'number' }
                },
                additionalProperties: false
              }
            }
          },
          required: ['expired'],
          additionalProperties: false
        }
      }
    },
    handler: async (req) => {
      const { id: applicationId, versionLabel } = req.params
      const logger = req.log.child({ applicationId, versionLabel })
      const ctx = { req, logger }

      const application = await app.getApplicationById(applicationId)
      if (application === null) {
        throw new errors.ApplicationNotFound(applicationId)
      }

      // Find the version record to get appLabel
      const versions = await app.listVersions(applicationId)
      const version = versions.find(v => v.versionLabel === versionLabel)
      if (!version) {
        throw new errors.VersionNotFound(versionLabel, applicationId)
      }

      // A version can be expired from a state with a workload to tear down but no
      // sole claim on the default route: draining (superseded) or pending-apply/
      // staged (never promoted). The active version is intentionally NOT expirable
      // -- expiring the sole serving version would leave the gateway with no
      // default backend. It is retired by being superseded (-> draining) first.
      const EXPIRABLE = ['draining', 'pending-apply', 'staged']
      if (!EXPIRABLE.includes(version.status)) {
        throw new errors.VersionNotExpirable(versionLabel, version.status)
      }

      const result = await app.expireAndCleanup(version, ctx)
      return result
    }
  })

  app.get('/applications/:id/versions/:versionLabel', {
    logLevel: 'info',
    schema: {
      operationId: 'getApplicationVersion',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          versionLabel: { type: 'string' }
        },
        required: ['id', 'versionLabel']
      },
      response: {
        200: {
          type: 'object',
          properties: { version: versionObjectSchema },
          required: ['version'],
          additionalProperties: false
        }
      }
    },
    handler: async (req) => {
      const { id: applicationId, versionLabel } = req.params

      const application = await app.getApplicationById(applicationId)
      if (application === null) {
        throw new errors.ApplicationNotFound(applicationId)
      }

      const version = await app.getVersion(applicationId, versionLabel)
      if (!version) {
        throw new errors.VersionNotFound(versionLabel, applicationId)
      }

      return { version }
    }
  })

  app.get('/applications/:id/versions/:versionLabel/plan', {
    logLevel: 'info',
    schema: {
      operationId: 'planApplicationVersion',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          versionLabel: { type: 'string' }
        },
        required: ['id', 'versionLabel']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  kind: { type: 'string' },
                  action: { type: 'string' },
                  description: { type: 'string' }
                },
                additionalProperties: false
              }
            }
          },
          required: ['steps'],
          additionalProperties: false
        }
      }
    },
    handler: async (req) => {
      const { id: applicationId, versionLabel } = req.params

      const application = await app.getApplicationById(applicationId)
      if (application === null) {
        throw new errors.ApplicationNotFound(applicationId)
      }

      const plan = await app.planVersion(applicationId, versionLabel)
      if (plan === null) {
        throw new errors.VersionNotFound(versionLabel, applicationId)
      }

      return plan
    }
  })

  // Read-only actuation plan with command + manifest, chosen by the version's
  // state (draining -> expire plan; pending-apply/staged -> activate plan). This
  // is what the advise-mode UI shows so the customer can apply it themselves; it
  // mutates nothing.
  const actuationPlanResponse = {
    200: {
      type: 'object',
      properties: {
        intent: { type: 'string' },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              kind: { type: 'string' },
              action: { type: 'string' },
              description: { type: ['string', 'null'] },
              command: { type: ['string', 'null'] },
              manifest: { type: ['object', 'null'], additionalProperties: true }
            },
            additionalProperties: true
          }
        }
      },
      required: ['intent', 'steps'],
      additionalProperties: false
    }
  }

  // App from the URL id (app-scoped) or, when there is none, from the deploy-token
  // principal (token-scoped). The token is app-bound, so a CI can fetch the plan
  // without carrying the application UUID.
  async function planVersionActuationHandler (req) {
    const applicationId = req.params.id ?? req.user?.applicationId
    const { versionLabel } = req.params
    if (!applicationId) {
      throw new errors.DeployTokenScopeRequired()
    }
    const logger = req.log.child({ applicationId })
    const ctx = { req, logger }

    const application = await app.getApplicationById(applicationId)
    if (application === null) {
      throw new errors.ApplicationNotFound(applicationId)
    }

    const plan = await app.planVersionActuation(applicationId, versionLabel, ctx)
    if (plan === null) {
      throw new errors.VersionNotFound(versionLabel, applicationId)
    }

    return plan
  }

  app.get('/applications/:id/versions/:versionLabel/actuation-plan', {
    logLevel: 'info',
    schema: {
      operationId: 'planVersionActuation',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          versionLabel: { type: 'string' }
        },
        required: ['id', 'versionLabel']
      },
      response: actuationPlanResponse
    },
    handler: planVersionActuationHandler
  })

  // Token-scoped mirror: no application id in the path; the app comes from the
  // deploy token. Lets a CI fetch the activate/expire plan for an existing
  // version with only the token.
  app.get('/versions/:versionLabel/actuation-plan', {
    logLevel: 'info',
    schema: {
      operationId: 'planVersionActuationScoped',
      params: {
        type: 'object',
        properties: { versionLabel: { type: 'string' } },
        required: ['versionLabel']
      },
      response: actuationPlanResponse
    },
    handler: planVersionActuationHandler
  })

  app.get('/applications/:id/versions/:versionLabel/audit', {
    logLevel: 'info',
    schema: {
      operationId: 'getApplicationVersionAudit',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          versionLabel: { type: 'string' }
        },
        required: ['id', 'versionLabel']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            audit: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  event: { type: 'string' },
                  fromState: { type: ['string', 'null'] },
                  toState: { type: ['string', 'null'] },
                  actorType: { type: 'string' },
                  actorId: { type: ['string', 'null'] },
                  actorName: { type: ['string', 'null'] },
                  reason: { type: ['string', 'null'] },
                  detail: {},
                  createdAt: { type: ['string', 'null'] }
                },
                additionalProperties: false
              }
            }
          },
          required: ['audit'],
          additionalProperties: false
        }
      }
    },
    handler: async (req) => {
      const { id: applicationId, versionLabel } = req.params

      const application = await app.getApplicationById(applicationId)
      if (application === null) {
        throw new errors.ApplicationNotFound(applicationId)
      }

      const audit = app.getVersionAudit
        ? await app.getVersionAudit(applicationId, versionLabel)
        : []
      return { audit }
    }
  })

  app.post('/applications/:id/versions/:versionLabel/promote', {
    logLevel: 'info',
    schema: {
      operationId: 'promoteApplicationVersion',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          versionLabel: { type: 'string' }
        },
        required: ['id', 'versionLabel']
      },
      response: { 200: activationResultSchema('promoted') }
    },
    handler: async (req) => {
      const { id: applicationId, versionLabel } = req.params
      const logger = req.log.child({ applicationId, versionLabel })
      const ctx = { req, logger }

      const application = await app.getApplicationById(applicationId)
      if (application === null) {
        throw new errors.ApplicationNotFound(applicationId)
      }

      const version = await app.getVersion(applicationId, versionLabel)
      if (!version) {
        throw new errors.VersionNotFound(versionLabel, applicationId)
      }

      const result = await app.promoteAndApply(version.appLabel, versionLabel, ctx)
      return {
        promoted: result.promoted,
        pendingApply: result.pendingApply ?? false,
        plan: result.plan ?? [],
        activeVersion: result.activeVersion,
        drainingVersions: result.drainingVersions
      }
    }
  })

  app.post('/applications/:id/versions/:versionLabel/approve', {
    logLevel: 'info',
    schema: {
      operationId: 'approveApplicationVersion',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          versionLabel: { type: 'string' }
        },
        required: ['id', 'versionLabel']
      },
      response: { 200: activationResultSchema('approved') }
    },
    handler: async (req) => {
      const { id: applicationId, versionLabel } = req.params
      const logger = req.log.child({ applicationId, versionLabel })
      const ctx = { req, logger }

      const application = await app.getApplicationById(applicationId)
      if (application === null) {
        throw new errors.ApplicationNotFound(applicationId)
      }

      const version = await app.getVersion(applicationId, versionLabel)
      if (!version) {
        throw new errors.VersionNotFound(versionLabel, applicationId)
      }

      const result = await app.approveAndApply(version.appLabel, versionLabel, ctx)
      return {
        approved: result.approved,
        pendingApply: result.pendingApply ?? false,
        plan: result.plan ?? [],
        activeVersion: result.activeVersion,
        drainingVersions: result.drainingVersions
      }
    }
  })

  app.post('/applications/:id/versions/:versionLabel/reject', {
    logLevel: 'info',
    schema: {
      operationId: 'rejectApplicationVersion',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          versionLabel: { type: 'string' }
        },
        required: ['id', 'versionLabel']
      },
      response: { 200: activationResultSchema('rejected') }
    },
    handler: async (req) => {
      const { id: applicationId, versionLabel } = req.params
      const logger = req.log.child({ applicationId, versionLabel })
      const ctx = { req, logger }

      const application = await app.getApplicationById(applicationId)
      if (application === null) {
        throw new errors.ApplicationNotFound(applicationId)
      }

      const version = await app.getVersion(applicationId, versionLabel)
      if (!version) {
        throw new errors.VersionNotFound(versionLabel, applicationId)
      }

      const result = await app.rejectAndCleanup(version.appLabel, versionLabel, ctx)
      return {
        rejected: result.rejected,
        pendingApply: result.pendingApply ?? false,
        plan: result.plan ?? [],
        activeVersion: result.activeVersion,
        drainingVersions: result.drainingVersions
      }
    }
  })

  app.post('/applications/:id/versions/expire', {
    logLevel: 'info',
    schema: {
      operationId: 'bulkExpireApplicationVersions',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          versionLabels: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1
          }
        },
        required: ['versionLabels'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            expired: {
              type: 'array',
              items: { type: 'string' }
            },
            skipped: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  versionLabel: { type: 'string' },
                  reason: { type: 'string' }
                },
                additionalProperties: false
              }
            }
          },
          required: ['expired', 'skipped'],
          additionalProperties: false
        }
      }
    },
    handler: async (req) => {
      const applicationId = req.params.id
      const { versionLabels } = req.body
      const logger = req.log.child({ applicationId })
      const ctx = { req, logger }

      const application = await app.getApplicationById(applicationId)
      if (application === null) {
        throw new errors.ApplicationNotFound(applicationId)
      }

      const versions = await app.listVersions(applicationId)

      // Validate up front: the active version cannot be expired.
      // Fail the whole batch rather than partially applying.
      for (const label of versionLabels) {
        const version = versions.find(v => v.versionLabel === label)
        if (version && version.status === 'active') {
          throw new errors.CannotExpireActiveVersion(label)
        }
      }

      const expired = []
      const skipped = []

      for (const label of versionLabels) {
        const version = versions.find(v => v.versionLabel === label)
        if (!version) {
          skipped.push({ versionLabel: label, reason: 'not-found' })
          continue
        }
        if (version.status !== 'draining') {
          skipped.push({ versionLabel: label, reason: version.status })
          continue
        }
        const result = await app.expireAndCleanup(version, ctx)
        if (result.expired) {
          expired.push(label)
        } else {
          skipped.push({ versionLabel: label, reason: 'not-expired' })
        }
      }

      return { expired, skipped }
    }
  })

  if (!app.resolveSkewPolicy) return

  app.get('/applications/:id/skew-protection/policy', {
    logLevel: 'info',
    schema: {
      operationId: 'getSkewProtectionPolicy',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            overrides: {
              type: ['object', 'null'],
              properties: {
                httpGracePeriodMs: { type: ['integer', 'null'] },
                httpMaxAliveMs: { type: ['integer', 'null'] },
                workflowGracePeriodMs: { type: ['integer', 'null'] },
                workflowMaxAliveMs: { type: ['integer', 'null'] },
                maxAgeS: { type: ['integer', 'null'] },
                maxVersions: { type: ['integer', 'null'] },
                cookieName: { type: ['string', 'null'] },
                autoCleanup: { type: ['boolean', 'null'] },
                enabled: { type: ['boolean', 'null'] },
                mode: { type: ['string', 'null'] },
                requiresApproval: { type: ['boolean', 'null'] }
              },
              additionalProperties: false
            },
            resolved: {
              type: 'object',
              properties: {
                httpGracePeriodMs: { type: 'integer' },
                httpMaxAliveMs: { type: 'integer' },
                workflowGracePeriodMs: { type: 'integer' },
                workflowMaxAliveMs: { type: 'integer' },
                maxAgeS: { type: 'integer' },
                maxVersions: { type: ['integer', 'null'] },
                cookieName: { type: 'string' },
                autoCleanup: { type: 'boolean' },
                enabled: { type: 'boolean' },
                mode: { type: 'string' },
                requiresApproval: { type: 'boolean' }
              },
              additionalProperties: false
            }
          },
          required: ['overrides', 'resolved'],
          additionalProperties: false
        }
      }
    },
    handler: async (req) => {
      const applicationId = req.params.id

      const application = await app.getApplicationById(applicationId)
      if (application === null) {
        throw new errors.ApplicationNotFound(applicationId)
      }

      const overrides = await app.getSkewPolicyOverrides(applicationId)
      const resolved = await app.resolveSkewPolicy(applicationId)

      return {
        overrides: overrides
          ? {
              httpGracePeriodMs: overrides.httpGracePeriodMs ?? null,
              httpMaxAliveMs: overrides.httpMaxAliveMs ?? null,
              workflowGracePeriodMs: overrides.workflowGracePeriodMs ?? null,
              workflowMaxAliveMs: overrides.workflowMaxAliveMs ?? null,
              maxAgeS: overrides.maxAgeS ?? null,
              maxVersions: overrides.maxVersions ?? null,
              cookieName: overrides.cookieName ?? null,
              autoCleanup: overrides.autoCleanup ?? null,
              enabled: overrides.enabled ?? null,
              mode: overrides.mode ?? null,
              requiresApproval: overrides.requiresApproval ?? null
            }
          : null,
        resolved
      }
    }
  })

  app.put('/applications/:id/skew-protection/policy', {
    logLevel: 'info',
    schema: {
      operationId: 'putSkewProtectionPolicy',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          httpGracePeriodMs: { type: ['integer', 'null'] },
          httpMaxAliveMs: { type: ['integer', 'null'] },
          workflowGracePeriodMs: { type: ['integer', 'null'] },
          workflowMaxAliveMs: { type: ['integer', 'null'] },
          maxAgeS: { type: ['integer', 'null'] },
          maxVersions: { type: ['integer', 'null'] },
          cookieName: { type: ['string', 'null'] },
          autoCleanup: { type: ['boolean', 'null'] },
          enabled: { type: ['boolean', 'null'] },
          mode: { type: ['string', 'null'], enum: ['observe', 'manage', 'advise', null] },
          requiresApproval: { type: ['boolean', 'null'] }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            overrides: {
              type: ['object', 'null'],
              properties: {
                httpGracePeriodMs: { type: ['integer', 'null'] },
                httpMaxAliveMs: { type: ['integer', 'null'] },
                workflowGracePeriodMs: { type: ['integer', 'null'] },
                workflowMaxAliveMs: { type: ['integer', 'null'] },
                maxAgeS: { type: ['integer', 'null'] },
                maxVersions: { type: ['integer', 'null'] },
                cookieName: { type: ['string', 'null'] },
                autoCleanup: { type: ['boolean', 'null'] },
                enabled: { type: ['boolean', 'null'] },
                mode: { type: ['string', 'null'] },
                requiresApproval: { type: ['boolean', 'null'] }
              },
              additionalProperties: false
            },
            resolved: {
              type: 'object',
              properties: {
                httpGracePeriodMs: { type: 'integer' },
                httpMaxAliveMs: { type: 'integer' },
                workflowGracePeriodMs: { type: 'integer' },
                workflowMaxAliveMs: { type: 'integer' },
                maxAgeS: { type: 'integer' },
                maxVersions: { type: ['integer', 'null'] },
                cookieName: { type: 'string' },
                autoCleanup: { type: 'boolean' },
                enabled: { type: 'boolean' },
                mode: { type: 'string' },
                requiresApproval: { type: 'boolean' }
              },
              additionalProperties: false
            }
          },
          required: ['overrides', 'resolved'],
          additionalProperties: false
        }
      }
    },
    handler: async (req) => {
      const applicationId = req.params.id
      const logger = req.log.child({ applicationId })
      const ctx = { req, logger }

      const application = await app.getApplicationById(applicationId)
      if (application === null) {
        throw new errors.ApplicationNotFound(applicationId)
      }

      const wasEnabled = (await app.resolveSkewPolicy(applicationId)).enabled
      const saved = await app.saveSkewPolicy(applicationId, req.body)
      const resolved = await app.resolveSkewPolicy(applicationId)

      // Disable transition: enabled flipped true -> false, collapse to
      // a single active version by force-expiring draining versions.
      if (wasEnabled && !resolved.enabled && app.applyVersioningDisable) {
        await app.applyVersioningDisable(applicationId, ctx)
      }

      return {
        overrides: {
          httpGracePeriodMs: saved.httpGracePeriodMs ?? null,
          httpMaxAliveMs: saved.httpMaxAliveMs ?? null,
          workflowGracePeriodMs: saved.workflowGracePeriodMs ?? null,
          workflowMaxAliveMs: saved.workflowMaxAliveMs ?? null,
          maxAgeS: saved.maxAgeS ?? null,
          maxVersions: saved.maxVersions ?? null,
          cookieName: saved.cookieName ?? null,
          autoCleanup: saved.autoCleanup ?? null,
          enabled: saved.enabled ?? null,
          mode: saved.mode ?? null,
          requiresApproval: saved.requiresApproval ?? null
        },
        resolved
      }
    }
  })
}
