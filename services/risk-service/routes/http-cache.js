'use strict'

const fp = require('fastify-plugin')

async function plugin (fastify) {
  fastify.get('/http-cache/:id/traces', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            services: { type: 'array', items: { type: 'string' } },
            requests: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  sourceTelemetryId: { type: 'string' },
                  targetTelemetryId: { type: 'string' },
                  method: { type: 'string' },
                  path: { type: 'string' },
                  httpCacheId: { type: 'string', nullable: true }
                },
                required: [
                  'sourceTelemetryId',
                  'targetTelemetryId',
                  'method',
                  'path',
                  'httpCacheId'
                ],
                additionalProperties: false
              }
            }
          },
          additionalProperties: false,
          required: ['services', 'requests']
        }
      }
    },
    handler: async (request) => {
      const { id } = request.params
      const { store } = fastify

      const cachedPaths = await store.getCachePathsByCacheId(id)
      const cacheEntryGraphs = convertCachedPathsToGraphs(cachedPaths)

      return cacheEntryGraphs
    }
  })
}

function convertCachedPathsToGraphs (cachedPaths) {
  const services = []
  const requests = []

  for (const tracePaths of cachedPaths) {
    for (const tracePath of tracePaths) {
      let sourceTelemetryId = 'X'
      let sourceHttpCacheId = null

      for (const { operation, httpCacheId } of tracePath) {
        const [telemetryId, operationName] = operation.split('|')
        const [method, path] = operationName.split('://', 2)[1].split('/', 2)

        if (!services.includes(telemetryId)) {
          services.push(telemetryId)
        }

        const request = {
          sourceTelemetryId,
          targetTelemetryId: telemetryId,
          method,
          path: `/${path}`,
          httpCacheId: sourceHttpCacheId
        }
        requests.push(request)

        sourceTelemetryId = telemetryId
        sourceHttpCacheId = httpCacheId
      }
    }
  }

  return { services, requests }
}

module.exports = fp(plugin, {
  name: 'http-cache-api',
  dependencies: ['store']
})
