/// <reference path="../../global.d.ts" />
'use strict'

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  app.get('/logout', async (req, res) => {
    const returnSetCookie = await app.logoutUser()
    return res
      .header('set-cookie', returnSetCookie)
      .redirect(app.config.PLT_MAIN_URL)
  })
}
