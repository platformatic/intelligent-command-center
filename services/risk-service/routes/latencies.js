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
async function plugin (fastify, opts) {
  fastify.get('/latencies', {
    handler: async (request) => {
      const { coldStorage } = request
      const { store } = fastify
      const pathsFromColdStorage = await coldStorage.getLatenciesWindow()
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
