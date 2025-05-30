'use strict'

const fp = require('fastify-plugin')

async function plugin (app) {
  const { db } = app.platformatic

  async function getCurrentDBVersion () {
    const { sql } = db
    const res = await db.query(sql`select max(version) from versions`)
    const version = res[0]?.max || '0'
    return parseInt(version)
  }

  app.decorate('getCurrentDBVersion', getCurrentDBVersion)
}

module.exports = fp(plugin, {
  name: 'dbversion',
  dependencies: ['env']
})
