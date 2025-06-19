'use strict'

module.exports = async function (app) {
  const healthSchema = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      service: { type: 'string' },
      currentHealth: {
        type: 'object',
        properties: {
          elu: { type: 'number' },
          heapUsed: { type: 'number' },
          heapTotal: { type: 'number' }
        }
      },
      unhealthy: { type: 'boolean' },
      timestamp: { type: 'string' }
    }
  }

  app.post('/alerts', {
    schema: {
      body: {
        type: 'object',
        properties: {
          applicationId: { type: 'string' },
          alert: healthSchema,
          healthHistory: {
            type: 'array',
            items: healthSchema
          }
        },
        required: ['alert', 'healthHistory']
      }
    },
    handler: async (req) => {
      const k8sContext = req.k8s
      if (!k8sContext) {
        throw new Error('Missing k8s context')
      }

      const podId = k8sContext.pod?.name
      const { alert, healthHistory, applicationId } = req.body
      const { currentHealth, unhealthy, healthConfig } = alert
      /* c8 ignore next */
      const serviceId = alert.service || alert.id
      const { elu, heapUsed, heapTotal } = currentHealth
      app.log.debug({ serviceId, applicationId, currentHealth, unhealthy, healthConfig, podId, healthHistoryLength: healthHistory?.length }, 'received alert')

      if (unhealthy) {
        app.log.info({ podId, serviceId, applicationId, unhealthy }, 'Received unhealthy alert')
      }

      await app.processAlert({
        applicationId,
        serviceId,
        podId,
        elu,
        heapUsed,
        heapTotal,
        unhealthy,
        healthHistory
      })

      return { success: true }
    }
  })
}
