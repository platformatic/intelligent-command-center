'use strict'

module.exports = async function (app) {
  app.post('/alerts', {
    schema: {
      body: {
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
          healthConfig: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              interval: { type: 'number' },
              gracePeriod: { type: 'number' },
              maxUnhealthyChecks: { type: 'number' },
              maxELU: { type: 'number' },
              maxHeapUsed: { type: 'number' },
              maxHeapTotal: { type: 'number' }
            }
          }
        }
      }
    },
    handler: async (req) => {
      const k8sContext = req.k8s
      if (!k8sContext) {
        throw new Error('Missing k8s context')
      }

      const podId = k8sContext.pod?.name
      const { serviceId, applicationId, currentHealth, unhealthy, healthConfig } = req.body
      const { elu, heapUsed, heapTotal } = currentHealth
      app.log.debug({ serviceId, applicationId, currentHealth, unhealthy, healthConfig, podId }, 'received alert')

      // Save the alert using alertsStore
      await app.alertStore.saveAlert({
        applicationId,
        serviceId,
        podId,
        elu,
        heapUsed,
        heapTotal
      })

      return { success: true }
    }
  })
}
