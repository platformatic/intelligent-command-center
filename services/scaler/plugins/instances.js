'use strict'

const fp = require('fastify-plugin')
const { request } = require('undici')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  const controlPlaneUrl = process.env.PLT_CONTROL_PLANE_URL || 'http://control-plane.plt.local'

  app.decorate('getInstanceByPodId', async (podId, namespace) => {
    try {
      const url = `${controlPlaneUrl}/instances`
      const { statusCode, body } = await request(url, {
        method: 'GET',
        query: {
          'where.podId.eq': podId,
          'where.namespace.eq': namespace
        },
        headers: {
          'content-type': 'application/json'
        }
      })

      if (statusCode !== 200) {
        const error = await body.text()
        app.log.warn({ statusCode, url, error }, 'Failed to get instances from control-plane')
        throw new Error('Failed to get instances from control-plane')
      }

      const instances = await body.json()
      return instances.length > 0 ? instances[0] : null
    } catch (err) {
      app.log.warn({ err, podId, namespace }, 'Failed to get instance by pod ID')
    }
    return null
  })
}, {
  name: 'instances',
  dependencies: []
})
