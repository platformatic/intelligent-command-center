'use strict'

const { request, getGlobalDispatcher, interceptors } = require('undici')
const fp = require('fastify-plugin')
const errors = require('./errors')

class Machinist {
  #dispatcher

  constructor (machinistUrl) {
    this.url = machinistUrl

    this.#dispatcher = getGlobalDispatcher()
      .compose(interceptors.retry({
        maxRetries: 3,
        maxTimeout: 30000,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        statusCodes: [502, 503, 504, 429]
      }))
  }

  async getPodDetails (podId, namespace, ctx) {
    ctx.logger.info('Getting a list of machines')

    const url = this.url + `/pods/${namespace}/${podId}`
    const { statusCode, body } = await request(url, {
      dispatcher: this.#dispatcher
    })

    if (statusCode !== 200) {
      const error = await body.text()
      throw new errors.FailedToGetPodDetails(error)
    }

    const podDetails = await body.json()
    return podDetails
  }
}

/** @param {import('fastify').FastifyInstance} app */
const plugin = fp(async function (app) {
  const machinist = new Machinist(
    app.env.PLT_MACHINIST_URL
  )
  app.decorate('machinist', machinist)
}, {
  name: 'machinist',
  dependencies: ['env']
})

module.exports = plugin
