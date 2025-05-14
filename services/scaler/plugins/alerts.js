'use strict'

const fp = require('fastify-plugin')
const AlertsManager = require('../lib/alerts-manager')

module.exports = fp(async function (app) {
  const alertsManager = new AlertsManager(app)

  app.decorate('alertsManager', alertsManager)
  app.decorate('processAlert', alert => alertsManager.processAlert(alert))
}, {
  name: 'alerts',
  dependencies: ['store', 'scaler']
})
