'use strict'

const errors = require('../lib/errors')

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
      const namespace = k8sContext.namespace

      const { podId, serviceId } = req.params
      const { alertId, profileType = 'cpu' } = req.query
      const flamegraph = req.body

      const instance = await app.getInstanceByPodId(podId, namespace)
      if (instance === null) {
        throw new errors.INSTANCE_NOT_FOUND(podId)
      }

      app.log.debug({
        serviceId,
        podId,
        alertId,
        profileType,
        flamegraphSize: flamegraph?.length
      }, 'received flamegraph')

      const input = {
        applicationId: instance.applicationId,
        serviceId,
        podId,
        flamegraph,
        profileType
      }

      const result = await app.platformatic.entities.flamegraph.save({
        input,
        fields: ['id', 'createdAt']
      })

      // If alertId is provided, update the alert to link to this flamegraph
      if (alertId) {
        await app.platformatic.entities.alert.save({
          input: { id: alertId, flamegraphId: result.id },
          fields: ['id']
        })
      }

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

  app.post('/flamegraphs/:flamegraphId/alerts', {
    schema: {
      params: {
        type: 'object',
        properties: {
          flamegraphId: { type: 'string', format: 'uuid' }
        },
        required: ['flamegraphId']
      },
      body: {
        type: 'object',
        properties: {
          alertIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            minItems: 1
          }
        },
        required: ['alertIds']
      }
    },
    handler: async (req) => {
      const { flamegraphId } = req.params
      const { alertIds } = req.body

      // Verify flamegraph exists
      const flamegraphs = await app.platformatic.entities.flamegraph.find({
        where: { id: { eq: flamegraphId } },
        fields: ['id']
      })
      if (flamegraphs.length === 0) {
        throw new errors.FLAMEGRAPH_NOT_FOUND(flamegraphId)
      }

      // Link all alerts to the flamegraph
      await app.platformatic.entities.alert.updateMany({
        where: {
          id: { in: alertIds }
        },
        input: { flamegraphId }
      })
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
