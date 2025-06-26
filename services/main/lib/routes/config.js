/// <reference path="../../global.d.ts" />
'use strict'

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  app.get('/config', async (req, res) => {
    const config = [
      { env: 'PLT_FEATURE_CACHE', name: 'Cache', slug: 'cache' },
      { env: 'PLT_FEATURE_CACHE_RECOMMENDATIONS', name: 'Cache Recommendations', slug: 'cache-recommendations' },
      { env: 'PLT_FEATURE_RISK_SERVICE_DUMP', name: 'Risk Service Dump', slug: 'risk-service-dump' },
      { env: 'PLT_FEATURE_FFC', name: 'Fusion, Fission & Cascade', slug: 'fusion-fission-cascade' }
    ]

    const output = {}
    config.forEach((item) => {
      output[item.slug] = !!app.config[item.env]
    })

    return res.send(output)
  })
}
