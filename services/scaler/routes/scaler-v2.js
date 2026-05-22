'use strict'

const errors = require('../lib/errors')

const countStepEvent = {
  type: 'object',
  properties: {
    timestamp: { type: 'integer' },
    count: { type: 'integer', minimum: 0 }
  },
  required: ['timestamp', 'count'],
  additionalProperties: false
}

const metricSnapshotSchema = {
  type: 'object',
  properties: {
    history: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          timestamp: { type: 'integer' },
          avg: { type: 'number' },
          // Debug fields, present only when PLT_SCALER_DASHBOARD_API_ENABLED=true.
          stableSum: { type: 'number' },
          stablePodsCount: { type: 'number' },
          smoothedSum: { type: 'number' }
        },
        required: ['timestamp', 'avg'],
        additionalProperties: false
      }
    },
    prediction: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          timestamp: { type: 'integer' },
          avg: { type: 'number' }
        },
        required: ['timestamp', 'avg'],
        additionalProperties: false
      }
    },
    now: { type: 'integer' },
    initTimeoutMs: { type: 'integer' },
    horizonMs: { type: 'integer' },
    threshold: { type: 'number' },
    trendDirection: { type: 'string', enum: ['up', 'horizontal', 'down'] }
  },
  required: ['history', 'prediction', 'now', 'initTimeoutMs', 'horizonMs', 'threshold', 'trendDirection'],
  additionalProperties: false
}

module.exports = async function (app) {
  const algorithmVersion = app.env.PLT_SCALER_ALGORITHM_VERSION
  if (algorithmVersion !== 'v2') return

  app.get('/api/v2/application/:appId/count', {
    schema: {
      params: {
        type: 'object',
        properties: {
          appId: { type: 'string', format: 'uuid' }
        },
        required: ['appId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            now: { type: 'integer' },
            initTimeoutMs: { type: 'integer' },
            horizonMs: { type: 'integer' },
            minPods: { type: 'integer', minimum: 0 },
            maxPods: { type: 'integer', minimum: 0 },
            history: { type: 'array', items: countStepEvent },
            prediction: { type: 'array', items: countStepEvent }
          },
          required: [
            'now', 'initTimeoutMs', 'horizonMs', 'minPods', 'maxPods', 'history', 'prediction'
          ],
          additionalProperties: false
        }
      }
    },
    handler: async (req, reply) => {
      const controller = await app.getApplicationController(req.params.appId)
      if (!controller) {
        throw new errors.APPLICATION_CONTROLLER_NOT_FOUND(req.params.appId)
      }

      const snapshot = await app.signalScalerExecutor.predictor.getAppCountSnapshot(
        req.params.appId,
        controller.controllerId
      )
      if (snapshot === null) {
        reply.code(404)
        return { error: 'not found' }
      }
      return snapshot
    }
  })

  app.get('/api/v2/application/:appId/services', {
    schema: {
      params: {
        type: 'object',
        properties: {
          appId: { type: 'string', format: 'uuid' }
        },
        required: ['appId']
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              elu: {
                type: 'object',
                properties: {
                  current: { type: 'number' },
                  predicted: { type: 'number' },
                  threshold: { type: 'number' },
                  overloaded: { type: 'boolean' }
                },
                required: ['current', 'predicted', 'threshold', 'overloaded'],
                additionalProperties: false
              },
              heap: {
                type: 'object',
                properties: {
                  current: { type: 'number' },
                  predicted: { type: 'number' },
                  threshold: { type: 'number' },
                  overloaded: { type: 'boolean' }
                },
                required: ['current', 'predicted', 'threshold', 'overloaded'],
                additionalProperties: false
              }
            },
            required: ['id'],
            additionalProperties: false
          }
        }
      }
    },
    handler: async (req) => {
      const controller = await app.getApplicationController(req.params.appId)
      if (!controller) {
        throw new errors.APPLICATION_CONTROLLER_NOT_FOUND(req.params.appId)
      }

      const summary = await app.signalScalerExecutor.predictor.getAppServicesSummary(
        req.params.appId,
        controller.controllerId
      )
      return summary ?? []
    }
  })

  app.get('/api/v2/application/:appId/services/elu', {
    schema: {
      params: {
        type: 'object',
        properties: {
          appId: { type: 'string', format: 'uuid' }
        },
        required: ['appId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            now: { type: 'integer' },
            services: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  history: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        timestamp: { type: 'integer' },
                        avg: { type: 'number' }
                      },
                      required: ['timestamp', 'avg'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['id', 'history'],
                additionalProperties: false
              }
            }
          },
          required: ['now', 'services'],
          additionalProperties: false
        }
      }
    },
    handler: async (req, reply) => {
      const controller = await app.getApplicationController(req.params.appId)
      if (!controller) {
        throw new errors.APPLICATION_CONTROLLER_NOT_FOUND(req.params.appId)
      }

      const result = await app.signalScalerExecutor.predictor.getAllServicesEluHistory(
        req.params.appId,
        controller.controllerId
      )
      if (result === null) {
        reply.code(404)
        return { error: 'not found' }
      }
      return result
    }
  })

  app.get('/api/v2/application/:appId/service/:serviceId/instances/metrics', {
    schema: {
      params: {
        type: 'object',
        properties: {
          appId: { type: 'string', format: 'uuid' },
          serviceId: { type: 'string', minLength: 1 }
        },
        required: ['appId', 'serviceId']
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              podId: { type: 'string' },
              startedAt: { type: 'integer' },
              overloaded: { type: 'boolean' },
              elu: {
                type: 'object',
                properties: {
                  current: { type: ['number', 'null'] },
                  history: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        timestamp: { type: 'integer' },
                        value: { type: 'number' }
                      },
                      required: ['timestamp', 'value'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['current', 'history'],
                additionalProperties: false
              },
              heap: {
                type: 'object',
                properties: {
                  current: { type: ['number', 'null'] },
                  history: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        timestamp: { type: 'integer' },
                        value: { type: 'number' }
                      },
                      required: ['timestamp', 'value'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['current', 'history'],
                additionalProperties: false
              }
            },
            required: ['podId', 'startedAt', 'overloaded', 'elu', 'heap'],
            additionalProperties: false
          }
        }
      }
    },
    handler: async (req, reply) => {
      const controller = await app.getApplicationController(req.params.appId)
      if (!controller) {
        throw new errors.APPLICATION_CONTROLLER_NOT_FOUND(req.params.appId)
      }

      const result = await app.signalScalerExecutor.predictor.getInstancesMetricsByPod(
        req.params.appId,
        controller.controllerId,
        req.params.serviceId
      )
      if (result === null) {
        reply.code(404)
        return { error: 'not found' }
      }
      return Object.entries(result)
        .map(([podId, pod]) => ({ podId, ...pod }))
        .sort((a, b) => {
          if (a.overloaded !== b.overloaded) {
            return a.overloaded ? -1 : 1
          }
          return a.startedAt - b.startedAt
        })
    }
  })

  app.get('/api/v2/application/:appId/service/:serviceId/metrics', {
    schema: {
      params: {
        type: 'object',
        properties: {
          appId: { type: 'string', format: 'uuid' },
          serviceId: { type: 'string', minLength: 1 }
        },
        required: ['appId', 'serviceId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            elu: metricSnapshotSchema,
            heap: metricSnapshotSchema
          },
          additionalProperties: false
        }
      }
    },
    handler: async (req, reply) => {
      const controller = await app.getApplicationController(req.params.appId)
      if (!controller) {
        throw new errors.APPLICATION_CONTROLLER_NOT_FOUND(req.params.appId)
      }

      const snapshot = await app.signalScalerExecutor.predictor.getServiceMetricsSnapshot(
        req.params.appId,
        controller.controllerId,
        req.params.serviceId
      )
      if (!snapshot || (snapshot.elu === null && snapshot.heap === null)) {
        reply.code(404)
        return { error: 'not found' }
      }
      const response = {}
      if (snapshot.elu !== null) response.elu = snapshot.elu
      if (snapshot.heap !== null) response.heap = snapshot.heap
      return response
    }
  })

  app.get('/api/v2/application/:appId/pods/health', {
    schema: {
      params: {
        type: 'object',
        properties: {
          appId: { type: 'string', format: 'uuid' }
        },
        required: ['appId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            servicesCount: { type: 'integer', minimum: 0 },
            pods: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  startedAt: { type: 'integer' },
                  unhealthyServicesCount: { type: 'integer', minimum: 0 }
                },
                required: ['startedAt', 'unhealthyServicesCount'],
                additionalProperties: false
              }
            }
          },
          required: ['servicesCount', 'pods'],
          additionalProperties: false
        }
      }
    },
    handler: async (req) => {
      const controller = await app.getApplicationController(req.params.appId)
      if (!controller) {
        throw new errors.APPLICATION_CONTROLLER_NOT_FOUND(req.params.appId)
      }
      return app.signalScalerExecutor.predictor.getPodsHealth(
        req.params.appId,
        controller.controllerId
      )
    }
  })
}
