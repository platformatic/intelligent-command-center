'use strict'

const createError = require('@fastify/error')

const ERROR_PREFIX = 'PLT_CACHE_MANAGER'

module.exports = {
  CacheEntryNotFound: createError(
    `${ERROR_PREFIX}_CACHE_ENTRY_NOT_FOUND`, 'Cache entry "%s" is not found', 404
  ),
  InvalidCacheKind: createError(
    `${ERROR_PREFIX}_INVALID_CACHE_KIND`, 'Invalid cache kind "%s"', 400
  )
}
