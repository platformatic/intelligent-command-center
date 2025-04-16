'use strict'

module.exports = function deployApplication (applicationId, applicationName, imageId) {
  return {
    applicationId,
    objectId: applicationId,
    objectType: 'application',
    event: 'APPLICATION_DEPLOY',
    description: `application "${applicationName}" was deployed with a new image`,
    data: { imageId }
  }
}
