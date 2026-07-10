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
  ApplicationAlreadyExists: createError(
    `${ERROR_PREFIX}_APPLICATION_ALREADY_EXISTS`, 'Application with name "%s" already exists', 409
  ),
  InvalidApplicationName: createError(
    `${ERROR_PREFIX}_INVALID_APPLICATION_NAME`, 'Application name must not be empty', 400
  ),
  SkewProtectionDisabled: createError(
    `${ERROR_PREFIX}_SKEW_PROTECTION_DISABLED`,
    'Skew protection feature is not enabled (PLT_FEATURE_SKEW_PROTECTION)',
    501
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
  MachineAssignedToDifferentImage: createError(
    `${ERROR_PREFIX}_MACHINE_ASSIGNED_TO_DIFFERENT_IMAGE`,
    'Machine "%s" is assigned to a different image "%s"'
  ),
  MachineAssignedToDifferentApplication: createError(
    `${ERROR_PREFIX}_MACHINE_ASSIGNED_TO_DIFFERENT_APPLICATION`,
    'Machine "%s" is assigned to a different application "%s"',
    400
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
    'Failed to create compliance rule: %s'
  ),
  MissingMachineAuthContext: createError(
    `${ERROR_PREFIX}_MISSING_MACHINE_AUTH_CONTEXT`,
    'Missing machine auth context for machine "%s"',
    401
  ),
  MachineIdNotAuthorized: createError(
    `${ERROR_PREFIX}_MACHINE_ID_NOT_AUTHORIZED`,
    'Request machine id "%s" does not match the authenticated machine id "%s"',
    401
  ),
  MachineNamespaceNotFound: createError(
    `${ERROR_PREFIX}_MACHINE_NAMESPACE_NOT_FOUND`,
    'Machine "%s" namespace not found',
    400
  ),
  FailedToDecryptValkeyPassword: createError(
    `${ERROR_PREFIX}_FAILED_TO_DECRYPT_VALKEY_PASSWORD`,
    'Failed to decrypt valkey password for an application "%s"'
  ),
  FailedToGetMachineDetails: createError(
    `${ERROR_PREFIX}_FAILED_TO_GET_MACHINE_DETAILS`,
    'Failed to get machine details'
  ),
  FailedToSetMachineLabels: createError(
    `${ERROR_PREFIX}_FAILED_TO_SET_MACHINE_LABELS`,
    'Failed to set machine labels: %s'
  ),
  FailedToGetMachineState: createError(
    `${ERROR_PREFIX}_FAILED_TO_GET_MACHINE_STATE`,
    'Failed to get machine state: %s'
  ),
  ApplicationNameNotFound: createError(
    `${ERROR_PREFIX}_APPLICATION_NAME_NOT_FOUND`,
    'Application name not found for machine "%s"',
    400
  ),
  FailedToListGateways: createError(
    `${ERROR_PREFIX}_FAILED_TO_LIST_GATEWAYS`,
    'Failed to list gateways: %s'
  ),
  FailedToGetServicesByLabels: createError(
    `${ERROR_PREFIX}_FAILED_TO_GET_SERVICES_BY_LABELS`,
    'Failed to get services by labels: %s'
  ),
  FailedToApplyHTTPRoute: createError(
    `${ERROR_PREFIX}_FAILED_TO_APPLY_HTTPROUTE`,
    'Failed to apply HTTPRoute: %s'
  ),
  FailedToGetHTTPRoute: createError(
    `${ERROR_PREFIX}_FAILED_TO_GET_HTTPROUTE`,
    'Failed to get HTTPRoute: %s'
  ),
  FailedToDeleteHTTPRoute: createError(
    `${ERROR_PREFIX}_FAILED_TO_DELETE_HTTPROUTE`,
    'Failed to delete HTTPRoute: %s'
  ),
  VersionNotFound: createError(
    `${ERROR_PREFIX}_VERSION_NOT_FOUND`,
    'Version "%s" not found for application "%s"',
    404
  ),
  VersionNotDraining: createError(
    `${ERROR_PREFIX}_VERSION_NOT_DRAINING`,
    'Version "%s" is not draining (current status: %s)',
    400
  ),
  VersionNotExpirable: createError(
    `${ERROR_PREFIX}_VERSION_NOT_EXPIRABLE`,
    'Version "%s" cannot be expired from its current status: %s',
    400
  ),
  VersionNotStaged: createError(
    `${ERROR_PREFIX}_VERSION_NOT_STAGED`,
    'Version "%s" is not staged (current status: %s)',
    400
  ),
  VersionCannotPromote: createError(
    `${ERROR_PREFIX}_VERSION_CANNOT_PROMOTE`,
    'Version "%s" cannot be promoted (current status: %s): %s',
    400
  ),
  CannotExpireActiveVersion: createError(
    `${ERROR_PREFIX}_CANNOT_EXPIRE_ACTIVE_VERSION`,
    'Version "%s" is active and cannot be expired; promote another version first',
    400
  ),
  IllegalVersionTransition: createError(
    `${ERROR_PREFIX}_ILLEGAL_VERSION_TRANSITION`,
    'Illegal version state transition: "%s" -> "%s"',
    400
  ),
  InvalidVersioningMode: createError(
    `${ERROR_PREFIX}_INVALID_VERSIONING_MODE`,
    'Invalid versioning mode "%s" (expected observe, manage or advise)',
    400
  ),
  DeployTokenNotFound: createError(
    `${ERROR_PREFIX}_DEPLOY_TOKEN_NOT_FOUND`,
    'Deploy token "%s" not found for application "%s"',
    404
  ),
  FailedToUpdateController: createError(
    `${ERROR_PREFIX}_FAILED_TO_UPDATE_CONTROLLER`,
    'Failed to update controller: %s'
  ),
  FailedToDeleteDeployment: createError(
    `${ERROR_PREFIX}_FAILED_TO_DELETE_DEPLOYMENT`,
    'Failed to delete Deployment: %s'
  ),
  FailedToDeleteService: createError(
    `${ERROR_PREFIX}_FAILED_TO_DELETE_SERVICE`,
    'Failed to delete Service: %s'
  ),
  FailedToApplyDeployment: createError(
    `${ERROR_PREFIX}_FAILED_TO_APPLY_DEPLOYMENT`,
    'Failed to apply Deployment: %s'
  ),
  FailedToApplyService: createError(
    `${ERROR_PREFIX}_FAILED_TO_APPLY_SERVICE`,
    'Failed to apply Service: %s'
  ),
  FailedToApplySecret: createError(
    `${ERROR_PREFIX}_FAILED_TO_APPLY_SECRET`,
    'Failed to apply Secret: %s'
  ),
  DeployTokenScopeRequired: createError(
    `${ERROR_PREFIX}_DEPLOY_TOKEN_SCOPE_REQUIRED`,
    'This route resolves the application from a deploy token; call it with a deploy token',
    400
  )
}
