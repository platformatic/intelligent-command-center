'use strict'

const createError = require('@fastify/error')

const ERROR_PREFIX = 'PLT_SCALER'

module.exports = {
  SCALER_GENERIC_ERROR: createError(
    `${ERROR_PREFIX}_ERROR`, 'ERROR"'
  ),

  ALERT_PARSING_ERROR: createError(
    `${ERROR_PREFIX}_ALERT_PARSING_ERROR`, 'Failed to parse alert data: %s'
  )
}
