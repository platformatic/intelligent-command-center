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
    const k8sContext = req.k8s
    if (!k8sContext) {
      throw new errors.MissingK8sAuthContext()
    }

    const podId = k8sContext.pod?.name
    if (!podId) {
      throw new errors.PodIdNotFound()
    }

    const namespace = k8sContext.namespace
    if (!namespace) {
      throw new errors.PodNamespaceNotFound()
    }

    const { applicationId, data } = req.body

    const instances = await req.controlPlane.getInstances({
      'where.podId.eq': podId,
      'where.namespace.eq': namespace,
      'where.applicationId.eq': applicationId
    })

    if (instances.length === 0) {
      throw new errors.InstanceNotFound(podId)
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
