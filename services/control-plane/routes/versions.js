/// <reference path="../global.d.ts" />

'use strict'

const errors = require('../plugins/errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
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
            enum: ['active', 'draining', 'expired']
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            versions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  deploymentId: { type: 'string' },
                  appLabel: { type: 'string' },
                  versionLabel: { type: 'string' },
                  k8SDeploymentName: { type: 'string' },
                  serviceName: { type: 'string' },
                  servicePort: { type: 'number' },
                  namespace: { type: 'string' },
                  pathPrefix: { type: 'string' },
                  hostname: { type: ['string', 'null'] },
                  status: { type: 'string' },
                  createdAt: { type: ['string', 'null'] },
                  expiredAt: { type: ['string', 'null'] }
                },
                additionalProperties: false
              }
            }
          },
          required: ['versions'],
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

      const versions = await app.listVersions(applicationId, req.query.status)
      return { versions }
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
          required: ['expired', 'activeVersion', 'drainingVersions'],
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

      if (version.status !== 'draining') {
        throw new errors.VersionNotDraining(versionLabel, version.status)
      }

      const result = await app.expireAndCleanup(version, ctx)
      return result
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
                autoCleanup: { type: ['boolean', 'null'] }
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
                autoCleanup: { type: 'boolean' }
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
              autoCleanup: overrides.autoCleanup ?? null
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
          autoCleanup: { type: ['boolean', 'null'] }
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
                autoCleanup: { type: ['boolean', 'null'] }
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
                autoCleanup: { type: 'boolean' }
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

      const saved = await app.saveSkewPolicy(applicationId, req.body)
      const resolved = await app.resolveSkewPolicy(applicationId)

      return {
        overrides: {
          httpGracePeriodMs: saved.httpGracePeriodMs ?? null,
          httpMaxAliveMs: saved.httpMaxAliveMs ?? null,
          workflowGracePeriodMs: saved.workflowGracePeriodMs ?? null,
          workflowMaxAliveMs: saved.workflowMaxAliveMs ?? null,
          maxAgeS: saved.maxAgeS ?? null,
          maxVersions: saved.maxVersions ?? null,
          cookieName: saved.cookieName ?? null,
          autoCleanup: saved.autoCleanup ?? null
        },
        resolved
      }
    }
  })
}
