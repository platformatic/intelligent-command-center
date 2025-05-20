'use strict'

const querystring = require('node:querystring')
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

  async getK8sState (namespace, labels, ctx) {
    ctx.logger.info('Getting a k8s state')

    const serializedLabels = Object.entries(labels)
      .map(([key, value]) => `${key}=${value}`)

    const query = querystring.stringify({ podSelector: serializedLabels })
    const url = this.url + `/state/${namespace}?${query}`
    const { statusCode, body } = await request(url, {
      dispatcher: this.#dispatcher
    })

    if (statusCode !== 200) {
      const error = await body.text()
      ctx.logger.error(
        { error, namespace, labels },
        'Failed to get k8s state'
      )
      throw new errors.FailedToGetK8sState(error)
    }

    const state = await body.json()
    return state
  }

  async getPodDetails (podId, namespace, ctx) {
    ctx.logger.info('Getting a list of pods')

    const url = this.url + `/pods/${namespace}/${podId}`
    const { statusCode, body } = await request(url, {
      dispatcher: this.#dispatcher
    })

    if (statusCode !== 200) {
      const error = await body.text()
      ctx.logger.error(
        { error, podId, namespace },
        'Failed to get pod details'
      )
      throw new errors.FailedToGetPodDetails(error)
    }

    const podDetails = await body.json()
    return podDetails
  }

  async setPodLabels (podId, namespace, labels, ctx) {
    ctx.logger.info('Setting pod labels')

    const url = this.url + `/pods/${namespace}/${podId}/labels`
    const { statusCode, body } = await request(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ labels }),
      dispatcher: this.#dispatcher
    })

    if (statusCode !== 200) {
      const error = await body.text()
      throw new errors.FailedToSetPodLabels(error)
    }
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
