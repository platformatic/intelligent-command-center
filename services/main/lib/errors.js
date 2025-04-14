'use strict'
const { createError } = require('@fastify/error')

const ERROR_PREFIX = 'PLT_MAIN'

const errors = {
  DemoLoginError: createError(
    `${ERROR_PREFIX}_DEMO_LOGIN_ERROR`, 'Please login with Google or GitHub.', 400
  ),
  UnauthorizedRouteError: createError(
    `${ERROR_PREFIX}_UNAUTHORIZED`, 'You are not authorized to perform %s %s', 403
  ),
  MissingSessionCookie: createError(
    `${ERROR_PREFIX}_MISSING_SESSION_COOKIE`, 'Missing session cookie from user-manager'
  ),
  LoginError: createError(
    `${ERROR_PREFIX}_LOGIN_ERROR`, 'Login error: %s'
  ),
  UserManagerError: createError(
    `${ERROR_PREFIX}_USER_MANAGER_ERROR`, 'Error from user-manager: %s'
  ),
  UnknownResponseFromAuthorizeError: createError(
    `${ERROR_PREFIX}_UNKNOWN_RESPONSE_FROM_AUTHORIZE_ENDPOINT`,
    'Unknown response from /authorize endpoint: %s',
    401
  ),
  InvalidApiKeyError: createError(
    `${ERROR_PREFIX}_INVALID_API_KEY_ERROR`, 'Invalid API key provided.', 401
  ),
  MissingAuthCredentialsError: createError(
    `${ERROR_PREFIX}_MISSING_AUTH_CREDENTIALS`, 'Missing authorization credentials', 401
  )
}

module.exports = errors
