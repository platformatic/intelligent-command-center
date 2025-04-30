'use strict'

const { request, getGlobalDispatcher, interceptors } = require('undici')
const fp = require('fastify-plugin')

/** @param {import('fastify').FastifyInstance} fastify */
module.exports = fp(async function (fastify, opts) {
  const controlPlaneUrl = fastify.config.PLT_CONTROL_PLANE_URL

  fastify.register(require('@fastify/websocket'))
  fastify.register(async (fastify, opts) => {
    fastify.get('/api/updates/icc', { websocket: true }, async (connection) => {
      connection.on('open', () => {
        connection.send(JSON.stringify({ command: 'welcome', message: 'Welcome to the updates service' }))
      })
      connection.on('error', err => {
        fastify.log.error({ err }, 'Connection error.')
        connection.close()
      })

      await fastify.registerUpdates(connection, { namespace: 'icc' })
    })

    fastify.route({
      method: 'GET',
      url: '/api/updates/applications/:id',
      preValidation: async (req) => {
        const applicationId = req.params.id

        const k8sContext = req.k8s
        if (!k8sContext) {
          throw new Error('Missing k8s context')
        }

        const podId = k8sContext.pod?.name
        const podDetails = await getDetectedPodDetails(podId)

        if (applicationId !== podDetails.applicationId) {
          throw new Error(
            `Pod "${podId}" cannot subscribe to application "${applicationId}" updates`
          )
        }
      },
      handler: () => {},
      wsHandler: async (connection, req) => {
        const applicationId = req.params.id

        const k8sContext = req.k8s
        const podId = k8sContext.pod?.name

        connection.on('close', async () => {
          await saveApplicationInstanceStatus(podId, k8sContext, 'stopped')
        })

        connection.on('error', err => {
          fastify.log.error({ err }, 'Connection error.')
          connection.close()
        })

        await fastify.registerUpdates(connection, {
          namespace: `applications/${applicationId}`
        })
        await saveApplicationInstanceStatus(podId, k8sContext, 'running')
      }
    })
  })

  const retryDispatcher = getGlobalDispatcher()
    .compose(interceptors.retry({
      maxRetries: 5,
      maxTimeout: 30000,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      statusCodes: [502, 503, 504, 429]
    }))

  async function saveApplicationInstanceStatus (podId, k8sContext, status) {
    try {
      const url = controlPlaneUrl + `/pods/${podId}/instance/status`
      const { statusCode, body } = await request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-k8s': JSON.stringify(k8sContext)
        },
        body: JSON.stringify({ status }),
        dispatcher: retryDispatcher
      })

      if (statusCode !== 200) {
        const error = await body.text()
        fastify.log.error({ err: error }, 'Error saving application instance status.')
      }
    } catch (err) {
      fastify.log.error({ err }, 'Error saving application instance status.')
    }
  }

  async function getDetectedPodDetails (podId) {
    const url = controlPlaneUrl + '/detectedPods'
    const { statusCode, body } = await request(url, {
      query: {
        'where.podId.eq': podId
      },
      dispatcher: retryDispatcher
    })

    if (statusCode !== 200) {
      const error = await body.text()
      fastify.log.error({ err: error }, 'Failed to get pod details')
    }

    const podDetails = await body.json()
    return podDetails.length > 0 ? podDetails[0] : null
  }
}, {
  name: 'websocket',
  dependencies: ['config']
})
