import createError from '@fastify/error'

const ERROR_PREFIX = 'PLT_CLUSTER_MANAGER'

export const OptimizeError = createError(
  `${ERROR_PREFIX}_OPTIMIZE_ERROR`, 'Error optimizing taxonomy "%s"', 400
)
export const RecommendationCalculating = createError(
  `${ERROR_PREFIX}_RECOMMENDATION_CALCULATING`, 'Recommendation calculation already in progress', 429
)
export const RecommendationNotFound = createError(
  `${ERROR_PREFIX}_RECOMMENDATION_NOT_FOUND`, 'Recommendation %s not found', 404
)
export const InvalidStatus = createError(
  `${ERROR_PREFIX}_INVALID_STATUS`, 'Invalid status "%s"', 400
)
export const InvalidStatusFlow = createError(
  `${ERROR_PREFIX}_INVALID_STATUS_FLOW`, 'New status "%s" is not valid for recommendation in status "%s"', 400
)
