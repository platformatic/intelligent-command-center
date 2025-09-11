'use strict'

const { request } = require('undici')

module.exports = async function (app) {
  async function queryMetric (metricName, podId, serviceId, prometheusUrl, start, end) {
    const url = new URL('/api/v1/query_range', prometheusUrl)
    const query = serviceId
      ? `${metricName}{instanceId="${podId}", serviceId="${serviceId}"}`
      : `${metricName}{instanceId="${podId}"}`

    url.searchParams.append('query', query)
    url.searchParams.append('start', start.toString())
    url.searchParams.append('end', end.toString())
    url.searchParams.append('step', '5')

    app.log.debug({ url: url.toString(), metricName, podId, serviceId }, 'Querying Prometheus for alert metrics')

    const { statusCode, body } = await request(url)

    if (statusCode !== 200) {
      const error = await body.text()
      app.log.error({ error, metricName }, 'Prometheus query failed')
      return []
    }

    const data = await body.json()

    if (data.status === 'success' && data.data?.result?.[0]?.values) {
      return data.data.result[0].values.map(([timestamp, value]) => ({
        timestamp: parseInt(timestamp),
        value: parseFloat(value)
      }))
    }

    return []
  }

  app.get('/scale-events/:scaleEventId/metrics', {
    schema: {
      params: {
        type: 'object',
        properties: {
          scaleEventId: { type: 'string', format: 'uuid' }
        },
        required: ['scaleEventId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            scaleEventId: { type: 'string' },
            applicationId: { type: 'string' },
            alertTime: { type: 'string' },
            podId: { type: 'string' },
            metrics: {
              type: 'object',
              properties: {
                elu: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'number' },
                      value: { type: 'number' }
                    }
                  }
                },
                heapUsed: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'number' },
                      value: { type: 'number' }
                    }
                  }
                },
                heapTotal: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'number' },
                      value: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        },
        404: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      const { scaleEventId } = request.params

      app.log.info({ scaleEventId }, 'Fetching metrics for scale event')

      try {
        // Get the scale event
        const scaleEvents = await app.platformatic.entities.scaleEvent.find({
          where: { id: { eq: scaleEventId } },
          limit: 1
        })

        app.log.debug({ scaleEventId, foundEvents: scaleEvents.length }, 'Scale events query result')

        if (scaleEvents.length === 0) {
          app.log.warn({ scaleEventId }, 'Scale event not found')
          return reply.code(404).send({ message: 'Scale event not found' })
        }

        const scaleEvent = scaleEvents[0]

        // Get alerts associated with this scale event
        const alerts = await app.platformatic.entities.alert.find({
          where: { scaleEventId: { eq: scaleEventId } },
          orderBy: [{ field: 'createdAt', direction: 'asc' }],
          limit: 1
        })

        if (alerts.length === 0) {
          return reply.code(404).send({ message: 'No alerts found for this scale event' })
        }

        const alert = alerts[0]
        const alertTime = new Date(alert.createdAt).getTime() / 1000 // Convert to Unix timestamp
        const beforeWindow = 120 // 2 minutes before alert to catch the spike
        const afterWindow = 60 // 1 minute after alert

        // Query Prometheus for metrics in the window [alertTime - 2min, alertTime + 1min]
        if (!app.scalerMetrics) {
          return reply.code(503).send({ message: 'Metrics service not available' })
        }

        // Query metrics around the alert time
        const start = Math.floor(alertTime - beforeWindow)
        const end = Math.floor(alertTime + afterWindow)

        const prometheusUrl = app.env.PLT_METRICS_PROMETHEUS_URL
        if (!prometheusUrl) {
          return reply.code(503).send({ message: 'Prometheus URL not configured' })
        }

        const [eluData, heapUsedData, heapTotalData] = await Promise.all([
          queryMetric('nodejs_eventloop_utilization', alert.podId, alert.serviceId, prometheusUrl, start, end),
          queryMetric('nodejs_heap_size_used_bytes', alert.podId, alert.serviceId, prometheusUrl, start, end),
          queryMetric('nodejs_heap_size_total_bytes', alert.podId, alert.serviceId, prometheusUrl, start, end)
        ])

        return {
          scaleEventId,
          applicationId: scaleEvent.applicationId,
          alertTime: alert.createdAt,
          podId: alert.podId,
          metrics: {
            elu: eluData,
            heapUsed: heapUsedData,
            heapTotal: heapTotalData
          }
        }
      } catch (err) {
        app.log.error({ err, scaleEventId }, 'Error fetching scale event metrics')
        return reply.code(500).send({ message: 'Internal server error' })
      }
    }
  })

  // New endpoint to fetch metrics for an alert/signal directly
  app.get('/alerts/:alertId/metrics', {
    schema: {
      params: {
        type: 'object',
        properties: {
          alertId: { type: 'string', format: 'uuid' }
        },
        required: ['alertId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            alertId: { type: 'string' },
            applicationId: { type: 'string' },
            alertTime: { type: 'string' },
            podId: { type: 'string' },
            metrics: {
              type: 'object',
              properties: {
                elu: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'number' },
                      value: { type: 'number' }
                    }
                  }
                },
                heapUsed: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'number' },
                      value: { type: 'number' }
                    }
                  }
                },
                heapTotal: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'number' },
                      value: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        },
        404: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      const { alertId } = request.params

      app.log.info({ alertId }, 'Fetching metrics for alert')

      try {
        // Get the alert
        const alerts = await app.platformatic.entities.alert.find({
          where: { id: { eq: alertId } },
          limit: 1
        })

        if (alerts.length === 0) {
          app.log.warn({ alertId }, 'Alert not found')
          return reply.code(404).send({ message: 'Alert not found' })
        }

        const alert = alerts[0]
        const alertTime = new Date(alert.createdAt).getTime() / 1000 // Convert to Unix timestamp
        const beforeWindow = 120 // 2 minutes before alert to catch the spike
        const afterWindow = 60 // 1 minute after alert

        // Query Prometheus for metrics in the window [alertTime - 2min, alertTime + 1min]
        if (!app.scalerMetrics) {
          return reply.code(503).send({ message: 'Metrics service not available' })
        }

        // Query metrics around the alert time
        const start = Math.floor(alertTime - beforeWindow)
        const end = Math.floor(alertTime + afterWindow)

        const prometheusUrl = app.env.PLT_METRICS_PROMETHEUS_URL
        if (!prometheusUrl) {
          return reply.code(503).send({ message: 'Prometheus URL not configured' })
        }

        const [eluData, heapUsedData, heapTotalData] = await Promise.all([
          queryMetric('nodejs_eventloop_utilization', alert.podId, alert.serviceId, prometheusUrl, start, end),
          queryMetric('nodejs_heap_size_used_bytes', alert.podId, alert.serviceId, prometheusUrl, start, end),
          queryMetric('nodejs_heap_size_total_bytes', alert.podId, alert.serviceId, prometheusUrl, start, end)
        ])

        return {
          alertId,
          applicationId: alert.applicationId,
          alertTime: alert.createdAt,
          podId: alert.podId,
          metrics: {
            elu: eluData,
            heapUsed: heapUsedData,
            heapTotal: heapTotalData
          }
        }
      } catch (err) {
        app.log.error({ err, alertId }, 'Error fetching alert metrics')
        return reply.code(500).send({ message: 'Internal server error' })
      }
    }
  })
}
