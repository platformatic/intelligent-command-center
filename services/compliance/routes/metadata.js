/// <reference path="../global.d.ts" />
'use strict'

const errors = require('../lib/errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  app.post('/metadata', {
    schema: {
      body: {
        type: 'object',
        properties: {
          applicationId: { type: 'string' },
          data: { type: 'object' }
        },
        required: ['applicationId', 'data']
      }
    }
  }, async (req, res) => {
    const machineCtx = req.context
    if (!machineCtx) {
      throw new errors.MissingMachineAuthContext()
    }

    const machineId = machineCtx.machineId
    if (!machineId) {
      throw new errors.MachineIdNotFound()
    }

    const namespace = machineCtx.namespace
    if (!namespace) {
      throw new errors.MachineNamespaceNotFound()
    }

    const { applicationId, data } = req.body

    const instances = await req.controlPlane.getInstances({
      'where.machineId.eq': machineId,
      'where.namespace.eq': namespace,
      'where.applicationId.eq': applicationId
    })

    if (instances.length === 0) {
      throw new errors.InstanceNotFound(machineId)
    }

    const { deploymentId } = instances[0]

    // search for metadata already present
    const next = await app.shouldStoreMetadata(
      applicationId,
      deploymentId
    )

    if (next) {
      await app.platformatic.entities.metadatum.save({
        input: {
          applicationId,
          deploymentId,
          data
        }
      })
      return res.code(201).send({})
    }
    return res.code(200).send({})
  })
}
