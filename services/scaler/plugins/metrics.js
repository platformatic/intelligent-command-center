'use strict'

const fp = require('fastify-plugin')
const Metrics = require('../lib/metrics')

module.exports = fp(async function (app) {
  const prometheusUrl = app.env.PLT_SCALER_PROMETHEUS_URL
  const pollingInterval = app.env.PLT_METRICS_POLLING_INTERVAL
  const timeRange = app.env.PLT_METRICS_TIME_RANGE

  if (!prometheusUrl) {
    app.log.warn('Prometheus URL is not set. Metrics plugin will not be loaded.')
    return
  }

  const metrics = new Metrics(prometheusUrl, pollingInterval, timeRange, app.log)

  app.addHook('onReady', async () => {
    if (metrics) {
      await metrics.start()
    }
  })

  app.addHook('onClose', async () => {
    if (metrics) {
      metrics.stop()
    }
  })

  app.decorate('scalerMetrics', metrics)
}, {
  name: 'metrics',
  dependencies: ['store']
})
