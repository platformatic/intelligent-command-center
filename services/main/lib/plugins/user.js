'use strict'
const fastifyPlugin = require('fastify-plugin')
const { request } = require('undici')

const PLT_USER_MANAGER_URL = 'http://user-manager.plt.local'

/** @param {import('fastify').FastifyInstance} app */
async function userPlugin (app, opts) {
  app.get('/api/me', async (req, reply) => {
    const res = await request(`${PLT_USER_MANAGER_URL}/me`, {
      method: 'GET',
      headers: req.headers
    })
    const payload = await res.body.json()
    if (res.statusCode === 200) {
      return payload
    }
    return reply
      .code(res.statusCode)
      .send(payload)
  })
}
module.exports = fastifyPlugin(userPlugin)
