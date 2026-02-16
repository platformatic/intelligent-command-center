'use strict'

const { request } = require('undici')

module.exports = async function (app) {
  // TODO: this is needed for the algorithm debug purposes
  const algorithmVersion = app.env.PLT_SCALER_ALGORITHM_VERSION
  if (algorithmVersion !== 'v2') return

  const controlPlaneUrl = app.env.PLT_CONTROL_PLANE_URL

  app.get('/api/apps/resolve/:appName', {
    schema: {
      params: {
        type: 'object',
        properties: {
          appName: { type: 'string' }
        },
        required: ['appName']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' }
          }
        }
      }
    },
    handler: async (req, reply) => {
      const { appName } = req.params

      const url = `${controlPlaneUrl}/applications`
      const res = await request(url, {
        method: 'GET',
        query: {
          'where.name.eq': appName,
          limit: 1
        }
      })

      if (res.statusCode !== 200) {
        return reply.code(res.statusCode).send({ error: 'Failed to resolve application' })
      }

      const applications = await res.body.json()
      if (applications.length === 0) {
        return reply.code(404).send({ error: `Application not found: "${appName}"` })
      }

      return { id: applications[0].id, name: applications[0].name }
    }
  })

  app.get('/api/apps/:appId/services', {
    schema: {
      params: {
        type: 'object',
        properties: {
          appId: { type: 'string' }
        },
        required: ['appId']
      },
      response: {
        200: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    },
    handler: async (req) => {
      const snapshots = await app.signalScalerExecutor.predictor.getAppMetricsSnapshots(
        req.params.appId
      )
      return snapshots ? Object.keys(snapshots) : []
    }
  })

  app.get('/api/apps/:appId/services/:serviceId/algorithm/metrics', {
    schema: {
      params: {
        type: 'object',
        properties: {
          appId: { type: 'string' },
          serviceId: { type: 'string' }
        },
        required: ['appId', 'serviceId']
      }
    },
    handler: async (req) => {
      const snapshots = await app.signalScalerExecutor.predictor.getAppMetricsSnapshots(
        req.params.appId
      )
      return snapshots?.[req.params.serviceId] || null
    }
  })

  // App-level scaling events (used by scaling-events.html list page)
  app.get('/api/apps/:appId/algorithm/scaling-events', {
    schema: {
      params: {
        type: 'object',
        properties: {
          appId: { type: 'string' }
        },
        required: ['appId']
      },
      response: {
        200: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    },
    handler: async (req) => {
      return app.signalScalerExecutor.predictor.getScalingEvents(req.params.appId)
    }
  })

  app.get('/api/apps/:appId/algorithm/scaling-event/:eventId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          appId: { type: 'string' },
          eventId: { type: 'string' }
        },
        required: ['appId', 'eventId']
      }
    },
    handler: async (req, reply) => {
      const event = await app.signalScalerExecutor.predictor.getScalingEvent(
        req.params.appId,
        req.params.eventId
      )
      if (!event) {
        return reply.code(404).send({ error: 'not found' })
      }
      return event
    }
  })

  // Legacy per-service routes (kept for compatibility)
  app.get('/api/apps/:appId/services/:serviceId/algorithm/scaling-events', {
    schema: {
      params: {
        type: 'object',
        properties: {
          appId: { type: 'string' },
          serviceId: { type: 'string' }
        },
        required: ['appId', 'serviceId']
      },
      response: {
        200: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    },
    handler: async (req) => {
      return app.signalScalerExecutor.predictor.getScalingEvents(req.params.appId)
    }
  })

  app.get('/api/apps/:appId/services/:serviceId/algorithm/scaling-event/:eventId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          appId: { type: 'string' },
          serviceId: { type: 'string' },
          eventId: { type: 'string' }
        },
        required: ['appId', 'serviceId', 'eventId']
      }
    },
    handler: async (req, reply) => {
      const event = await app.signalScalerExecutor.predictor.getScalingEvent(
        req.params.appId,
        req.params.eventId
      )
      if (!event) {
        return reply.code(404).send({ error: 'not found' })
      }
      return event
    }
  })

  app.get('/api/apps/:appId/services/:serviceId/instances/aligned', {
    schema: {
      params: {
        type: 'object',
        properties: {
          appId: { type: 'string' },
          serviceId: { type: 'string' }
        },
        required: ['appId', 'serviceId']
      }
    },
    handler: async (req) => {
      return app.signalScalerExecutor.predictor.getAlignedInstanceMetrics(
        req.params.appId,
        req.params.serviceId
      )
    }
  })
}
