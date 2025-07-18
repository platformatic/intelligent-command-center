'use strict'

const fp = require('fastify-plugin')
const errors = require('../plugins/errors')

module.exports = fp(async function (app) {
  const isCacheEnabled = app.env.PLT_FEATURE_CACHE

  app.addSchema({
    $id: 'client-cache-entry',
    type: 'object',
    properties: {
      applicationId: { type: 'string' },
      kind: { type: 'string' },
      id: { type: 'string' },
      origin: { type: 'string' },
      path: { type: 'string' },
      method: { type: 'string' },
      headers: {
        type: 'object',
        additionalProperties: true
      },
      cacheTags: {
        type: 'array',
        items: { type: 'string' }
      },
      statusCode: { type: 'number' },
      cachedAt: { type: 'number' },
      deleteAt: { type: 'number' }
    },
    additionalProperties: false
  })

  app.addSchema({
    $id: 'server-cache-entry',
    type: 'object',
    properties: {
      kind: { type: 'string' },
      id: { type: 'string' },
      route: { type: 'string' },
      serviceId: { type: 'string' },
      statusCode: { type: 'number' },
      headers: {
        type: 'object',
        additionalProperties: true
      },
      cachedAt: { type: 'number' },
      deleteAt: { type: 'number' }
    },
    additionalProperties: false
  })

  app.get('/applications/:applicationId/http-cache', {
    schema: {
      operationId: 'getApplicationCache',
      params: {
        type: 'object',
        properties: {
          applicationId: { type: 'string' }
        },
        required: ['applicationId'],
        additionalProperties: false
      },
      query: {
        type: 'object',
        properties: {
          search: { type: 'string' },
          offset: { type: 'integer', minimum: 0, default: 0 },
          limit: { type: 'integer', minimum: 1, maximum: 1000, default: 100 }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            client: { type: 'array', items: { $ref: 'client-cache-entry' } },
            server: { type: 'array', items: { $ref: 'server-cache-entry' } }
          },
          additionalProperties: false,
          required: ['client', 'server']
        }
      }
    },
    handler: async (req, reply) => {
      if (!isCacheEnabled) {
        throw errors.CacheNotEnabled()
      }

      const { applicationId } = req.params
      const { search, limit, offset } = req.query

      const logger = req.log.child({ applicationId })
      const entries = await app.getCacheEntries(
        applicationId,
        { search, limit, offset },
        { req, logger }
      )
      return entries
    }
  })

  app.get('/applications/:applicationId/http-cache/:id', {
    schema: {
      operationId: 'getApplicationCacheEntry',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          applicationId: { type: 'string' }
        },
        required: ['applicationId', 'id'],
        additionalProperties: false
      },
      query: {
        type: 'object',
        properties: {
          kind: { type: 'string', default: 'HTTP_CACHE' }
        }
      }
    },
    handler: async (req, reply) => {
      if (!isCacheEnabled) {
        throw errors.CacheNotEnabled()
      }

      const { applicationId, id: entryId } = req.params
      const { kind } = req.query

      const logger = req.log.child({ applicationId, id: entryId })
      const entryValue = await app.getCacheEntryValue(
        applicationId,
        kind,
        entryId,
        { req, logger }
      )

      return entryValue
    }
  })

  app.get('/applications/:applicationId/http-cache/:id/dependents', {
    schema: {
      operationId: 'getDependentHttpEntries',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          applicationId: { type: 'string' }
        },
        required: ['applicationId', 'id'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            dependents: {
              type: 'array',
              items: { $ref: 'client-cache-entry' }
            }
          },
          additionalProperties: false,
          required: ['dependents']
        }
      }
    },
    handler: async (req) => {
      if (!isCacheEnabled) {
        throw errors.CacheNotEnabled()
      }

      const { applicationId, id: entryId } = req.params

      const logger = req.log.child({ applicationId, id: entryId })
      const dependents = await app.getDependentEntries(
        applicationId,
        entryId,
        { req, logger }
      )
      return { dependents }
    }
  })

  app.post('/applications/:applicationId/http-cache/invalidate', {
    schema: {
      operationId: 'invalidateApplicationCache',
      params: {
        type: 'object',
        properties: {
          applicationId: { type: 'string' }
        },
        required: ['applicationId'],
        additionalProperties: false
      },
      body: {
        type: 'object',
        properties: {
          httpCacheIds: {
            type: 'array',
            items: { type: 'string' }
          },
          nextCacheIds: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        additionalProperties: false
      }
    },
    handler: async (req, reply) => {
      if (!isCacheEnabled) {
        throw errors.CacheNotEnabled()
      }

      const { applicationId } = req.params
      const { httpCacheIds, nextCacheIds } = req.body
      const logger = req.log.child({ applicationId })
      const entryValue = await app.invalidateCache(
        applicationId,
        {
          httpCacheIds: httpCacheIds || [],
          nextCacheIds: nextCacheIds || []
        },
        { req, logger }
      )

      return entryValue
    }
  })
}, {
  name: 'cache-routes',
  dependencies: ['env']
})
