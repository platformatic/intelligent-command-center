'use strict'

const { request, getGlobalDispatcher, interceptors } = require('undici')
const fp = require('fastify-plugin')
const errors = require('../lib/errors')

class Machinist {
  #dispatcher
  #app

  constructor (machinistUrl, app) {
    this.url = machinistUrl
    this.#app = app

    this.#dispatcher = getGlobalDispatcher()
      .compose(interceptors.retry({
        maxRetries: 3,
        maxTimeout: 30000,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        statusCodes: [502, 503, 504, 429]
      }))
  }

  async getPodController (podId, namespace) {
    this.#app.log.info('Getting a pod controller id')

    const url = this.url + `/controllers/${namespace}`
    const { statusCode, body } = await request(url, {
      query: { podId },
      dispatcher: this.#dispatcher
    })

    if (statusCode !== 200) {
      const error = await body.text()
      this.#app.log.error(
        { error, podId, namespace },
        'Failed to get pod controller id'
      )
      throw new errors.FAILED_TO_GET_POD_CONTROLLER(error)
    }

    const { controllers } = await body.json()
    if (controllers.length === 0) {
      this.#app.log.error({ podId, namespace }, 'Pod has no controllers')
      throw new errors.FAILED_TO_GET_POD_CONTROLLER('Pod has no controllers')
    }

    return controllers[0]
  }

  async getController (controllerId, namespace, apiVersion, kind) {
    this.#app.log.info('Getting controller details')

    const url = this.url + `/controllers/${namespace}/${controllerId}`
    const { statusCode, body } = await request(url, {
      query: { kind, apiVersion },
      dispatcher: this.#dispatcher
    })

    if (statusCode !== 200) {
      const error = await body.text()
      this.#app.log.error(
        { error, controllerId, namespace, apiVersion, kind },
        'Failed to get controller details'
      )
      throw new errors.FAILED_TO_GET_CONTROLLER(error)
    }

    const data = await body.json()
    return data.controller
  }

  async updateController (
    controllerId,
    namespace,
    apiVersion,
    kind,
    replicas
  ) {
    this.#app.log.info('Updating controller replicas')

    const url = this.url + `/controllers/${namespace}/${controllerId}`
    const { statusCode, body } = await request(url, {
      method: 'POST',
      query: { kind, apiVersion },
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({ replicaCount: replicas }),
      dispatcher: this.#dispatcher
    })

    if (statusCode !== 200) {
      const error = await body.text()
      this.#app.log.error(
        { error, controllerId, namespace },
        'Failed to update controller replicas'
      )
      throw new errors.FAILED_TO_UPDATE_CONTROLLER(error)
    }
  }

  async getControllers () {
    this.#app.log.info('Getting all controllers')

    const url = this.url + '/controllers'
    const { statusCode, body } = await request(url, {
      dispatcher: this.#dispatcher
    })

    if (statusCode !== 200) {
      const error = await body.text()
      this.#app.log.error(
        { error },
        'Failed to get controllers'
      )
      throw new errors.FAILED_TO_GET_CONTROLLERS(error)
    }

    const data = await body.json()
    return data.controllers
  }
}

/** @param {import('fastify').FastifyInstance} app */
const plugin = fp(async function (app) {
  const machinist = new Machinist(
    app.env.PLT_MACHINIST_URL,
    app
  )
  app.decorate('machinist', machinist)
}, {
  name: 'machinist',
  dependencies: ['env']
})

module.exports = plugin
