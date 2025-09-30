'use strict'

/**
 * Shared utility for syncing scaler configuration from Kubernetes labels
 */

/**
 * Syncs scaler config from labels for a single application
 * @param {object} app - Fastify app instance
 * @param {string} applicationId - Application ID
 * @param {object} labels - Kubernetes labels object
 * @param {object} logger - Logger instance
 * @returns {Promise<object|null>} - Updated config or null if no changes
 */
async function syncScalerConfigFromLabels (app, applicationId, labels, logger) {
  const scalerMinLabel = app.env.PLT_SCALER_POD_MIN_LABEL
  const scalerMaxLabel = app.env.PLT_SCALER_POD_MAX_LABEL

  const scalerMin = labels[scalerMinLabel]
  const scalerMax = labels[scalerMaxLabel]

  if (!scalerMin && !scalerMax) {
    logger.debug({ applicationId }, 'No scaler min/max labels found, skipping config sync')
    return null
  }

  const minPods = scalerMin ? parseInt(scalerMin, 10) : undefined
  const maxPods = scalerMax ? parseInt(scalerMax, 10) : undefined

  if (scalerMin && (isNaN(minPods) || minPods < 1)) {
    logger.warn({
      applicationId,
      scalerMin
    }, 'Invalid scaler-min value, skipping config sync')
    return null
  }

  if (scalerMax && (isNaN(maxPods) || maxPods < 1)) {
    logger.warn({
      applicationId,
      scalerMax
    }, 'Invalid scaler-max value, skipping config sync')
    return null
  }

  if (minPods && maxPods && minPods > maxPods) {
    logger.warn({
      applicationId,
      minPods,
      maxPods
    }, 'scaler-min is greater than scaler-max, skipping config sync')
    return null
  }

  const existingConfig = await app.getScaleConfig(applicationId)

  const defaultMinPods = app.env.PLT_SCALER_POD_MIN_DEFAULT_VALUE
  const defaultMaxPods = app.env.PLT_SCALER_POD_MAX_DEFAULT_VALUE

  const newConfig = {
    minPods: minPods !== undefined ? minPods : (existingConfig?.minPods ?? defaultMinPods),
    maxPods: maxPods !== undefined ? maxPods : (existingConfig?.maxPods ?? defaultMaxPods)
  }

  if (newConfig.minPods > newConfig.maxPods) {
    logger.warn({
      applicationId,
      minPods: newConfig.minPods,
      maxPods: newConfig.maxPods
    }, 'minPods is greater than maxPods after applying config, skipping config sync')
    return null
  }

  const hasChanges = (
    (minPods !== undefined && newConfig.minPods !== existingConfig?.minPods) ||
    (maxPods !== undefined && newConfig.maxPods !== existingConfig?.maxPods)
  )

  if (!hasChanges) {
    logger.debug({
      applicationId,
      newConfig,
      existingConfig
    }, 'No changes needed for scaler config')
    return null
  }

  await app.saveScaleConfig(applicationId, newConfig)

  logger.info({
    applicationId,
    oldConfig: existingConfig,
    newConfig,
    fromLabels: { scalerMin, scalerMax }
  }, 'Updated scaler config from labels')

  return {
    newConfig,
    oldConfig: existingConfig,
    hasChanges: true
  }
}

module.exports = {
  syncScalerConfigFromLabels
}
