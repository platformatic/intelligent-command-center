'use strict'

const { request } = require('undici')
const errors = require('../lib/errors')

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
      const controller = await app.getApplicationController(req.params.appId)
      if (!controller) throw new errors.APPLICATION_CONTROLLER_NOT_FOUND(req.params.appId)
      return app.signalScalerExecutor.predictor.getServices(
        req.params.appId,
        controller.k8SControllerId
      )
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
      const controller = await app.getApplicationController(req.params.appId)
      if (!controller) throw new errors.APPLICATION_CONTROLLER_NOT_FOUND(req.params.appId)
      const snapshots = await app.signalScalerExecutor.predictor.getAppMetricsSnapshots(
        req.params.appId,
        controller.k8SControllerId
      )
      return snapshots?.[req.params.serviceId] || null
    }
  })

  async function getScalingEvents (appId) {
    const events = await app.platformatic.entities.scaleEvent.find({
      where: { applicationId: { eq: appId } },
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: 50
    })
    return events.map(e => e.id)
  }

  async function getScalingEvent (eventId) {
    const events = await app.platformatic.entities.scaleEvent.find({
      where: { id: { eq: eventId } },
      limit: 1
    })
    if (events.length === 0) return null

    const event = events[0]
    const metricSnapshots = await app.platformatic.entities.metricSnapshot.find({
      where: { scaleEventId: { eq: event.id } }
    })

    // Reconstruct the shape the dashboard expects
    const snapshots = {}
    for (const row of metricSnapshots) {
      if (!snapshots[row.serviceId]) snapshots[row.serviceId] = {}
      snapshots[row.serviceId][row.metricName] = row.data
    }

    return {
      direction: event.direction,
      timestamp: new Date(event.createdAt).getTime(),
      from: event.replicas - event.replicasDiff,
      to: event.replicas,
      triggerService: event.triggerService,
      triggerMetric: event.triggerMetric,
      snapshots
    }
  }

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
      return getScalingEvents(req.params.appId)
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
      const event = await getScalingEvent(req.params.eventId)
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
      return getScalingEvents(req.params.appId)
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
      const event = await getScalingEvent(req.params.eventId)
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
      const controller = await app.getApplicationController(req.params.appId)
      if (!controller) throw new errors.APPLICATION_CONTROLLER_NOT_FOUND(req.params.appId)
      return app.signalScalerExecutor.predictor.getAlignedInstanceMetrics(
        req.params.appId,
        controller.k8SControllerId,
        req.params.serviceId
      )
    }
  })
}
