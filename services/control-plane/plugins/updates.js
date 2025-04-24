/// <reference path="../global.d.ts" />
'use strict'

const fp = require('fastify-plugin')
const { request } = require('undici')
const errors = require('./errors')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  const mainServiceUrl = app.env.PLT_MAIN_SERVICE_URL

  app.decorate('emitUpdate', async (message, ctx) => {
    const url = mainServiceUrl + '/api/updates'

    const { statusCode, body } = await request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
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
