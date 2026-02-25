'use strict'

module.exports = function versionRegistryUpdate (applicationId, versionLabel, status) {
  return {
    applicationId,
    objectId: applicationId,
    objectType: 'application',
    event: 'VERSION_REGISTRY_UPDATE',
    description: `Version ${versionLabel} marked as ${status}`,
    data: { versionLabel, status }
  }
}
