/// <reference path="../global.d.ts" />
'use strict'

const fp = require('fastify-plugin')
const { request, Agent, interceptors } = require('undici')
const errors = require('./errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  const mainServiceUrl = app.env.PLT_MAIN_SERVICE_URL
  const sessionSecret = app.env.PLT_ICC_SESSION_SECRET

  // Own a dedicated dispatcher rather than composing over the global one:
  // getGlobalDispatcher() can return Node's built-in undici Agent, and composing
  // this package's retry interceptor over it crosses undici copies and trips
  // UND_ERR_INVALID_ARG on the forwarded opts.dispatcher.
  const retryDispatcher = new Agent()
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
