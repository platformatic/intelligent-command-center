'use strict'

const fp = require('fastify-plugin')
const { request } = require('undici')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  const controlPlaneUrl = app.env.PLT_CONTROL_PLANE_URL
  const mainServiceUrl = app.env.PLT_MAIN_SERVICE_URL
  const iccSessionSecret = app.env.PLT_ICC_SESSION_SECRET

  app.decorate('getApplicationInstances', async (applicationId) => {
    const url = `${controlPlaneUrl}/instances`
    const { statusCode, body } = await request(url, {
      method: 'GET',
      query: {
        'where.applicationId.eq': applicationId,
        'where.status.eq': 'running'
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
    return instances
  })

  app.decorate('getInstanceByPodId', async (podId, namespace) => {
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
  })

  app.decorate('sendPodCommand', async (podId, command, params = {}) => {
    const url = `${mainServiceUrl}/api/pods/${podId}/command`
    const { statusCode, body } = await request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-plt-icc-session-secret': iccSessionSecret
      },
      body: JSON.stringify({ command, params })
    })

    if (statusCode !== 200) {
      const err = await body.text()
      app.log.error({ err, podId, command, params }, 'Failed to request flamegraph')
      throw new Error(`Failed to send "${command}" command to pod`)
    }
  })
}, {
  name: 'instances',
  dependencies: []
})
