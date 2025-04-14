'use strict'
const { createError } = require('@fastify/error')

const ERROR_PREFIX = 'PLT_USER_MANAGER'

const errors = {
  UnknownUserError: createError(
    `${ERROR_PREFIX}_UNKNOWN_USER`, 'Unknown user %s', 403
  ),
  MissingCredentialsError: createError(
    `${ERROR_PREFIX}_MISSING_CREDENTIALS`, 'Missing session cookie', 400
  )
}

module.exports = errors
