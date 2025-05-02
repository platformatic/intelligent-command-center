/// <reference path="../global.d.ts" />
'use strict'

const fp = require('fastify-plugin')
const { request, getGlobalDispatcher, interceptors } = require('undici')
const errors = require('./errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  const mainServiceUrl = app.env.PLT_MAIN_SERVICE_URL
  const sessionSecret = app.env.PLT_ICC_SESSION_SECRET

  const retryDispatcher = getGlobalDispatcher()
    .compose(interceptors.retry({
      maxRetries: 3,
      maxTimeout: 30000,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      statusCodes: [502, 503, 504, 429]
    }))

  app.decorate('emitUpdate', async (namespace, message, ctx) => {
    const url = mainServiceUrl + `/api/updates/${namespace}`

    const { statusCode, body } = await request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-plt-icc-session-secret': sessionSecret
      },
      body: JSON.stringify(message),
      dispatcher: retryDispatcher
    })

    if (statusCode !== 204) {
      const error = await body.text()
      throw new errors.FailedToSaveUpdate(error)
    }
  })
}, {
  name: 'updates',
  dependencies: ['env']
})
