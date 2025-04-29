'use strict'
const { createError } = require('@fastify/error')

const ERROR_PREFIX = 'PLT_COMPLIANCE'

const errors = {
  UnauthorizedError: createError(`${ERROR_PREFIX}_UNAUTHORIZED`, 'Unauthorized', 401),
  MissingDataError: createError(`${ERROR_PREFIX}_RULE_DID_NOT_RUN`, 'Rule "%s" didn\'t run for missing data. Required data key is "%s".', 500),
  UnknownRuleError: createError(`${ERROR_PREFIX}_UNKNOWN_RULE`, 'Unknown rule "%s".', 500)
}

module.exports = errors
