'use strict'

module.exports = async function (app) {
  app.post('/signals', {
    schema: {
      body: {
        type: 'object',
        properties: {
          applicationId: { type: 'string' },
          serviceId: { type: 'string' },
          elu: { type: 'number' },
          heapUsed: { type: 'number' },
          heapTotal: { type: 'number' },
          signals: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                value: { type: ['string', 'number', 'null'] },
                timestamp: { type: 'number' },
                description: { type: 'string' }
              },
              required: ['type', 'timestamp']
            }
          }
        },
        required: ['applicationId', 'serviceId', 'signals']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            applicationId: { type: 'string' },
            podId: { type: 'string' },
            alertId: { type: 'string' },
            signalCount: { type: 'number' },
            scalingDecision: {
              type: 'object',
              properties: {
                nfinal: { type: 'number' },
                reason: { type: 'string' }
              }
            }
          }
        }
      }
    },
    handler: async (req, reply) => {
      const algorithmVersion = req.server.env.PLT_SCALER_ALGORITHM_VERSION

      if (algorithmVersion !== 'v2') {
        return reply.code(400).send({
          error: 'POST /signals is only available with algorithm version v2',
          currentVersion: algorithmVersion
        })
      }

      const k8sContext = req.k8s
      if (!k8sContext) {
        throw new Error('Missing k8s context')
      }

      const podId = k8sContext.pod?.name
      const {
        applicationId,
        serviceId,
        elu,
        heapUsed,
        heapTotal,
        signals
      } = req.body

      if (!podId) {
        throw new Error('Missing pod ID from k8s context')
      }

      app.log.debug({
        applicationId,
        serviceId,
        podId,
        signalCount: signals.length
      }, 'Received signals')

      if (!app.signalScalerExecutor) {
        throw new Error('Signal Scaler executor not initialized')
      }

      const { alert, scalingDecision } = await app.signalScalerExecutor.processSignals({
        applicationId,
        serviceId,
        podId,
        signals,
        elu,
        heapUsed,
        heapTotal
      })

      return {
        success: true,
        applicationId,
        podId,
        alertId: alert.id,
        signalCount: signals.length,
        scalingDecision
      }
    }
  })
}
