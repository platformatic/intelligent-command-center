'use strict'

function validateInternalAuth (req, app) {
  const iccSessionSecret = app.env.PLT_ICC_SESSION_SECRET
  if (!iccSessionSecret) {
    throw new Error('PLT_ICC_SESSION_SECRET is not configured')
  }

  const providedSecret = req.headers['x-plt-icc-session-secret']
  if (providedSecret !== iccSessionSecret) {
    const error = new Error('Unauthorized: invalid or missing internal auth')
    error.statusCode = 401
    throw error
  }
}

module.exports = async function (app) {
  app.post('/connect', {
    schema: {
      body: {
        type: 'object',
        properties: {
          applicationId: { type: 'string' },
          podId: { type: 'string' },
          namespace: { type: 'string' },
          runtimeId: { type: 'string' },
          timestamp: { type: 'number' }
        },
        required: ['applicationId', 'podId', 'namespace', 'runtimeId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' }
          }
        }
      }
    },
    handler: async (req, reply) => {
      const algorithmVersion = req.server.env.PLT_SCALER_ALGORITHM_VERSION

      if (algorithmVersion !== 'v2') {
        return reply.code(400).send({
          error: 'POST /connect is only available with algorithm version v2',
          currentVersion: algorithmVersion
        })
      }

      validateInternalAuth(req, app)

      if (!app.signalScalerExecutor) {
        throw new Error('Signal Scaler executor not initialized')
      }

      const { applicationId, podId, namespace, runtimeId, timestamp } = req.body
      const ts = timestamp || Date.now()

      const instance = await app.getInstanceByPodId(podId, namespace)
      if (!instance) {
        throw new Error('Instance not found for pod')
      }

      await app.signalScalerExecutor.onConnect(
        applicationId,
        instance.deploymentId,
        podId,
        runtimeId,
        ts
      )

      return { success: true }
    }
  })

  app.post('/disconnect', {
    schema: {
      body: {
        type: 'object',
        properties: {
          applicationId: { type: 'string' },
          podId: { type: 'string' },
          namespace: { type: 'string' },
          runtimeId: { type: 'string' },
          timestamp: { type: 'number' }
        },
        required: ['applicationId', 'podId', 'namespace', 'runtimeId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' }
          }
        }
      }
    },
    handler: async (req, reply) => {
      const algorithmVersion = req.server.env.PLT_SCALER_ALGORITHM_VERSION

      if (algorithmVersion !== 'v2') {
        return reply.code(400).send({
          error: 'POST /disconnect is only available with algorithm version v2',
          currentVersion: algorithmVersion
        })
      }

      validateInternalAuth(req, app)

      if (!app.signalScalerExecutor) {
        throw new Error('Signal Scaler executor not initialized')
      }

      const { applicationId, podId, namespace, runtimeId, timestamp } = req.body
      const ts = timestamp || Date.now()

      const instance = await app.getInstanceByPodId(podId, namespace)
      if (!instance) {
        throw new Error('Instance not found for pod')
      }

      await app.signalScalerExecutor.onDisconnect(applicationId, runtimeId, ts)

      return { success: true }
    }
  })
}
