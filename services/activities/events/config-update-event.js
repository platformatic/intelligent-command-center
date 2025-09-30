'use strict'

module.exports = function configUpdate (applicationId, applicationName, oldConfig, newConfig, source) {
  const changes = []
  if (oldConfig?.minPods !== newConfig.minPods) {
    changes.push(`min pods: ${oldConfig?.minPods || 'unset'} → ${newConfig.minPods}`)
  }
  if (oldConfig?.maxPods !== newConfig.maxPods) {
    changes.push(`max pods: ${oldConfig?.maxPods || 'unset'} → ${newConfig.maxPods}`)
  }

  const changeDescription = changes.join(', ')
  const description = `application "${applicationName}" scaling configuration updated (${changeDescription})`

  return {
    applicationId,
    objectId: applicationId,
    objectType: 'application',
    event: 'CONFIG_UPDATE',
    description,
    data: { oldConfig, newConfig, source, changes: changeDescription }
  }
}
