'use strict'
const { createError } = require('@fastify/error')

const ERROR_PREFIX = 'PLT_COMPLIANCE'

const errors = {
  UnauthorizedError: createError(`${ERROR_PREFIX}_UNAUTHORIZED`, 'Unauthorized', 401),
  MissingDataError: createError(`${ERROR_PREFIX}_RULE_DID_NOT_RUN`, 'Rule "%s" didn\'t run for missing data. Required data key is "%s".', 500),
  UnknownRuleError: createError(`${ERROR_PREFIX}_UNKNOWN_RULE`, 'Unknown rule "%s".', 500),
  InstanceNotFound: createError(`${ERROR_PREFIX}_INSTANCE_NOT_FOUND`, 'Instance "%s" not found.', 404),
  MissingMachineAuthContext: createError(`${ERROR_PREFIX}_MISSING_MACHINE_AUTH_CONTEXT`, 'Missing machine auth context.', 403),
  MachineNamespaceNotFound: createError(`${ERROR_PREFIX}_MACHINE_NAMESPACE_NOT_FOUND`, 'Machine namespace not found.', 403),
  MachineIdNotFound: createError(`${ERROR_PREFIX}_MACHINE_ID_NOT_FOUND`, 'Machine not found.', 403)
}

module.exports = errors
