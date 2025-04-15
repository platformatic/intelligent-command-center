'use strict'

module.exports = function createApplication (applicationId, applicationName) {
  return {
    applicationId,
    objectId: applicationId,
    objectType: 'application',
    event: 'APPLICATION_CREATE',
    description: `created a new application "${applicationName}"`
  }
}
