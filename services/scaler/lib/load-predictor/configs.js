'use strict'

const deepmerge = require('@fastify/deepmerge')({
  mergeArray (opts) {
    return (target, source) => opts.clone(source)
  }
})

async function getApplicationConfig (store, appId) {
  return store.getAppConfig(appId)
}

async function getServiceConfig (store, appId, serviceId, appConfig) {
  const override = await store.getServiceConfig(appId, serviceId)
  if (!override) return appConfig

  const result = { ...appConfig }
  if (override.elu) result.elu = { ...appConfig.elu, ...override.elu }
  if (override.heap) result.heap = { ...appConfig.heap, ...override.heap }
  return result
}

async function saveApplicationConfig (store, appId, override) {
  const current = await store.getAppConfig(appId)
  const merged = deepmerge(current, override)
  await store.setAppConfig(appId, merged)
}

async function saveServiceConfig (store, appId, serviceId, config) {
  await store.setServiceConfig(appId, serviceId, config)
}

module.exports = {
  getApplicationConfig,
  getServiceConfig,
  saveApplicationConfig,
  saveServiceConfig
}
