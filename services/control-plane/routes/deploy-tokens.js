/// <reference path="../global.d.ts" />

'use strict'

const errors = require('../plugins/errors')

const TOKEN_STATE_ORDER = { active: 0, expired: 1, revoked: 2 }

function deployTokenState (token) {
  if (token.revokedAt) return 'revoked'
  if (token.expiresAt && new Date(token.expiresAt).getTime() < Date.now()) return 'expired'
  return 'active'
}

function ts (value) {
  return value ? new Date(value).getTime() : 0
}

function compareDeployTokens (a, b, sort) {
  switch (sort) {
    case 'name':
      return (a.name || '').localeCompare(b.name || '')
    case 'expiresAt':
      return ts(a.expiresAt) - ts(b.expiresAt)
    case 'lastUsedAt':
      return ts(a.lastUsedAt) - ts(b.lastUsedAt)
    case 'state':
      return (TOKEN_STATE_ORDER[deployTokenState(a)] ?? 9) - (TOKEN_STATE_ORDER[deployTokenState(b)] ?? 9)
    case 'createdAt':
    default:
      return ts(a.createdAt) - ts(b.createdAt)
  }
}

// Sort across every column the UI exposes, including the derived state. State is
// not a DB column, so it cannot be ordered in SQL; sorting the full list here
// keeps it possible while still paginating server-side.
function sortDeployTokens (tokens, sort, order) {
  const dir = order === 'asc' ? 1 : -1
  return [...tokens].sort((a, b) => dir * compareDeployTokens(a, b, sort))
}

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  const tokenObjectSchema = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      applicationId: { type: 'string' },
      name: { type: 'string' },
      createdBy: { type: ['string', 'null'] },
      expiresAt: { type: ['string', 'null'] },
      revokedAt: { type: ['string', 'null'] },
      lastUsedAt: { type: ['string', 'null'] },
      createdAt: { type: ['string', 'null'] }
    },
    additionalProperties: false
  }

  // Issue a deploy token. The plaintext token is returned once and never again.
  app.post('/applications/:id/deploy-tokens', {
    logLevel: 'info',
    schema: {
      operationId: 'createDeployToken',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          expiresAt: { type: ['string', 'null'] }
        },
        required: ['name'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            deployToken: tokenObjectSchema
          },
          required: ['token', 'deployToken'],
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

      const { token, record } = await app.issueDeployToken(applicationId, {
        name: req.body.name,
        expiresAt: req.body.expiresAt ?? null
      }, ctx)

      return { token, deployToken: record }
    }
  })

  app.get('/applications/:id/deploy-tokens', {
    logLevel: 'info',
    schema: {
      operationId: 'listDeployTokens',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1 },
          offset: { type: 'integer', minimum: 0 },
          sort: { type: 'string', enum: ['name', 'createdAt', 'expiresAt', 'lastUsedAt', 'state'] },
          order: { type: 'string', enum: ['asc', 'desc'] }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            deployTokens: { type: 'array', items: tokenObjectSchema },
            totalCount: { type: 'integer' }
          },
          required: ['deployTokens', 'totalCount'],
          additionalProperties: false
        }
      }
    },
    handler: async (req) => {
      const applicationId = req.params.id
      const { limit, offset, sort = 'createdAt', order = 'desc' } = req.query

      const application = await app.getApplicationById(applicationId)
      if (application === null) {
        throw new errors.ApplicationNotFound(applicationId)
      }

      const all = sortDeployTokens(await app.listDeployTokens(applicationId), sort, order)

      // Server-side pagination: the client receives a single page.
      if (limit !== undefined) {
        const start = offset ?? 0
        return { deployTokens: all.slice(start, start + limit), totalCount: all.length }
      }

      return { deployTokens: all, totalCount: all.length }
    }
  })

  app.delete('/applications/:id/deploy-tokens/:tokenId', {
    logLevel: 'info',
    schema: {
      operationId: 'revokeDeployToken',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tokenId: { type: 'string' }
        },
        required: ['id', 'tokenId']
      },
      response: {
        200: {
          type: 'object',
          properties: { revoked: { type: 'boolean' } },
          required: ['revoked'],
          additionalProperties: false
        }
      }
    },
    handler: async (req) => {
      const { id: applicationId, tokenId } = req.params
      const logger = req.log.child({ applicationId, tokenId })
      const ctx = { req, logger }

      const application = await app.getApplicationById(applicationId)
      if (application === null) {
        throw new errors.ApplicationNotFound(applicationId)
      }

      const result = await app.revokeDeployToken(applicationId, tokenId, ctx)
      if (!result.revoked) {
        throw new errors.DeployTokenNotFound(tokenId, applicationId)
      }
      return result
    }
  })

  // Internal endpoint: the `main` gateway calls this to authenticate a CI's
  // deploy token before proxying the request. Not for direct external use.
  app.post('/deploy-tokens/verify', {
    logLevel: 'info',
    schema: {
      operationId: 'verifyDeployToken',
      body: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          method: { type: 'string' },
          path: { type: 'string' }
        },
        required: ['token', 'method', 'path'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            authorized: { type: 'boolean' },
            reason: { type: 'string' },
            principal: {
              type: ['object', 'null'],
              properties: {
                type: { type: 'string' },
                id: { type: 'string' },
                name: { type: 'string' },
                applicationId: { type: 'string' }
              },
              additionalProperties: false
            }
          },
          required: ['authorized'],
          additionalProperties: false
        }
      }
    },
    handler: async (req) => {
      const { token, method, path } = req.body
      return app.verifyDeployToken(token, method, path)
    }
  })
}
