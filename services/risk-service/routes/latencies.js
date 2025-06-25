'use strict'

const fp = require('fastify-plugin')

const mergeMeans = (meansFromColdStorage, meansFromRedis) => {
  const means = {}
  const allMeans = [...meansFromColdStorage, ...meansFromRedis]
  for (const lat of allMeans) {
    const { from, to, mean, count } = lat
    const key = `${from}||${to}`
    if (!means[key]) {
      means[key] = { from, to, mean, count }
    } else {
      // We already have a mean for this key, which can be from readis/coldstorage or different dumps on
      // the same time window. In this case we need to sum up the count and recalculate the mean
      const newCount = means[key].count + count
      const newMean = (means[key].mean * means[key].count + mean * count) / newCount
      means[key].mean = newMean
      means[key].count = newCount
    }
  }
  return Object.values(means)
}

// TODO: add a proper JSON schema. Now we don't know if this API will say here or be moved
// so let's wait before completing it
async function plugin (fastify) {
  fastify.get('/latencies', {
    handler: async (request) => {
      const { coldStorage } = request
      const { store } = fastify

      // Check if risk-cold-storage is configured as an importer
      const statusResponse = await coldStorage.getStatus()

      const pathsFromColdStorage = await coldStorage.getLatenciesWindow()

      if (statusResponse.isImporter) {
        // When isImporter is true, only return latencies from cold storage, so the "imported" ones.
        // the dump is disabled when importes, so all the data in the cold storage are imported from
        // another env
        request.log.info({
          pathsFromColdStorage,
          pathsFromRedis: [],
          allLatencies: pathsFromColdStorage
        }, 'latencies from risk-service (importer mode)')
        return pathsFromColdStorage
      }

      // Otherwise, merge latencies from both sources
      const pathsFromRedis = await store.getAllLatencyValues()
      const allLatencies = mergeMeans(pathsFromColdStorage, pathsFromRedis)
      request.log.info({
        pathsFromColdStorage,
        pathsFromRedis,
        allLatencies
      }, 'latencies from risk-service')
      return allLatencies
    }
  })
}

module.exports = fp(plugin, {
  name: 'latencies-api',
  dependencies: ['store']
})
