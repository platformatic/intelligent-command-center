'use strict'

const path = require('node:path')
const { createReadStream } = require('node:fs')
const { Transform } = require('node:stream')
const { parse } = require('@fastify/cookie')
const fp = require('fastify-plugin')
const { MissingSessionCookie } = require('../errors')

async function plugin (app) {
  app.decorate('afterOAuth2Flow', async (user, req, res) => {
    const loginData = await app.loginUser({
      email: user.email,
      username: user.username,
      externalId: user.externalId,
      role: user.role || 'user'
    })
    app.log.info({ loggedInUser: loginData.user })

    if (req) {
      app.saveUserLoginEvent(req, loginData.user.id, loginData.user.username) // do now await this
    }

    const redirectTarget = app.config.PLT_MAIN_URL
    const { sessionCookie } = loginData
    if (!sessionCookie) {
      throw new MissingSessionCookie()
    }
    const parsed = parse(sessionCookie)
    const [key, value] = Object.entries(parsed)[0]
    if (app.config.DEV === true) {
      const stream = createReadStream(path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'dev-login.html'))
      const replacer = new Transform({
        transform (chunk, encoding, callback) {
          const str = chunk.toString()
          callback(null, str.replace('{{REDIRECT_URL}}', redirectTarget))
        }
      })
      return res.setCookie(key, value, {
        path: '/',
        httpOnly: true
      }).type('text/html').send(stream.pipe(replacer))
    }
    return res.setCookie(key, value, {
      path: '/',
      httpOnly: true
    }).redirect(redirectTarget)
  })
}
plugin[Symbol.for('skip-override')] = true

module.exports = fp(plugin, {
  name: 'authentication'
})
