'use strict'

const fp = require('fastify-plugin')

async function activitiesPlugin (app, options) {
  app.decorate('saveUserLoginEvent', async (req, userId, username) => {
    await req.activities?.postEvents({
      type: 'USER_LOGIN',
      userId,
      targetId: userId,
      username
    })
  })
}

module.exports = fp(activitiesPlugin)
