'use strict'

const createError = require('@fastify/error')

const ERROR_PREFIX = 'PLT_SCALER'

module.exports = {
  SCALER_GENERIC_ERROR: createError(
    `${ERROR_PREFIX}_ERROR`, 'ERROR"'
  ),
  ALERT_PARSING_ERROR: createError(
    `${ERROR_PREFIX}_ALERT_PARSING_ERROR`, 'Failed to parse alert data: %s'
  ),
  FAILED_TO_GET_POD_CONTROLLER: createError(
    `${ERROR_PREFIX}_FAILED_TO_GET_POD_CONTROLLER`, 'Failed to get pod controller: %s'
  ),
  FAILED_TO_UPDATE_CONTROLLER: createError(
    `${ERROR_PREFIX}_FAILED_TO_UPDATE_CONTROLLER`, 'Failed to update controller: %s'
  ),
  APPLICATION_CONTROLLER_NOT_FOUND: createError(
    `${ERROR_PREFIX}_APPLICATION_CONTROLLER_NOT_FOUND`, 'Application controller not found for "%s" application'
  )
}
