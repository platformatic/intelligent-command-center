/// <reference path="../global.d.ts" />

'use strict'

const fp = require('fastify-plugin')
const errors = require('../plugins/errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  app.addSchema({
    $id: 'applicationInstanceConfig',
    type: 'object',
    properties: {
      resources: {
        type: 'object',
        properties: {
          threads: { type: 'integer' },
          heap: { type: 'integer' },
          services: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                heap: { type: 'integer' },
                threads: { type: 'integer' }
              },
              additionalProperties: false
            }
          }
        }
      },
      httpCacheConfig: {
        type: 'object',
        nullable: true,
        additionalProperties: true
      }
    }
  })

  app.post('/pods/:podId/instance', {
    logLevel: 'info',
    schema: {
      operationId: 'initApplicationInstance',
      params: {
        type: 'object',
        properties: {
          podId: { type: 'string' }
        },
        required: ['podId']
      },
      body: {
        type: 'object',
        properties: {
          applicationName: { type: 'string' }
        },
        required: ['applicationName']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            applicationId: { type: 'string' },
            config: { $ref: 'applicationInstanceConfig' },
            enableOpenTelemetry: { type: 'boolean' },
            enableSlicerInterceptor: { type: 'boolean' },
            enableTrafficanteInterceptor: { type: 'boolean' },
            httpCache: {
              type: 'object',
              properties: {
                clientOpts: {
                  type: 'object',
                  properties: {
                    host: { type: 'string' },
                    port: { type: 'number' },
                    username: { type: 'string' },
                    password: { type: 'string' },
                    keyPrefix: { type: 'string' }
                  },
                  required: [
                    'host',
                    'port',
                    'username',
                    'password',
                    'keyPrefix'
                  ],
                  additionalProperties: false
                }
              }
            },
            iccServices: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  url: { type: 'string' }
                },
                required: ['url'],
                additionalProperties: false
              }
            }
          },
          required: [
            'applicationId',
            'config',
            'httpCache',
            'iccServices'
          ],
          additionalProperties: false
        }
      }
    },
    handler: async (req) => {
      const { podId, namespace } = authK8sPodRequest(req.params.podId, req.k8s)
      const { applicationName } = req.body

      const logger = req.log.child({ applicationName, podId })
      const ctx = { req, logger }

      const { application, ...instanceConfig } = await app.initApplicationInstance(
        applicationName,
        podId,
        namespace,
        ctx
      )

      return { applicationId: application.id, ...instanceConfig }
    }
  })

  app.post('/pods/:id/instance/status', {
    logLevel: 'info',
    schema: {
      operationId: 'saveApplicationInstanceStatus',
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
          status: { type: 'string' }
        },
        required: ['status'],
        additionalProperties: false
      }
    },
    handler: async (req) => {
      const { podId, namespace } = authK8sPodRequest(req.params.id, req.k8s)

      const instance = await app.getInstanceByPodId(podId, namespace)
      if (instance === null) {
        throw new errors.InstanceNotFound(podId)
      }

      const { status } = req.body

      const logger = req.log.child({
        applicationId: instance.applicationId,
        podId
      })

      const ctx = { req, logger }

      await app.saveApplicationInstanceStatus(instance, status, ctx)
      return {}
    }
  })

  app.post('/pods/:id/instance/state', {
    logLevel: 'info',
    schema: {
      operationId: 'saveApplicationInstanceState',
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
          metadata: {
            type: 'object',
            properties: {
              platformaticVersion: { type: 'string' }
            },
            required: ['platformaticVersion']
          },
          services: { type: 'array', items: { type: 'object' } }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: false
        }
      }
    },
    handler: async (req) => {
      const { podId, namespace } = authK8sPodRequest(req.params.id, req.k8s)

      const instance = await app.getInstanceByPodId(podId, namespace)
      if (instance === null) {
        throw new errors.InstanceNotFound(podId)
      }

      const { metadata, services } = req.body

      const logger = req.log.child({
        applicationId: instance.applicationId,
        podId
      })

      const ctx = { req, logger }

      await app.saveApplicationInstanceState(
        instance,
        { metadata, services },
        ctx
      )
      return {}
    }
  })

  function authK8sPodRequest (podId, k8sContext) {
    if (!k8sContext) {
      throw new errors.MissingK8sAuthContext(podId)
    }

    const jwtPodId = k8sContext.pod?.name
    if (!jwtPodId || podId !== jwtPodId) {
      throw new errors.PodIdNotAuthorized(podId, jwtPodId)
    }

    const namespace = k8sContext.namespace
    if (!namespace) {
      throw new errors.PodNamespaceNotFound(podId)
    }

    return { podId, namespace }
  }
})
