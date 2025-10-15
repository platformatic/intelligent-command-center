'use strict'
module.exports = async function (app) {
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

  app.post('/pods/:podId/services/:serviceId/flamegraph', {
    schema: {
      params: {
        type: 'object',
        properties: {
          podId: { type: 'string' },
          serviceId: { type: 'string' }
        },
        required: ['podId', 'serviceId']
      },
      querystring: {
        type: 'object',
        properties: {
          alertId: { type: 'string' },
          profileType: { type: 'string', enum: ['cpu', 'heap'], default: 'cpu' }
        }
      }
    },
    handler: async (req) => {
      const k8sContext = req.k8s
      if (!k8sContext) {
        throw new Error('Missing k8s context')
      }

      const { podId, serviceId } = req.params
      const { alertId, profileType = 'cpu' } = req.query
      const flamegraph = req.body

      app.log.debug({
        serviceId,
        podId,
        alertId,
        profileType,
        flamegraphSize: flamegraph?.length
      }, 'received flamegraph')

      const input = { serviceId, podId, flamegraph, profileType }
      if (alertId) {
        input.alertId = alertId
      }

      const result = await app.platformatic.entities.flamegraph.save({
        input,
        fields: ['id', 'createdAt']
      })

      await app.emitUpdate('icc', {
        topic: 'ui-updates/flamegraphs',
        type: 'flamegraph-created',
        data: {
          id: result.id,
          serviceId,
          podId,
          profileType,
          createdAt: result.createdAt
        }
      }).catch((err) => {
        app.log.error({ err }, 'Failed to send notification to ui')
      })

      return result
    }
  })

  app.get('/flamegraphs/:id/download', async (req) => {
    const { id } = req.params
    try {
      const flamegraph = await app.platformatic.entities.flamegraph.find({
        where: { id: { eq: id } },
        fields: ['id', 'flamegraph']
      })
      console.log('flamegraph', flamegraph, '#####################')
      // return binary data as a buffer
      return Buffer.from(flamegraph[0].flamegraph)
    } catch (err) {
      app.log.error({ err }, 'Failed to decode flamegraph')
      return { error: 'Failed to decode flamegraph:' + err.message }
    }
  })
}
