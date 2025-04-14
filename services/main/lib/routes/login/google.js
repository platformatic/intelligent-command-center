'use strict'
/// <reference path="../global.d.ts" />

const { request } = require('undici')
const oauthPlugin = require('@fastify/oauth2')
/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app, opts) {
  app.register(oauthPlugin, {
    name: 'googleOAuth2',
    scope: ['profile', 'email'],
    credentials: {
      client: {
        id: opts.GOOGLE_OAUTH_CLIENT_ID,
        secret: opts.GOOGLE_OAUTH_CLIENT_SECRET
      },
      auth: oauthPlugin.GOOGLE_CONFIGURATION
    },
    startRedirectPath: '/api/login/google',
    callbackUri: `${app.config.PLT_MAIN_URL}/login/google/callback`,
    cookie: {
      path: '/',
      secure: true,
      sameSite: 'none'
    }
  })

  app.get('/api/login/google/callback', async (req, res) => {
    const { token } = await app.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req)
    if (token.access_token) {
      const userInfoRes = await request('https://www.googleapis.com/oauth2/v1/userinfo', {
        method: 'GET',
        headers: {
          authorization: `Bearer ${token.access_token}`
        }
      })
      const userInfoData = await userInfoRes.body.json()
      const user = {
        username: userInfoData.name,
        full_name: userInfoData.name,
        image: userInfoData.picture,
        email: userInfoData.email,
        externalId: `google|${userInfoData.id}`
      }

      await app.afterOAuth2Flow(user, req, res)
    }
    // TODO: show error
  })
}
