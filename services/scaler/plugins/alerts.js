'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async function (app) {
  async function processAlert (alert) {
    const { applicationId, serviceId, podId, elu, heapUsed, heapTotal } = alert

    app.log.debug({
      applicationId,
      serviceId,
      podId,
      elu,
      heapUsed,
      heapTotal
    }, 'Processing alert')

    // Save the alert.
    await app.store.saveAlert({
      applicationId,
      serviceId,
      podId,
      elu,
      heapUsed,
      heapTotal
    })

    // TODO:: The alsert should trigger the scaler.
  }

  app.decorate('processAlert', processAlert)
}, {
  name: 'alerts',
  dependencies: ['store']
})
