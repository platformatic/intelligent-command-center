'use strict'
/// <reference path="../global.d.ts" />

const fp = require('fastify-plugin')

/** @param {import('fastify').FastifyInstance} app */
async function sessionPlugin (app, opts) {
  app.register(require('@fastify/secure-session'), {
    sessionName: 'session',
    cookieName: 'auth-cookie-name',
    cookie: {
      path: '/'
    },
    key: app.config.PLT_USER_MANAGER_SESSION_SECRET_KEY
  })

  app.addHook('onRequest', async (req) => {
    if (req.session && req.session.get('user')) {
      req.headers['x-user'] = JSON.stringify(req.session.get('user'))
      if (req.session.get('ghAccessToken')) {
        req.headers['x-github-token'] = req.session.get('ghAccessToken')
      }
    }
  })
}

module.exports = fp(sessionPlugin, { name: 'session', dependencies: ['config', 'cookie'] })
