const fp = require('fastify-plugin')
const { dumpPaths, dumpDBOperations, dumpLatencies } = require('../lib/dump')

async function plugin (fastify, opts) {
  fastify.get('/dump', {
    schema: {},
    handler: async (request) => {
      request.log.info('Start dumping the store to postgeres')
      const { coldStorage } = request
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
