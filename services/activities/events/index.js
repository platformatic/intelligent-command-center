'use strict'

const { UnknownEventTypeError } = require('../lib/errors')
const userLoginEvent = require('./user-login-event')
const createApplicationEvent = require('./create-application-event')
const deployApplicationEvent = require('./deploy-application-event')
const updateApplicationResources = require('./update-application-resources-event')
const scaleUpEvent = require('./scale-up-event')
const scaleDownEvent = require('./scale-down-event')

module.exports.getPayloadForEventType = function (type, data) {
  let payload = {}
  switch (type) {
    case 'USER_LOGIN':
      payload = userLoginEvent(data.userId, data.username)
      break
    case 'APPLICATION_CREATE':
      payload = createApplicationEvent(
        data.applicationId,
        data.data.applicationName
      )
      break
    case 'APPLICATION_DEPLOY':
      payload = deployApplicationEvent(
        data.applicationId,
        data.data.applicationName,
        data.data.imageId
      )
      break
    case 'APPLICATION_RESOURCES_UPDATE':
      payload = updateApplicationResources(
        data.applicationId,
        data.data.applicationName,
        data.data.resources,
        data.userId,
        data.username
      )
      break
    case 'SCALED_UP':
      payload = scaleUpEvent(
        data.applicationId,
        data.data.applicationName,
        data.data.oldReplicas,
        data.data.newReplicas,
        data.data.reason
      )
      break
    case 'SCALED_DOWN':
      payload = scaleDownEvent(
        data.applicationId,
        data.data.applicationName,
        data.data.oldReplicas,
        data.data.newReplicas,
        data.data.reason
      )
      break

    default:
      throw new UnknownEventTypeError(type)
  }
  if (data.success !== undefined && data.success !== null) {
    payload.success = !!data.success
  }
  return payload
}

module.exports.getTypes = function () {
  return {
    USER_LOGIN: 'User Login',
    APPLICATION_CREATE: 'Application Create',
    APPLICATION_DEPLOY: 'Application Deploy',
    APPLICATION_RESOURCES_UPDATE: 'Application Resources Update',
    SCALED_UP: 'Application Scaled Up',
    SCALED_DOWN: 'Application Scaled Down'
  }
}
