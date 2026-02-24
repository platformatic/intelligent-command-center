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

      const result = await app.expireVersion(version.appLabel, versionLabel, ctx)

      if (result.expired && app.applyHTTPRoute) {
        // Find active version for routing fields
        const activeVersionRecord = versions.find(v => v.status === 'active')
        if (activeVersionRecord) {
          await app.applyHTTPRoute({
            appName: activeVersionRecord.appLabel,
            namespace: activeVersionRecord.namespace,
            pathPrefix: activeVersionRecord.pathPrefix,
            hostname: activeVersionRecord.hostname || null,
            productionVersion: result.activeVersion,
            drainingVersions: result.drainingVersions
          }, ctx)
        }
      }

      return result
    }
  })
}
