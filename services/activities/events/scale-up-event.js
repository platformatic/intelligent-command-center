'use strict'

module.exports = function scaleUp (applicationId, applicationName, oldReplicas, newReplicas, reason) {
  return {
    applicationId,
    objectId: applicationId,
    objectType: 'application',
    event: 'SCALED_UP',
    description: `application "${applicationName}" was scaled up from ${oldReplicas} to ${newReplicas} replicas`,
    data: { oldReplicas, newReplicas, reason }
  }
}
