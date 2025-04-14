/// <reference path="../../global.d.ts" />
'use strict'
const { request } = require('undici')

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  const services = app.config.PLT_SERVICES_WITH_UPDATE_ROUTE?.split(',').filter((s) => s !== '') || []
  app.get('/updates', async (req, res) => {
    const proms = await Promise.all(services.map((s) => {
      const url = `http://${s}.plt.local`
      return request(`${url}/updates`)
    }))
    const output = {}
    for (const [idx, resolved] of proms.entries()) {
      try {
        const body = await resolved.body.json()
        if (resolved.statusCode !== 200) {
          output[services[idx]] = []
        } else {
          output[body.serviceName] = body.updates
        }
      } catch (err) {
        req.log.error(err)
        output[services[idx]] = []
      }
    }
    return output
  })
}
