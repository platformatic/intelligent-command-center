'use strict'

const {
  getMemMetrics,
  getCpuEventMetrics,
  getLatencyMetrics
} = require('../lib/metrics')

const {
  getPodMemMetrics,
  getPodCpuEventMetrics,
  getPodChartsMetrics,
  getPodLatencyMetrics
} = require('../lib/pods-metrics')

const { getEntrypoint } = require('../lib/control-plane')

const { getServiceThreadMetrics, getThreadCountByPod } = require('../lib/services')

const applicationTimeWindow = 2
const timeWindow = '2m'

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  app.get('/apps/:appId/mem', {
    handler: async (req) => {
      const { appId } = req.params
      app.log.info({ appId }, 'Getting application memory metrics')
      return getMemMetrics({ appId, timeWindow: applicationTimeWindow })
    }
  })

  app.get('/apps/:appId/cpu', {
    handler: async (req) => {
      const { appId } = req.params
      app.log.info({ appId }, 'Getting application cpu metrics')
      return getCpuEventMetrics({ appId, timeWindow: applicationTimeWindow })
    }
  })

  app.get('/apps/:appId/latency', {
    handler: async (req) => {
      const { appId } = req.params
      app.log.info({ appId }, 'Getting application latency metrics')
      const { controlPlane } = req
      const entrypoint = await getEntrypoint(controlPlane, appId, app.log)
      return getLatencyMetrics({ appId, entrypoint, timeWindow: applicationTimeWindow })
    }
  })

  app.get('/apps/:appId/pods/:podId/mem', {
    handler: async (req) => {
      const { podId } = req.params
      app.log.info({ podId }, 'Getting pod memory metrics')
      return getPodMemMetrics({ podId, timeWindow })
    }
  })

  app.get('/apps/:appId/pods/:podId/cpu', {
    handler: async (req) => {
      const { podId } = req.params
      app.log.info({ podId }, 'Getting pod cpu metrics')
      return getPodCpuEventMetrics({ podId, timeWindow })
    }
  })

  // Chart API for the podId
  app.get('/apps/:appId/pods/:podId', {
    handler: async (req) => {
      const { appId, podId } = req.params
      const { controlPlane } = req
      const entrypoint = await getEntrypoint(controlPlane, appId, app.log)
      const chart = await getPodChartsMetrics({ podId, serviceId: null })
      const latency = await getPodLatencyMetrics({ podId, serviceId: entrypoint })
      return { chart, latency }
    }
  })

  // Chart API for the service in pod
  app.get('/apps/:appId/pods/:podId/services/:serviceId', {
    handler: async (req) => {
      const { podId, serviceId } = req.params
      const chart = await getPodChartsMetrics({ podId, serviceId })
      const latency = await getPodLatencyMetrics({ podId, serviceId })
      return { chart, latency }
    }
  })

  // Thread count per pod for a given application
  app.get('/apps/:appId/threads', {
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
          type: 'object',
          additionalProperties: {
            type: 'object',
            additionalProperties: {
              type: 'number'
            }
          }
        }
      }
    },
    handler: async (req) => {
      const { appId } = req.params
      app.log.info({ appId }, 'Getting thread count per pod')
      return getThreadCountByPod({ applicationId: appId })
    }
  })

  // Service thread metrics
  app.post('/services/metrics', {
    schema: {
      query: {
        type: 'object',
        properties: {
          start: { type: 'string', format: 'date-time' },
          end: { type: 'string', format: 'date-time' }
        }
      },
      body: {
        type: 'object',
        properties: {
          applications: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                applicationId: { type: 'string' },
                services: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      serviceId: { type: 'string' }
                    },
                    required: ['serviceId']
                  }
                }
              }
            }
          }
        },
        required: ['applications']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            applications: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  appId: { type: 'string' },
                  services: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        serviceId: { type: 'string' },
                        cpu: {
                          type: 'number'
                        },
                        heap: {
                          type: 'number'
                        },
                        loop: {
                          type: 'number'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    handler: async (req) => {
      const { applications } = req.body
      const {
        // if start is not provided, use the 24h time window
        start = new Date() - 24 * 60 * 60 * 1000,
        end = new Date()
      } = req.query

      const window = {
        start: new Date(start),
        end: new Date(end)
      }

      class ICC {
        applications = new Map()

        ensureApplication (appId) {
          if (!this.applications.has(appId)) {
            this.applications.set(appId, new Application(appId))
          }
          return this.applications.get(appId)
        }

        toJSON () {
          return {
            applications: Array.from(this.applications.values()).map(app => app.toJSON())
          }
        }
      }

      class Application {
        constructor (appId, services = new Map()) {
          this.appId = appId
          this.services = services
        }

        ensureService (serviceId, metrics) {
          if (!this.services.has(serviceId)) {
            this.services.set(serviceId, new Service(serviceId, metrics))
          }
          return this.services.get(serviceId)
        }

        toJSON () {
          return {
            appId: this.appId,
            services: Array.from(this.services.values())
          }
        }
      }

      class Service {
        constructor (serviceId, { cpu, heap, loop }) {
          this.serviceId = serviceId
          this.cpu = cpu
          this.heap = heap
          this.loop = loop
        }
      }

      const icc = new ICC()
      for (const { applicationId, services } of applications) {
        const application = icc.ensureApplication(applicationId)
        for (const { serviceId } of services) {
          const metrics = await getServiceThreadMetrics({ applicationId, serviceId }, window)
          application.ensureService(serviceId, metrics)
        }
      }

      req.log.info({ icc: icc.toJSON() }, 'Sending service thread metrics')

      return icc.toJSON()
    }
  })
}
