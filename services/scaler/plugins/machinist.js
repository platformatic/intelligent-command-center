'use strict'

const { request, getGlobalDispatcher, interceptors } = require('undici')
const fp = require('fastify-plugin')
const errors = require('../lib/errors')

class Machinist {
  #app
  #dispatcher
  #abortControllers
  #prefix

  constructor (machinistUrl, provider, app) {
    this.url = machinistUrl
    this.#app = app
    this.#abortControllers = new Map()
    this.#prefix = `/${provider}`

    this.#dispatcher = getGlobalDispatcher()
      .compose(interceptors.retry({
        maxRetries: 5,
        maxTimeout: 30000,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        statusCodes: [502, 503, 504, 429]
      }))
  }

  async getPodController (machineId, namespace) {
    this.#app.log.info('Getting controller for machine')

    const url = this.url + this.#prefix + `/controllers/${namespace}`
    const { statusCode, body } = await request(url, {
      query: { machineId },
      dispatcher: this.#dispatcher
    })

    if (statusCode !== 200) {
      const error = await body.text()
      this.#app.log.error(
        { error, machineId, namespace },
        'Failed to get machine controller'
      )
      throw new errors.FAILED_TO_GET_POD_CONTROLLER(error)
    }

    const { controllers } = await body.json()
    if (controllers.length === 0) {
      this.#app.log.error({ machineId, namespace }, 'Machine has no controllers')
      throw new errors.FAILED_TO_GET_POD_CONTROLLER('Machine has no controllers')
    }

    return controllers[0]
  }

  async getController (controllerId, namespace, providerMetadata = {}) {
    this.#app.log.debug('Getting controller details')

    const url = this.url + this.#prefix + `/controllers/${namespace}/${controllerId}`
    const { statusCode, body } = await request(url, {
      query: providerMetadata,
      dispatcher: this.#dispatcher
    })

    if (statusCode !== 200) {
      const error = await body.text()
      this.#app.log.error(
        { error, controllerId, namespace },
        'Failed to get controller details'
      )
      throw new errors.FAILED_TO_GET_CONTROLLER(error)
    }

    const data = await body.json()
    return data.controller
  }

  async getControllerWithPods (controllerId, namespace, providerMetadata = {}) {
    return this.getController(controllerId, namespace, providerMetadata)
  }

  async updateController (controllerId, namespace, replicas, providerMetadata = {}) {
    const reqId = `update-${namespace}-${controllerId}`

    const prevSignal = this.#abortControllers.get(reqId)
    if (prevSignal) {
      this.#app.log.info('Aborting previous updateController request')
      prevSignal.abort()
    }

    const ac = new AbortController()
    this.#abortControllers.set(reqId, ac)
    this.#app.log.info('Updating controller replicas')

    const url = this.url + this.#prefix + `/controllers/${namespace}/${controllerId}`

    let response = null
    try {
      response = await request(url, {
        method: 'POST',
        query: providerMetadata,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ replicas }),
        dispatcher: this.#dispatcher,
        signal: ac.signal
      })
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new errors.SCALE_REQUEST_SUPERSEDED(controllerId, namespace)
      }
      throw err
    } finally {
      this.#abortControllers.delete(reqId)
    }

    const { statusCode, body } = response

    if (statusCode !== 200) {
      const error = await body.text()
      this.#app.log.error(
        { error, controllerId, namespace },
        'Failed to update controller replicas'
      )
      throw new errors.FAILED_TO_UPDATE_CONTROLLER(error)
    }
  }

  async getControllerLabels (name, namespace, providerMetadata = {}) {
    this.#app.log.debug('Getting controller labels', { name, namespace })

    try {
      const controller = await this.getController(name, namespace, providerMetadata)
      return controller?.labels || {}
    } catch (error) {
      this.#app.log.error('Error in getControllerLabels', {
        name,
        namespace,
        error: error.message
      })
      throw error
    }
  }
}

/** @param {import('fastify').FastifyInstance} app */
const plugin = fp(async function (app) {
  const machinist = new Machinist(
    app.env.PLT_MACHINIST_URL,
    app.env.PLT_MACHINIST_PROVIDER,
    app
  )
  app.decorate('machinist', machinist)
}, {
  name: 'machinist',
  dependencies: ['env']
})

module.exports = plugin
