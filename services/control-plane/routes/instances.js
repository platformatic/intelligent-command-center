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
      version: { type: 'integer' },
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
      }
    },
    required: ['version']
  })

  app.post('/pods/:podId/instance', {
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
      const { podId } = req.params
      const { applicationName } = req.body

      const logger = req.log.child({ applicationName, podId })
      const ctx = { req, logger }

      // TODO: get pod namespace from a jwt
      const podNamespace = 'platformatic'

      const { application, config, httpCache, iccServices } = await app.initApplicationInstance(
        applicationName,
        podId,
        podNamespace,
        ctx
      )

      return {
        applicationId: application.id,
        config,
        httpCache,
        iccServices
      }
    }
  })

  app.post('/pods/:id/instance/status', {
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
      const podId = req.params.id

      const detectedPod = await app.getDetectedPodByPodId(podId)
      if (detectedPod === null) {
        throw new errors.DetectedPodNotFound(podId)
      }

      const { status } = req.body

      const logger = req.log.child({
        applicationId: detectedPod.applicationId,
        podId
      })

      const ctx = { req, logger }

      await app.saveApplicationInstanceStatus(detectedPod, status, ctx)
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
      const podId = req.params.id

      const detectedPod = await app.getDetectedPodByPodId(podId)
      if (detectedPod === null) {
        throw new errors.DetectedPodNotFound(podId)
      }

      const { metadata, services } = req.body

      const logger = req.log.child({
        applicationId: detectedPod.applicationId,
        podId
      })

      const ctx = { req, logger }

      await app.saveApplicationInstanceState(
        detectedPod,
        { metadata, services },
        ctx
      )
      return {}
    }
  })
})
