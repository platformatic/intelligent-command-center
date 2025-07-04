'use strict'

const fp = require('fastify-plugin')
const { DemoLoginError } = require('../errors')

/** @param {import('fastify').FastifyInstance} app */
async function demoLogin (app, opts) {
  app.get('/api/login/demo', async (req, res) => {
    if (!process.env.VITE_SUPPORTED_LOGINS?.includes('demo')) throw new DemoLoginError()

    const demoUser = {
      email: 'demo@platformatic.dev',
      username: 'test-user',
      full_name: 'Test User',
      externalId: 'plt|12345',
      image: 'https://avatar.iran.liara.run/public',
      role: 'admin'
    }

    await app.afterOAuth2Flow(demoUser, req, res)
  })

  app.post('/api/login/demo', async (req, res) => {
    if (process.env.DEMO_LOGIN !== 'true') throw new DemoLoginError()

    const { password } = req.body

    let success = false
    if (password === process.env.PLT_MAIN_SITE_PASSWORD) success = true

    return { success }
  })
}

module.exports = fp(demoLogin)
