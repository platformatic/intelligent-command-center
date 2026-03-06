'use strict'

const { APPLICATION_CONTROLLER_NOT_FOUND } = require('../lib/errors')

module.exports = async function (app) {
  app.post('/signals', {
    schema: {
      body: {
        type: 'object',
        properties: {
          applicationId: { type: 'string' },
          runtimeId: { type: 'string' },
          batchStartedAt: { type: 'number' },
          signals: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  options: {
                    type: 'object',
                    additionalProperties: true
                  },
                  workers: {
                    type: 'object',
                    additionalProperties: {
                      type: 'object',
                      properties: {
                        values: {
                          type: 'array',
                          items: {
                            type: 'array',
                            items: { type: 'number' },
                            minItems: 2,
                            maxItems: 2
                          }
                        }
                      },
                      required: ['values']
                    }
                  }
                },
                required: ['options', 'workers']
              }
            }
          }
        },
        required: ['applicationId', 'runtimeId', 'signals']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            alerts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  serviceId: { type: 'string' },
                  workerId: { type: 'string' },
                  alertId: { type: 'string' }
                },
                required: ['serviceId', 'workerId', 'alertId']
              }
            }
          }
        }
      }
    },
    handler: async (req, reply) => {
      const algorithmVersion = req.server.env.PLT_SCALER_ALGORITHM_VERSION

      if (algorithmVersion !== 'v2') {
        return reply.code(400).send({
          error: 'POST /signals is only available with algorithm version v2',
          currentVersion: algorithmVersion
        })
      }

      const k8sContext = req.k8s
      if (!k8sContext) {
        throw new Error('Missing k8s context')
      }

      const podId = k8sContext.pod?.name
      const namespace = k8sContext.namespace

      if (!podId) {
        throw new Error('Missing pod ID from k8s context')
      }

      if (!app.signalScalerExecutor) {
        throw new Error('Signal Scaler executor not initialized')
      }

      const { applicationId, runtimeId, signals, batchStartedAt } = req.body

      const instance = await app.getInstanceByPodId(podId, namespace)
      if (!instance) {
        throw new Error('Instance not found for pod')
      }

      const controller = await app.getControllerByDeploymentId(
        applicationId,
        instance.deploymentId
      )
      if (!controller) {
        throw new APPLICATION_CONTROLLER_NOT_FOUND(applicationId)
      }
      const controllerId = controller.k8SControllerId

      if (controller.scalingDisabled) {
        return { alerts: [] }
      }

      const { alerts } = await app.signalScalerExecutor.processSignals({
        applicationId,
        controllerId,
        podId,
        runtimeId,
        deploymentId: instance.deploymentId,
        signals,
        batchStartedAt
      })

      return { alerts }
    }
  })
}
