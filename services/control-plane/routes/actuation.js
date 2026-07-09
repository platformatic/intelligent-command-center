/// <reference path="../global.d.ts" />

'use strict'

const errors = require('../plugins/errors')

// The actuation mode is a skew-independent application setting (see
// plugins/actuation-policy.js): it decides workload ownership -- observe (ICC
// mutates nothing; the customer owns the workload), manage (ICC creates the
// workload) or advise (ICC returns the manifests). It is settable whether or not
// skew protection is enabled, so a token-deploy can be driven to manage/advise
// with skew off.
//
// This is the cookie/dashboard surface. It is deliberately NOT skew-gated and
// NOT in the deploy-token allowlist (plugins/deploy-tokens.js), so a CI deploy
// token cannot change its own application's mode -- only a dashboard principal
// can.
const MODES = ['observe', 'manage', 'advise']

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  const idParams = {
    type: 'object',
    properties: { id: { type: 'string' } },
    required: ['id']
  }

  const modeResponse = {
    200: {
      type: 'object',
      properties: { mode: { type: 'string' } },
      required: ['mode'],
      additionalProperties: false
    }
  }

  async function requireApplication (applicationId) {
    const application = await app.getApplicationById(applicationId)
    if (application === null) {
      throw new errors.ApplicationNotFound(applicationId)
    }
    return application
  }

  app.get('/applications/:id/actuation-mode', {
    logLevel: 'info',
    schema: { operationId: 'getActuationMode', params: idParams, response: modeResponse },
    handler: async (req) => {
      const applicationId = req.params.id
      await requireApplication(applicationId)
      return app.resolveActuationMode(applicationId)
    }
  })

  app.put('/applications/:id/actuation-mode', {
    logLevel: 'info',
    schema: {
      operationId: 'setActuationMode',
      params: idParams,
      body: {
        type: 'object',
        properties: { mode: { type: 'string', enum: MODES } },
        required: ['mode'],
        additionalProperties: false
      },
      response: modeResponse
    },
    handler: async (req) => {
      const applicationId = req.params.id
      await requireApplication(applicationId)
      await app.saveActuationMode(applicationId, req.body.mode)
      req.log.info({ applicationId, mode: req.body.mode }, 'actuation mode updated')
      return { mode: req.body.mode }
    }
  })
}
