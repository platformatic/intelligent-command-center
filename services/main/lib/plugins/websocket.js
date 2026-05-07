'use strict'

const { request, getGlobalDispatcher, interceptors } = require('undici')
const fp = require('fastify-plugin')
const { FailedToGetMachineDetailsError } = require('../errors')

/** @param {import('fastify').FastifyInstance} fastify */
module.exports = fp(async function (fastify, opts) {
  const controlPlaneUrl = fastify.config.PLT_CONTROL_PLANE_URL
  const scalerUrl = fastify.config.PLT_SCALER_URL
  const scalerAlgorithmVersion = fastify.config.PLT_SCALER_ALGORITHM_VERSION
  const iccSessionSecret = process.env.PLT_ICC_SESSION_SECRET

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

        const machineCtx = req.context
        if (!machineCtx) {
          throw new Error('Missing machine context')
        }

        const machineId = machineCtx.machineId
        const machineDetails = await getDetectedMachineDetails(machineId)

        if (applicationId !== machineDetails.applicationId) {
          throw new Error(
            `Machine "${machineId}" cannot subscribe to application "${applicationId}" updates`
          )
        }
      },
      handler: () => {},
      wsHandler: async (connection, req) => {
        const applicationId = req.params.id
        const runtimeId = req.query.runtimeId

        const machineCtx = req.context
        const machineId = machineCtx.machineId
        const namespace = machineCtx.namespace

        connection.on('close', async () => {
          await saveApplicationInstanceStatus(machineId, machineCtx, 'stopped')
          if (runtimeId) {
            await notifyScalerDisconnect(applicationId, machineId, namespace, runtimeId)
          }
        })

        connection.on('error', err => {
          fastify.log.error({ err }, 'Connection error.')
          connection.close()
        })

        await fastify.registerUpdates(connection, {
          namespace: `applications/${applicationId}`
        })
        // Register the same WebSocket connection for requests TO watt too(e.g., flamegraph generation)
        fastify.registerClientHandler(connection, machineId)

        await saveApplicationInstanceStatus(machineId, machineCtx, 'running')
        if (runtimeId) {
          await notifyScalerConnect(applicationId, machineId, namespace, runtimeId)
        }
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

  async function saveApplicationInstanceStatus (machineId, machineCtx, status) {
    try {
      const url = controlPlaneUrl + `/pods/${machineId}/instance/status`
      const { statusCode, body } = await request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-plt-machine-id': machineCtx.machineId,
          'x-plt-machine-namespace': machineCtx.namespace
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

  async function notifyScalerConnect (applicationId, machineId, namespace, runtimeId) {
    if (scalerAlgorithmVersion !== 'v2') return

    const timestamp = Date.now()

    try {
      const url = scalerUrl + '/connect'
      const { statusCode, body } = await request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-plt-icc-session-secret': iccSessionSecret
        },
        body: JSON.stringify({
          applicationId,
          machineId,
          namespace,
          runtimeId,
          timestamp
        }),
        dispatcher: retryDispatcher
      })

      if (statusCode !== 200) {
        const error = await body.text()
        fastify.log.error({ err: error, applicationId, machineId, runtimeId }, 'Error notifying scaler connect.')
      } else {
        await body.dump()
      }
    } catch (err) {
      fastify.log.error({ err, applicationId, machineId, runtimeId }, 'Error notifying scaler connect.')
    }
  }

  async function notifyScalerDisconnect (applicationId, machineId, namespace, runtimeId) {
    if (scalerAlgorithmVersion !== 'v2') return

    const timestamp = Date.now()

    try {
      const url = scalerUrl + '/disconnect'
      const { statusCode, body } = await request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-plt-icc-session-secret': iccSessionSecret
        },
        body: JSON.stringify({
          applicationId,
          machineId,
          namespace,
          runtimeId,
          timestamp
        }),
        dispatcher: retryDispatcher
      })

      if (statusCode !== 200) {
        const error = await body.text()
        fastify.log.error({ err: error, applicationId, machineId, runtimeId }, 'Error notifying scaler disconnect.')
      } else {
        await body.dump()
      }
    } catch (err) {
      fastify.log.error({ err, applicationId, machineId, runtimeId }, 'Error notifying scaler disconnect.')
    }
  }

  async function getDetectedMachineDetails (machineId) {
    const url = controlPlaneUrl + '/instances'
    const { statusCode, body } = await request(url, {
      query: {
        'where.machineId.eq': machineId
      },
      dispatcher: retryDispatcher
    })

    if (statusCode !== 200) {
      const error = await body.text()
      fastify.log.error({ err: error, statusCode }, 'Failed to get machine details')
      throw new FailedToGetMachineDetailsError(error)
    }

    const machineDetails = await body.json()
    return machineDetails.length > 0 ? machineDetails[0] : null
  }
}, {
  name: 'websocket',
  dependencies: ['config', 'watt-requests']
})
