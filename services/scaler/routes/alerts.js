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

      app.log.debug({
        serviceId,
        applicationId,
        currentHealth,
        unhealthy,
        healthConfig,
        podId,
        healthHistoryLength: healthHistory?.length
      }, 'received alert')

      if (unhealthy) {
        app.log.info({ podId, serviceId, applicationId, unhealthy }, 'Received unhealthy alert')
      }

      return app.processAlert({
        applicationId,
        serviceId,
        podId,
        elu,
        heapUsed,
        heapTotal,
        unhealthy,
        healthHistory
      })
    }
  })

  app.addContentTypeParser(
    'application/octet-stream',
    function (request, payload, done) {
      const chunks = []
      payload.on('data', chunk => chunks.push(chunk))
      payload.on('end', () => {
        done(null, Buffer.concat(chunks))
      })
      payload.on('error', done)
    })

  app.post('/alerts/:id/flamegraph', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    },
    handler: async (req) => {
      const k8sContext = req.k8s
      if (!k8sContext) {
        throw new Error('Missing k8s context')
      }

      const alertId = req.params.id
      const flamegraph = req.body

      // Get the alert to duplicate service_id and pod_id
      const alert = await app.platformatic.entities.alert.find({
        where: { id: { eq: alertId } },
        fields: ['serviceId', 'podId']
      })

      if (!alert || alert.length === 0) {
        throw new Error('Alert not found')
      }

      await app.platformatic.entities.flamegraph.save({
        input: {
          alertId,
          flamegraph,
          serviceId: alert[0].serviceId,
          podId: alert[0].podId
        },
        fields: ['id']
      })
    }
  })
}
