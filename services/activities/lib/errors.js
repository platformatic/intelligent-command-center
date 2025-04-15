'use strict'
const { createError } = require('@fastify/error')

const ERROR_PREFIX = 'PLT_ACTIVITIES'

const errors = {
  UnauthorizedError: createError(`${ERROR_PREFIX}_UNAUTHORIZED`, 'Unauthorized', 401),
  MissingTargetError: createError(`${ERROR_PREFIX}_MISSING_TARGET`, 'Either applicationId or targetId field must be specified.', 400),
  MissingObjectTypeError: createError(`${ERROR_PREFIX}_MISSING_OBJECT_TYPE`, 'objectType field must be specified.', 400),
  MissingEventError: createError(`${ERROR_PREFIX}_MISSING_EVENT`, 'event field must be specified.', 400),
  UnknownEventTypeError: createError(`${ERROR_PREFIX}_UNKNOWN_EVENT_TYPE`, 'Unknown event type \'%s\'.', 400)
}

module.exports = errors
