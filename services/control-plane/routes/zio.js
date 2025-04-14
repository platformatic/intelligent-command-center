/// <reference path="../global.d.ts" />

'use strict'

const fp = require('fastify-plugin')
const errors = require('../plugins/errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  app.addSchema({
    $id: 'ZioApplicationConfig',
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

  app.post('/zio/pods', {
    schema: {
      operationId: 'initZioInstance',
      body: {
        type: 'object',
        properties: {
          applicationName: { type: 'string' },
          imageId: { type: 'string' },
          podId: { type: 'string' }
        },
        required: ['applicationName', 'imageId', 'podId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            applicationId: { type: 'string' },
            config: { $ref: 'ZioApplicationConfig' },
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
      const { applicationName, imageId, podId } = req.body

      const logger = req.log.child({ applicationName, podId, imageId })
      const ctx = { req, logger }

      const { application, config, httpCache, iccServices } = await app.initZioPod(
        applicationName,
        imageId,
        podId,
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

  app.get('/zio/pods/:id/config', {
    schema: {
      operationId: 'getZioConfig',
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
          fields: { type: 'string', nullable: true }
        },
        additionalProperties: false
      },
      response: {
        200: { $ref: 'ZioApplicationConfig' }
      }
    },
    handler: async (req) => {
      const podId = req.params.id
      const fields = req.query.fields ? JSON.parse(req.query.fields) : null

      const detectedPod = await app.getDetectedPodByPodId(podId)
      if (detectedPod === null) {
        throw new errors.DetectedPodNotFound(podId)
      }

      const logger = req.log.child({
        applicationId: detectedPod.applicationId,
        podId
      })

      const ctx = { req, logger }
      return app.getZioConfig(detectedPod, { fields }, ctx)
    }
  })

  app.post('/zio/pods/:id/status', {
    schema: {
      operationId: 'saveZioStatus',
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

      await app.saveZioStatus(detectedPod, status, ctx)
      return {}
    }
  })

  app.post('/zio/pods/:id/state', {
    logLevel: 'info',
    schema: {
      operationId: 'saveZioState',
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

      await app.saveZioState(detectedPod, { metadata, services }, ctx)
      return {}
    }
  })
})
