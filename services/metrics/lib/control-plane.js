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

module.exports = {
  getDeployment,
  getEntrypoint
}
