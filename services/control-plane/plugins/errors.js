'use strict'

const createError = require('@fastify/error')

const ERROR_PREFIX = 'PLT_CONTROL_PLANE'

module.exports = {
  GenerationNotFound: createError(
    `${ERROR_PREFIX}_GENERATION_NOT_FOUND`, 'Generation with id "%s" not found', 404
  ),
  GenerationAlreadyExists: createError(
    `${ERROR_PREFIX}_GENERATION_ALREADY_EXISTS`, 'Generation with a version "%s" already exists'
  ),
  NoGenerationsFound: createError(
    `${ERROR_PREFIX}_NO_GENERATIONS_FOUND`, 'No generations found'
  ),
  ApplicationNotFound: createError(
    `${ERROR_PREFIX}_APPLICATION_NOT_FOUND`, 'Application with id "%s" not found', 404
  ),
  ApplicationConfigNotFound: createError(
    `${ERROR_PREFIX}_APPLICATION_SETTINGS_NOT_FOUND`, 'Config for "%s" application not found'
  ),
  DeploymentNotFound: createError(
    `${ERROR_PREFIX}_DEPLOYMENT_NOT_FOUND`, 'Deployment with id "%s" not found', 404
  ),
  DeploymentHasNoInstances: createError(
    `${ERROR_PREFIX}_DEPLOYMENT_HAS_NO_INSTANCES`, 'Deployment with id "%s" has no instances', 404
  ),
  FailedToCreateValkeyUser: createError(
    `${ERROR_PREFIX}_FAILED_TO_CREATE_VALKEY_USER`, 'Failed to create Valkey user: %s'
  ),
  FailedToCreateElastiCacheUser: createError(
    `${ERROR_PREFIX}_FAILED_TO_CREATE_ELASTICACHE_USER`, 'Failed to create ElastiCache user: %s'
  ),
  FailedToRemoveValkeyUser: createError(
    `${ERROR_PREFIX}_FAILED_TO_REMOVE_VALKEY_USER`, 'Failed to remove Valkey user: %s'
  ),
  InstanceNotFound: createError(
    `${ERROR_PREFIX}_INSTANCE_NOT_FOUND`, 'Application instance "%s" not found', 404
  ),
  PodAssignedToDifferentImage: createError(
    `${ERROR_PREFIX}_POD_ASSIGNED_TO_DIFFERENT_IMAGE`,
    'Pod "%s" is assigned to a different image "%s"'
  ),
  PodAssignedToDifferentApplication: createError(
    `${ERROR_PREFIX}_POD_ASSIGNED_TO_DIFFERENT_APPLICATION`,
    'Pod "%s" is assigned to a different application "%s"'
  ),
  FailedToGetLock: createError(
    `${ERROR_PREFIX}_FAILED_TO_GET_LOCK`, 'Failed to get lock"'
  ),
  CannotCreateApplicationWithoutGenerationLock: createError(
    `${ERROR_PREFIX}_CANNOT_CREATE_APPLICATION_WITHOUT_GENERATION_LOCK`,
    'Cannot create an application without generation lock'
  ),
  CannotCreateGenerationWithoutGenerationLock: createError(
    `${ERROR_PREFIX}_CANNOT_CREATE_GENERATION_WITHOUT_GENERATION_LOCK`,
    'Cannot create a generation without generation lock'
  ),
  UnsupportedCacheProvider: createError(
    `${ERROR_PREFIX}_UNSUPPORTED_CACHE_PROVIDER`,
    'Requested Cache provider, "%s", is not supported'
  ),
  CacheProviderNotSetup: createError(
    `${ERROR_PREFIX}_CACHE_PROVIDER_NOT_SETUP`,
    'The setup function was not run for this Cache provider'
  ),
  FailedToGetInstanceDetails: createError(
    `${ERROR_PREFIX}_FAILED_TO_GET_INSTANCE_DETAILS`,
    'Failed to get application instance details'
  ),
  FailedToSaveUpdate: createError(
    `${ERROR_PREFIX}_FAILED_TO_SAVE_UPDATE`,
    'Failed to save update: %s'
  ),
  CannotCreateComplianceRule: createError(
    `${ERROR_PREFIX}_CANNOT_CREATE_COMPLIANCE_RULE`,
    'Failed to create compliance rule: (%s) %s'
  ),
  MissingK8sAuthContext: createError(
    `${ERROR_PREFIX}_MISSING_K8S_AUTH_CONTEXT`,
    'Missing K8s auth context for pod "%s"',
    401
  ),
  PodIdNotAuthorized: createError(
    `${ERROR_PREFIX}_POD_ID_NOT_AUTHORIZED`,
    'Request pod id "%s" does not match with a jwt pod id "%s"',
    401
  ),
  PodNamespaceNotFound: createError(
    `${ERROR_PREFIX}_POD_NAMESPACE_NOT_FOUND`,
    'Pod "%s" namespace not found',
    400
  ),
  FailedToDecryptValkeyPassword: createError(
    `${ERROR_PREFIX}_FAILED_TO_DECRYPT_VALKEY_PASSWORD`,
    'Failed to decrypt valkey password for an application "%s"'
  ),
  FailedToGetPodDetails: createError(
    `${ERROR_PREFIX}_FAILED_TO_GET_POD_DETAILS`,
    'Failed to get pod details'
  ),
  FailedToSetPodLabels: createError(
    `${ERROR_PREFIX}_FAILED_TO_SET_POD_LABELS`,
    'Failed to set pod labels: %s'
  ),
  FailedToGetK8sState: createError(
    `${ERROR_PREFIX}_FAILED_TO_GET_K8S_STATE`,
    'Failed to get k8s state: %s'
  )
}
