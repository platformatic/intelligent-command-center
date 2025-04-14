'use strict'

const { request } = require('undici')
const fp = require('fastify-plugin')

/** @param {import('fastify').FastifyInstance} app */
module.exports = fp(async function (app) {
  app.decorate('getLatestPlatformaticVersion', async function (pkgs) {
    const output = {}
    const proms = pkgs.map((pkg) => {
      return request(`https://registry.npmjs.org/${pkg}`)
    })

    const results = await Promise.all(proms)
    for (let i = 0; i < results.length; i++) {
      const packageName = pkgs[i]
      const res = results[i]
      if (res.statusCode === 200) {
        const json = await res.body.json()
        output[packageName] = json['dist-tags'].latest
      } else {
        output[packageName] = null
      }
    }
    return output
  })
})
