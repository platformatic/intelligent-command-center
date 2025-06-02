'use strict'

const createError = require('@fastify/error')

const ERROR_PREFIX = 'PLT_TRAFFICANTE'

module.exports = {
  MissingApplicationId: createError(
    `${ERROR_PREFIX}_MISSING_APPLICATION_ID`, 'Missing application id'
  ),
  DomainNotFound: createError(
    `${ERROR_PREFIX}_DOMAIN_NOT_FOUND`, '"%s" domain not found'
  ),
  RecommendationNotFound: createError(
    `${ERROR_PREFIX}_RECOMMENDATION_NOT_FOUND`, 'Recommendation with id "%s" not found', 404
  ),
  RecommendationRouteNotFound: createError(
    `${ERROR_PREFIX}_RECOMMENDATION_ROUTE_NOT_FOUND`, 'Recommendation route with id "%s" not found', 404
  ),
  NoRecommendationToApply: createError(
    `${ERROR_PREFIX}_NO_RECOMMENDATION_TO_APPLY`, 'No recommendation to apply'
  ),
  FailedToParseJsonHeader: createError(
    `${ERROR_PREFIX}_FAILED_TO_PARSE_JSON_HEADER`, 'Failed to parse JSON header: "%s"'
  ),
  MissingRequestUrl: createError(
    `${ERROR_PREFIX}_MISSING_REQUEST_URL`, 'Missing request URL', 400
  ),
  MissingRequestHeaders: createError(
    `${ERROR_PREFIX}_MISSING_REQUEST_HEADERS`, 'Missing request headers', 400
  ),
  MissingResponseHeaders: createError(
    `${ERROR_PREFIX}_MISSING_RESPONSE_HEADERS`, 'Missing response headers', 400
  ),
  InvalidStatus: createError(
    `${ERROR_PREFIX}_INVALID_STATUS`, 'Invalid status "%s"', 400
  ),
  InvalidStatusFlow: createError(
    `${ERROR_PREFIX}_INVALID_STATUS_FLOW`, 'New status "%s" is not valid for recommendation in status "%s"', 400
  )
}
