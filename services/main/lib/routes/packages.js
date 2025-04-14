'use strict'

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  app.get('/package_versions', async () => {
    const versions = await app.getLatestPlatformaticVersion([
      '@platformatic/composer',
      '@platformatic/db',
      '@platformatic/runtime',
      '@platformatic/service'
    ])
    return { package_versions: versions }
  })
}
