'use strict'

const querystring = require('node:querystring')
const { request, Agent, interceptors } = require('undici')
const fp = require('fastify-plugin')
const errors = require('./errors')

class Machinist {
  #dispatcher
  #prefix

  constructor (machinistUrl, provider) {
    this.url = machinistUrl
    this.#prefix = `/${provider}`

    this.#dispatcher = new Agent()
      .compose(interceptors.retry({
        maxRetries: 3,
        maxTimeout: 30000,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        statusCodes: [502, 503, 504, 429]
      }))
  }

  async getMachine (namespace, machineId, ctx) {
    ctx.logger.info('Getting machine details')

    const url = this.url + this.#prefix + `/machines/${namespace}/${machineId}`
    const { statusCode, body } = await request(url, {
      dispatcher: this.#dispatcher
    })

    if (statusCode !== 200) {
      const error = await body.text()
      ctx.logger.error({ error, machineId, namespace }, 'Failed to get machine details')
      throw new errors.FailedToGetMachineDetails(error)
    }

    return body.json()
  }

  async getMachines (namespace, labels, ctx) {
    ctx.logger.info('Getting machines')

    const serializedLabels = Object.entries(labels)
      .map(([key, value]) => `${key}=${value}`)

    const query = querystring.stringify({ labels: serializedLabels })
    const url = this.url + this.#prefix + `/machines/${namespace}?${query}`
    const { statusCode, body } = await request(url, {
      dispatcher: this.#dispatcher
    })

    if (statusCode !== 200) {
      const error = await body.text()
      ctx.logger.error({ error, namespace, labels }, 'Failed to get machines')
      throw new errors.FailedToGetMachineState(error)
    }

    return body.json()
  }

  async listGateways (namespace, ctx) {
    ctx.logger.info('Listing gateways')

    const url = this.url + this.#prefix + `/gateway/gateways/${namespace}`
    const { statusCode, body } = await request(url, {
      dispatcher: this.#dispatcher
    })

    if (statusCode !== 200) {
      const error = await body.text()
      ctx.logger.error({ error, namespace }, 'Failed to list gateways')
      throw new errors.FailedToListGateways(error)
    }

    return body.json()
  }

  async getServicesByLabels (namespace, labels, ctx) {
    ctx.logger.info('Getting services by labels')

    const serializedLabels = Object.entries(labels)
      .map(([key, value]) => `${key}=${value}`)

    const query = querystring.stringify({ labels: serializedLabels })
    const url = this.url + this.#prefix + `/services/${namespace}?${query}`
    const { statusCode, body } = await request(url, {
      dispatcher: this.#dispatcher
    })

    if (statusCode !== 200) {
      const error = await body.text()
      ctx.logger.error({ error, namespace, labels }, 'Failed to get services by labels')
      throw new errors.FailedToGetServicesByLabels(error)
    }

    return body.json()
  }

  async applyHTTPRoute (namespace, httpRoute, ctx) {
    ctx.logger.info('Applying HTTPRoute')

    const url = this.url + this.#prefix + `/gateway/httproutes/${namespace}`
    const { statusCode, body } = await request(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(httpRoute),
      dispatcher: this.#dispatcher
    })

    if (statusCode !== 200) {
      const error = await body.text()
      ctx.logger.error({ error, namespace }, 'Failed to apply HTTPRoute')
      throw new errors.FailedToApplyHTTPRoute(error)
    }

    return body.json()
  }

  async applyDeployment (namespace, deployment, ctx) {
    ctx.logger.info('Applying Deployment')

    const url = this.url + this.#prefix + `/controllers/${namespace}`
    const { statusCode, body } = await request(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deployment),
      dispatcher: this.#dispatcher
    })

    if (statusCode !== 200) {
      const error = await body.text()
      ctx.logger.error({ error, namespace }, 'Failed to apply Deployment')
      throw new errors.FailedToApplyDeployment(error)
    }

    return body.json()
  }

  async applyService (namespace, service, ctx) {
    ctx.logger.info('Applying Service')

    const url = this.url + this.#prefix + `/services/${namespace}`
    const { statusCode, body } = await request(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(service),
      dispatcher: this.#dispatcher
    })

    if (statusCode !== 200) {
      const error = await body.text()
      ctx.logger.error({ error, namespace }, 'Failed to apply Service')
      throw new errors.FailedToApplyService(error)
    }

    return body.json()
  }

  async getHTTPRoute (namespace, name, ctx) {
    ctx.logger.info('Getting HTTPRoute')

    const url = this.url + this.#prefix + `/gateway/httproutes/${namespace}/${name}`
    const { statusCode, body } = await request(url, {
      dispatcher: this.#dispatcher
    })

    // Route not found is a normal state (e.g. advise before the external actor
    // applies): return null so the caller degrades quietly instead of erroring.
    if (statusCode === 404) {
      body.dump()
      return null
    }

    if (statusCode !== 200) {
      const error = await body.text()
      ctx.logger.error({ error, namespace, name }, 'Failed to get HTTPRoute')
      throw new errors.FailedToGetHTTPRoute(error)
    }

    return body.json()
  }

  async deleteHTTPRoute (namespace, name, ctx) {
    ctx.logger.info('Deleting HTTPRoute')

    const url = this.url + this.#prefix + `/gateway/httproutes/${namespace}/${name}`
    const { statusCode, body } = await request(url, {
      method: 'DELETE',
      dispatcher: this.#dispatcher
    })

    if (statusCode !== 200) {
      const error = await body.text()
      ctx.logger.error({ error, namespace, name }, 'Failed to delete HTTPRoute')
      throw new errors.FailedToDeleteHTTPRoute(error)
    }
  }

  async updateControllerReplicas (namespace, controllerId, replicas, providerMetadata, ctx) {
    ctx.logger.info({ controllerId, namespace, replicas }, 'Updating controller replicas')

    const url = this.url + this.#prefix + `/controllers/${namespace}/${controllerId}`
    const { statusCode, body } = await request(url, {
      method: 'POST',
      query: providerMetadata,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ replicas }),
      dispatcher: this.#dispatcher
    })

    if (statusCode !== 200) {
      const error = await body.text()
      ctx.logger.error({ error, controllerId, namespace }, 'Failed to update controller')
      throw new errors.FailedToUpdateController(error)
    }

    return body.json()
  }

  async deleteController (namespace, name, providerMetadata, ctx) {
    ctx.logger.info({ namespace, name }, 'Deleting controller')

    const url = this.url + this.#prefix + `/controllers/${namespace}/${name}`
    const { statusCode, body } = await request(url, {
      method: 'DELETE',
      query: providerMetadata,
      dispatcher: this.#dispatcher
    })

    if (statusCode !== 200) {
      const error = await body.text()
      ctx.logger.error({ error, namespace, name }, 'Failed to delete controller')
      throw new errors.FailedToDeleteDeployment(error)
    }

    return body.json()
  }

  async deleteService (namespace, name, ctx) {
    ctx.logger.info({ namespace, name }, 'Deleting Service')

    const url = this.url + this.#prefix + `/services/${namespace}/${name}`
    const { statusCode, body } = await request(url, {
      method: 'DELETE',
      dispatcher: this.#dispatcher
    })

    if (statusCode !== 200) {
      const error = await body.text()
      ctx.logger.error({ error, namespace, name }, 'Failed to delete Service')
      throw new errors.FailedToDeleteService(error)
    }

    return body.json()
  }

  async setMachineLabels (namespace, machineId, labels, ctx) {
    ctx.logger.info('Setting machine labels')

    const url = this.url + this.#prefix + `/machines/${namespace}/${machineId}/labels`
    const { statusCode, body } = await request(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ labels }),
      dispatcher: this.#dispatcher
    })

    if (statusCode !== 200) {
      const error = await body.text()
      throw new errors.FailedToSetMachineLabels(error)
    }
  }
}

/** @param {import('fastify').FastifyInstance} app */
const plugin = fp(async function (app) {
  const machinist = new Machinist(
    app.env.PLT_MACHINIST_URL,
    app.env.PLT_MACHINIST_PROVIDER
  )
  app.decorate('machinist', machinist)
}, {
  name: 'machinist',
  dependencies: ['env']
})

module.exports = plugin
