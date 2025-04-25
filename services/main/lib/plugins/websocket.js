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

    fastify.get('/api/updates/applications/:id', { websocket: true }, async (connection, req) => {
      const applicationId = req.params.id

      // TODO: get the podId from a jwt
      const podId = req.query.podId

      connection.on('close', async () => {
        await saveApplicationInstanceStatus(podId, 'stopped')
      })

      connection.on('error', err => {
        fastify.log.error({ err }, 'Connection error.')
        connection.close()
      })

      await fastify.registerUpdates(connection, {
        namespace: `applications/${applicationId}`
      })
      await saveApplicationInstanceStatus(podId, 'running')
    })
  })

  const retryDispatcher = getGlobalDispatcher()
    .compose(interceptors.retry({
      maxRetries: 5,
      maxTimeout: 30000,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      statusCodes: [502, 503, 504, 429]
    }))

  async function saveApplicationInstanceStatus (podId, status) {
    try {
      const url = controlPlaneUrl + `/pods/${podId}/instance/status`
      const { statusCode, body } = await request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
}, {
  name: 'websocket',
  dependencies: ['config']
})
