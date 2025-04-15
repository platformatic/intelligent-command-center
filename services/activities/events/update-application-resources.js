'use strict'

module.exports = function deleteApplication (
  applicationId,
  applicationName,
  resources,
  userId,
  username
) {
  return {
    applicationId,
    userId,
    username,
    objectId: applicationId,
    objectType: 'application',
    event: 'APPLICATION_RESOURCES_UPDATE',
    description: `updated "${applicationName}" application resources`,
    data: resources
  }
}
