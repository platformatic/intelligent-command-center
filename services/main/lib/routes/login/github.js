'use strict'
/// <reference path="../global.d.ts" />

const { randomBytes } = require('node:crypto')
const { callGHEndpoint } = require('../../utils')
const oauthPlugin = require('@fastify/oauth2')

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app, opts) {
  app.register(oauthPlugin, {
    name: 'githubOAuth2',
    scope: ['user:email'],
    credentials: {
      client: {
        id: opts.GITHUB_OAUTH_CLIENT_ID,
        secret: opts.GITHUB_OAUTH_CLIENT_SECRET
      },
      auth: oauthPlugin.GITHUB_CONFIGURATION
    },
    startRedirectPath: '/api/login/github',
    callbackUri: `${app.config.PLT_MAIN_URL}/api/login/github/callback`,
    cookie: {
      path: '/',
      secure: true,
      sameSite: 'none'
    },
    checkStateFunction: async (request) => {
      const state = request.query.state

      // classic browser login
      const stateCookie = request.cookies['oauth2-redirect-state']
      if (stateCookie && state === stateCookie) {
        return true
      }
      throw new Error('Invalid state')
    },
    generateStateFunction: async (request) => {
      const state = request.query.reqId
      if (!state) {
        return randomBytes(16).toString('base64url')
      }
      return state
    }
  })

  app.get('/api/login/github/callback', async (req, res) => {
    const { token } = await app.githubOAuth2.getAccessTokenFromAuthorizationCodeFlow(req)
    let primaryEmail = null
    const githubUser = await callGHEndpoint({ path: 'user', accessToken: token.access_token, method: 'GET', body: {} })
    if (githubUser.email) {
      primaryEmail = githubUser.email
    } else {
      const emails = await callGHEndpoint({ path: 'user/emails', accessToken: token.access_token, method: 'GET', body: {} })
      const filtered = emails.find((em) => em.primary === true)
      primaryEmail = filtered.email
    }
    if (!githubUser.id) {
      throw new Error(`Error while calling GitHub API: ${githubUser.message}`)
    }
    const externalId = `gh|${githubUser.id}`
    const user = {
      username: githubUser.login,
      full_name: githubUser.name,
      image: githubUser.avatar_url,
      email: primaryEmail,
      externalId
    }

    await app.afterOAuth2Flow(user, req, res)
  })
}
