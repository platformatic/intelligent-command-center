'use strict'

const { APPLICATION_CONTROLLER_NOT_FOUND } = require('../lib/errors')

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
          machineId: { type: 'string' },
          namespace: { type: 'string' },
          runtimeId: { type: 'string' },
          timestamp: { type: 'number' }
        },
        required: ['applicationId', 'machineId', 'namespace', 'runtimeId']
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

      const { applicationId, machineId, namespace, runtimeId, timestamp } = req.body
      const ts = timestamp || Date.now()

      const instance = await app.getInstanceByMachineId(machineId, namespace)
      if (!instance) {
        throw new Error('Instance not found for machine')
      }

      const controller = await app.getControllerByDeploymentId(
        applicationId,
        instance.deploymentId
      )
      if (!controller) {
        throw new APPLICATION_CONTROLLER_NOT_FOUND(applicationId)
      }
      const controllerId = controller.controllerId

      await app.signalScalerExecutor.onConnect(
        applicationId,
        controllerId,
        runtimeId,
        ts
      )

      return { success: true }
    }
  })

  app.post('/ready', {
    schema: {
      body: {
        type: 'object',
        properties: {
          applicationId: { type: 'string' },
          runtimeId: { type: 'string' },
          timestamp: { type: 'number' }
        },
        required: ['applicationId', 'runtimeId', 'timestamp']
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
          error: 'POST /ready is only available with algorithm version v2',
          currentVersion: algorithmVersion
        })
      }

      const machineCtx = req.context
      if (!machineCtx) {
        throw new Error('Missing machine context')
      }

      const podId = machineCtx.machineId
      const namespace = machineCtx.namespace

      if (!podId) {
        throw new Error('Missing machine ID from machine context')
      }

      if (!app.signalScalerExecutor) {
        throw new Error('Signal Scaler executor not initialized')
      }

      const { applicationId, runtimeId, timestamp } = req.body

      const instance = await app.getInstanceByMachineId(podId, namespace)
      if (!instance) {
        throw new Error('Instance not found for pod')
      }

      const controller = await app.getControllerByDeploymentId(
        applicationId,
        instance.deploymentId
      )
      if (!controller) {
        throw new APPLICATION_CONTROLLER_NOT_FOUND(applicationId)
      }
      const controllerId = controller.controllerId

      await app.signalScalerExecutor.onReady(
        applicationId,
        controllerId,
        instance.deploymentId,
        podId,
        runtimeId,
        timestamp
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
          machineId: { type: 'string' },
          namespace: { type: 'string' },
          runtimeId: { type: 'string' },
          timestamp: { type: 'number' }
        },
        required: ['applicationId', 'machineId', 'namespace', 'runtimeId']
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

      const { applicationId, machineId, namespace, runtimeId, timestamp } = req.body
      const ts = timestamp || Date.now()

      const instance = await app.getInstanceByMachineId(machineId, namespace)
      if (!instance) {
        throw new Error('Instance not found for machine')
      }

      const controller = await app.getControllerByDeploymentId(
        applicationId,
        instance.deploymentId
      )
      if (!controller) {
        throw new APPLICATION_CONTROLLER_NOT_FOUND(applicationId)
      }
      const controllerId = controller.controllerId
      await app.signalScalerExecutor.onDisconnect(applicationId, controllerId, runtimeId, ts)

      return { success: true }
    }
  })
}
