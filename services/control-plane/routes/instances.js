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
          applicationName: { type: 'string' },
          apiVersion: { type: 'string', enum: ['v2', 'v3'], default: 'v2' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            applicationId: { type: 'string' },
            applicationName: { type: 'string' },
            deploymentVersion: { type: 'string' },
            config: { $ref: 'applicationInstanceConfig' },
            enableOpenTelemetry: { type: 'boolean' },
            enableSlicerInterceptor: { type: 'boolean' },
            enableTrafficInterceptor: { type: 'boolean' },
            httpCache: {
              type: 'object',
              properties: {
                clientOpts: {
                  type: 'object',
                  nullable: true,
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
            },
            scaler: {
              type: 'object',
              properties: {
                version: { type: 'string', enum: ['v1', 'v2'] }
              },
              required: ['version'],
              additionalProperties: false
            }
          },
          required: [
            'applicationId',
            'applicationName',
            'config',
            'httpCache',
            'iccServices'
          ],
          additionalProperties: false
        }
      }
    },
    handler: async (req) => {
      const { machineId, namespace } = authMachineRequest(req.params.podId, req.context)
      const { applicationName, apiVersion = 'v2' } = req.body

      const logger = req.log.child({ machineId })
      const ctx = { req, logger }

      const { application, ...instanceConfig } = await app.initApplicationInstance(
        applicationName,
        machineId,
        namespace,
        apiVersion,
        ctx
      )

      return { applicationId: application.id, applicationName: application.name, ...instanceConfig }
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
      const { machineId, namespace } = authMachineRequest(req.params.id, req.context)

      const instance = await app.getInstanceByMachineId(machineId, namespace)
      if (instance === null) {
        throw new errors.InstanceNotFound(machineId)
      }

      const { status } = req.body

      const logger = req.log.child({
        applicationId: instance.applicationId,
        machineId
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
      const { machineId, namespace } = authMachineRequest(req.params.id, req.context)

      const instance = await app.getInstanceByMachineId(machineId, namespace)
      if (instance === null) {
        throw new errors.InstanceNotFound(machineId)
      }

      const { metadata, services } = req.body

      const logger = req.log.child({
        applicationId: instance.applicationId,
        machineId
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

  function authMachineRequest (machineId, machineCtx) {
    if (!machineCtx) {
      throw new errors.MissingMachineAuthContext(machineId)
    }

    const authMachineId = machineCtx.machineId
    if (!authMachineId || machineId !== authMachineId) {
      throw new errors.MachineIdNotAuthorized(machineId, authMachineId)
    }

    const namespace = machineCtx.namespace
    if (!namespace) {
      throw new errors.MachineNamespaceNotFound(machineId)
    }

    return { machineId, namespace }
  }
})
