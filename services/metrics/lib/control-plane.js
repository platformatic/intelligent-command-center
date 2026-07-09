'use strict'

async function getDeployment (controlPlane, appId, logger) {
  const deployments = await controlPlane.getDeployments({
    'where.applicationId.eq': appId,
    'orderby.createdAt': 'desc',
    limit: 1
  })
  const deployment = deployments[0]
  logger.info({ appId, deployment }, 'Deployment found')

  return deployment
}

const getEntrypoint = async (controlPlane, appId, logger) => {
  const deployment = await getDeployment(controlPlane, appId, logger)
  if (!deployment) {
    logger.error({ appId }, 'No deployment found')
    throw new Error(`No deployment found for application ${appId}`)
  }
  const { applicationStateId } = deployment
  const applicationState = await controlPlane.getApplicationStateById({ id: applicationStateId })
  if (!applicationState) {
    logger.error({ appId }, 'No application state found')
    throw new Error(`No application state found for application ${appId}`)
  }

  const { state } = applicationState
  const { services } = state

  let entrypoint = null
  for (const service of services) {
    if (service.entrypoint) {
      entrypoint = service.id
      break
    }
  }
  return entrypoint
}

// Resolve a version's workload instance name (app.kubernetes.io/instance = the
// registry controllerName) from its version id. Metrics filter by that label
// because kube-state-metrics does not expose plt.dev/version, and image-derived
// deploys have no version label at all. Returns null (no filter) when the version
// is unknown so metrics degrade to whole-app rather than empty.
async function getVersionInstance (controlPlane, appId, versionLabel, logger) {
  if (!versionLabel) return null
  try {
    const { versions } = await controlPlane.getApplicationVersions({ id: appId })
    const version = (versions ?? []).find(v => v.versionLabel === versionLabel)
    return version?.controllerName ?? null
  } catch (err) {
    logger?.warn({ err, appId, versionLabel }, 'failed to resolve version instance for metrics')
    return null
  }
}

module.exports = {
  getDeployment,
  getEntrypoint,
  getVersionInstance
}
