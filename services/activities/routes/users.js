/// <reference path="../global.d.ts" />
'use strict'

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  app.get('/users', async (req, res) => {
    const { db, sql } = app.platformatic

    const users = await db.query(sql`SELECT DISTINCT user_id, username FROM activities ORDER BY username`)
    return users.map((row) => {
      return {
        id: row.user_id,
        username: row.username
      }
    })
  })
}
