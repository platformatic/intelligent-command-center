'use strict'

const fp = require('fastify-plugin')

class ScalerExecutor {
  constructor (app) {
    this.app = app
  }

  async execute (podId) {
    this.app.log.info({ podId }, 'Calculating scaling decision')

    // We should have only one alert in the time window, but the store consider the most
    // generale case, so this is a list
    const alerts = await this.app.store.getAlertByPodId(podId)
    this.app.log.debug({ podId, alertsCount: alerts.length, alerts }, 'Pod current alerts')

    this.app.log.info(`Processing scaling for pod: ${podId}`)
    // TODO: implement scaling logic

    this.app.log.info('Executing scaling decision process')
    // TODO: apply scaling decision

    return { success: true, podId, timestamp: Date.now() }
  }
}

async function plugin (app) {
  const executor = new ScalerExecutor(app)
  app.decorate('scalerExecutor', executor)
}

module.exports = fp(plugin, {
  name: 'scaler-executor',
  dependencies: ['store']
})
