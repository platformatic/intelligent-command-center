const fp = require('fastify-plugin')
const { dumpPaths, dumpDBOperations, dumpLatencies } = require('../lib/dump')

async function plugin (fastify, opts) {
  fastify.get('/dump', {
    schema: {},
    handler: async (request, reply) => {
      const { coldStorage } = request

      // Check if risk-cold-storage is configured as an importer. If so we cannot dump the data
      // to cold storage, because it is not allowed to export data when it is configured as an importer.
      const statusResponse = await coldStorage.getStatus()
      if (statusResponse.isImporter) {
        return reply.code(503).send({
          error: 'Service Unavailable',
          message: 'Dump operation is disabled when risk-cold-storage is configured as an importer'
        })
      }

      request.log.info('Start dumping the store to postgres')
      const { store } = fastify

      await dumpPaths(coldStorage, store)
      await dumpDBOperations(coldStorage, store)
      await dumpLatencies(coldStorage, store)

      request.log.info('Finished dumping the store to postgres')
    }
  })
}

module.exports = fp(plugin, {
  name: 'dump',
  dependencies: ['store']
})
