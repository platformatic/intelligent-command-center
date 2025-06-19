'use strict'

module.exports = function scaleDown (applicationId, applicationName, oldReplicas, newReplicas, reason) {
  return {
    applicationId,
    objectId: applicationId,
    objectType: 'application',
    event: 'SCALED_DOWN',
    description: `application "${applicationName}" was scaled down from ${oldReplicas} to ${newReplicas} replicas`,
    data: { oldReplicas, newReplicas, reason }
  }
}
