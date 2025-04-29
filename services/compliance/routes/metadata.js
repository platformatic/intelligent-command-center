/// <reference path="../global.d.ts" />
'use strict'

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
    const { applicationId, data } = req.body
    // search for metadata already present
    const next = await app.shouldStoreMetadata(applicationId)
    if (next) {
      await app.platformatic.entities.metadatum.save({
        input: {
          applicationId,
          data
        }
      })
      return res.code(201).send({})
    }
    return res.code(200).send({})
  })
}
