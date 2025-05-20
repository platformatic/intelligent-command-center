'use strict'

const fp = require('fastify-plugin')
const Metrics = require('../lib/metrics')

module.exports = fp(async function (app) {
  const prometheusUrl = app.env.PLT_METRICS_PROMETHEUS_URL
  const timeRange = app.env.PLT_METRICS_TIME_RANGE

  if (!prometheusUrl) {
    app.log.warn('Prometheus URL is not set. Metrics plugin will not be loaded.')
    return
  }

  const metrics = new Metrics(prometheusUrl, app.log, { timeRange })

  app.decorate('scalerMetrics', metrics)
}, {
  name: 'metrics',
  dependencies: ['store']
})
