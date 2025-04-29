import {
  getGenerations,
  getDeployments,
  getApplicationStates,
  getApplicationStateById,
  getApplications,
  getApplicationsIdScaler,
  setBaseUrl as setBaseUrlControlPlane,
  getApplicationById,
  restartDeployment,
  getApplicationSecrets,
  saveApplicationSecrets,
  getTaxonomies,
  getTaxonomiesChanges,
  getGenerationsForTaxonomy,
  getMainTaxonomyGraph,
  getPreviewTaxonomyGraph,
  syncPreviewTaxonomy,
  getApplicationUrl,
  getApplicationInstances,
  createApplication,
  exposeApplication,
  getTaxonomySecrets,
  deleteApplication,
  getGenerationById,
  getTaxonomyById,
  closeTaxonomy,
  getEntrypoints,
  hideApplication
} from '../clients/control-plane/control-plane.mjs'
import {
  getBundlesWithMetadata,
  setBaseUrl as setBaseUrlCompendium
} from '../clients/compendium/compendium.mjs'

import {
  getRisks,
  setBaseUrl as setBaseURiskManager
} from '../clients/risk-manager/risk-manager.mjs'

import {
  getReports,
  setBaseUrl as setBaseURLCompliance
} from '../clients/compliance/compliance.mjs'

import { DESC } from './ui-constants'
import {
  getLinksForTaxonomyGraph,
  getLinksForPreviewGraph,
  getServicesAddedEditedRemoved
} from './utilities/taxonomy'

import extractScalingEvents from './utilities/extract-scaling-events'

import { sortCollection, sortCollectionByDate } from './utilitySorting'

const baseUrl = `${import.meta.env.VITE_API_BASE_URL}`
const baseApiUrl = `${baseUrl}/api`
setBaseUrlControlPlane(`${baseUrl}/control-plane`)
setBaseUrlCompendium(`${baseUrl}/compendium`)
setBaseURiskManager(`${baseUrl}/risk-manager`)
setBaseURLCompliance(`${baseUrl}/compliance`)

const getHeaders = () => {
  const headers = {
    'content-type': 'application/json'
  }
  return headers
}

export const logoutUser = async () => {
  return await fetch(`${baseApiUrl}/logout`, {
    method: 'GET',
    headers: { ...getHeaders() },
    credentials: 'include',
    redirect: 'follow'
  })
}

export const getUser = async () => {
  return await fetch(`${baseApiUrl}/me`, {
    method: 'GET',
    headers: { ...getHeaders() },
    credentials: 'include'
  })
}

/* APPLICATIONS */
export const getApplicationsRaw = async () => {
  const { body: applications } = await getApplications({
    'where.deleted.eq': 'false'
  })
  return applications
}

export const getLastStartedGeneration = async () => {
  const { body: generations } = await getGenerations({
    'where.status.neq': 'failed',
    'orderby.createdAt': DESC,
    limit: 1
  })
  return generations.length === 1 ? generations[0] : null
}

export const getApplicationsWithMetadata = async () => {
  const { statusCode, body: applications } = await getApplications({
    'where.deleted.eq': 'false'
  })
  if (statusCode !== 200) return []
  if (applications.length === 0) return []
  const applicationsWithMetadata = applications.map(
    application => ({
      ...application,
      state: {},
      url: null,
      isDeployed: false
    })
  )

  const mainTaxonomyId = '00000000-0000-0000-0000-000000000000'
  const lastGeneration = getLastStartedGeneration(mainTaxonomyId)
  if (lastGeneration === null) {
    return applicationsWithMetadata
  }

  const { body: deployments } = await getDeployments({
    'where.generationId.eq': lastGeneration.id
  })

  for (const deployment of deployments) {
    const applicationId = deployment.applicationId
    const applicationWithMetadata = applicationsWithMetadata.find(
      app => app.id === applicationId
    )
    if (!applicationWithMetadata) continue

    applicationWithMetadata.isDeployed = true

    if (deployment.applicationStateId !== null) {
      const { body: applicationState } = await getApplicationStateById({
        id: deployment.applicationStateId
      })
      applicationWithMetadata.state = applicationState.state
    }

    // TODO: remove this once we have a real URL
    // const { body: applicationUrl } = await getApplicationUrl({ id: applicationId })
    // applicationWithMetadata.url = applicationUrl.url
    applicationWithMetadata.url = 'https://www.google.com'
  }

  return applicationsWithMetadata
}

export const getApiApplication = async (id) => {
  let lastUpdated = null
  let lastStarted = null
  let pltVersion = null
  const latestDeployment = {}
  let state = {}
  const { body: application } = await getApplicationById({ id })
  const { body: arrayState } = await getApplicationStates({
    'where.applicationId.eq': id,
    'orderby.createdAt': DESC,
    limit: 1
  })

  if (arrayState.length > 0) {
    pltVersion = arrayState[0].pltVersion
    state = arrayState[0]?.state ?? {}
  }

  const { body: deployments } = await getDeployments({
    'where.taxonomyId.eq': application.taxonomyId,
    'orderby.createdAt': DESC,
    limit: 1
  })

  if (deployments.length > 0) {
    // const bundleMetaData = await getBundlesWithMetadata({ bundleIds: deployments[0].bundleId })

    lastStarted = deployments[0].createdAt
    // if (bundleMetaData.length > 0 && bundleMetaData.metadata) {
    //   latestDeployment = {
    //     createdAt: bundleMetaData.metadata?.createdAt,
    //     commitUserEmail: bundleMetaData.metadata?.commit?.userEmail,
    //     pltVersion
    //   }
    // }
  }

  // const { body: taxonomy } = await getTaxonomies({ 'where.main.eq': true })
  const { body: deploymentsOnMainTaxonomy } = await getDeployments({
    'where.applicationId.eq': id,
    // 'where.taxonomyId.eq': taxonomy[0].id,
    'where.status.neq': 'failed',
    'orderby.createdAt': DESC,
    limit: 1
  })

  const response = await fetch((`${baseApiUrl}/events?` + new URLSearchParams({
    'where.applicationId.eq': id,
    'orderby.createdAt': DESC,
    limit: 1,
    offset: 0
  }).toString()), {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })

  const activities = await response.json()

  lastUpdated = activities[0]?.createdAt ?? null

  return {
    ...application,
    pltVersion,
    state,
    latestDeployment,
    deploymentsOnMainTaxonomy: deploymentsOnMainTaxonomy.length,
    lastStarted,
    lastUpdated
  }
}

export const addApiApplication = async (name, path, environmentVariables) => {
  const { body: application } = await createApplication({
    name
  })

  const { body: taxonomies } = await getTaxonomies({ 'where.main.eq': true })
  const taxonomy = taxonomies[0] ?? null

  await exposeApplication({
    id: application.id,
    taxonomyId: taxonomy?.id,
    path
  })

  await saveApplicationSecrets({ id: application.id, secrets: { ...environmentVariables } })

  const url = `${baseUrl}/user-manager/appApiKeys`

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      applicationId: application.id,
      key: '',
      name: 'Application Api Key'
    })
  })

  const { key: apiSecretsKey } = await response.json()

  return {
    id: application.id,
    apiSecretsKey
  }
}

export const callApiDeleteApplication = async (id) => {
  return await deleteApplication({ id })
}

export const getApiApplicationUrl = async (id) => {
  return { url: 'https://www.google.com' }
  // const { body } = await getApplicationUrl({ id })
  // return body
}

/* METRICS */
export const getApiMetricsForApplication = async (applicationId, radix) => {
  return fetch(`${baseUrl}/metrics/apps/${applicationId}/${radix}`, {
    method: 'GET',
    headers: getHeaders()
  })
}

export const getApiMetricsPod = async (taxonomyId, applicationId, podId, radix) => {
  let url = `${baseUrl}/metrics/taxonomies/${taxonomyId}/apps/${applicationId}/pods/${podId}`
  if (radix) {
    url += `/${radix}`
  }
  return fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })
}

export const getApiMetricsPodPerService = async (taxonomyId, applicationId, podId, serviceId, radix) => {
  let url = `${baseUrl}/metrics/taxonomies/${taxonomyId}/apps/${applicationId}/pods/${podId}/services/${serviceId}`
  if (radix) {
    url += `/${radix}`
  }
  return fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })
}

/* KUBERNETES RESOURCES */

export const getKubernetesResources = async (applicationId) => {
  const url = `${baseUrl}/metrics/kubernetes/apps/${applicationId}`
  return fetch(url, {
    method: 'GET',
    headers: getHeaders()
  })
}

// Autoscaler
export const getRequestsPerSecond = async (applicationId) => {
  const url = `${baseUrl}/metrics/kubernetes/apps/${applicationId}/rps`
  return fetch(url, {
    method: 'GET',
    headers: getHeaders()
  })
}

/* ACTIVITIES */
export const getApiActivities = async (applicationId, filters = { limit: 10, offset: 0, search: '', userId: '' }) => {
  let url = `${baseApiUrl}/events?limit=${filters.limit}&offset=${filters.offset}`
  if (applicationId) {
    url += `&applicationId=${applicationId}`
  }
  if ((filters?.search ?? '') !== '') url += `&search=${filters.search}`
  if ((filters?.userId ?? '') !== '') url += `&userId=${filters.userId}`
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })
  const totalCount = response.headers.get('X-Total-Count')

  const activities = await response.json()
  for await (const activity of activities) {
    const { body: application } = await getApplicationById({ id: activity.applicationId })
    activity.applicationName = application.name
  }
  return { activities, totalCount }
}

export const getApiActivitiesTypes = async () => {
  return await fetch(`${baseUrl}/activities/types`, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })
}

export const getApiActivitiesUsers = async () => {
  return await fetch(`${baseUrl}/activities/users`, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })
}

/* DEPLOYMENTS */
export const getApiDeploymentsHistory = async (payload) => {
  const queryObject = {
    'orderby.createdAt': DESC,
    totalCount: true,
    limit: payload.limit,
    offset: payload.offset
  }
  if (payload.filterDeploymentsByApplicationId) {
    queryObject['where.applicationId.eq'] = payload.filterDeploymentsByApplicationId
  }

  const { body: deployments, headers } = await getDeployments(queryObject)
  const totalCount = headers['x-total-count']

  const deploymentHistory = []
  const promises = []
  let promisesResolved = []
  let generation = {}
  let taxonomy = {}
  if (deployments.length === 0) {
    return { deployments: deploymentHistory, totalCount: 0 }
  }
  for await (const deployment of deployments) {
    const { bundleId, generationId, taxonomyId } = deployment
    promises.splice(0, promises.length)
    if (bundleId) {
      promises.push(getBundlesWithMetadata({ bundleIds: bundleId }))
    }
    if (generationId) {
      promises.push(getGenerationById({ id: generationId }))
    }
    if (taxonomyId) {
      promises.push(getTaxonomyById({ id: taxonomyId }))
    }
    promisesResolved = await Promise.all(promises)
    const bundleMetaData = promisesResolved[0]
    generation = {}
    taxonomy = {}
    if (generationId) {
      generation = promisesResolved[1].body
    }
    if (taxonomyId) {
      taxonomy = promisesResolved[2].body
    }

    let metadata = {}
    if (bundleMetaData.length > 0) {
      metadata = bundleMetaData[0]?.metadata ?? {}
    }

    deploymentHistory.push({
      id: deployment.id,
      taxonomyId,
      mainIteration: generation?.mainIteration,
      main: taxonomy?.main ?? false,
      taxonomyName: taxonomy?.name,
      branch: metadata?.branch?.name,
      deployedOn: deployment.createdAt,
      commitMessage: metadata?.commit?.message,
      commitUserEmail: metadata?.commit?.userEmail
    })
  }

  return { deployments: deploymentHistory, totalCount }
}

// TODO: this and getApiDeploymentsHistory should share the same code
export const getApiDeployments = async (payload) => {
  const deploymentsReturned = []
  const queryObject = {
    'orderby.createdAt': DESC,
    totalCount: true,
    limit: payload.limit,
    offset: payload.offset
  }
  if (payload.filterDeploymentsByApplicationId) {
    queryObject['where.applicationId.eq'] = payload.filterDeploymentsByApplicationId
  }

  const { body: deployments, headers } = await getDeployments(queryObject)
  const totalCount = headers['x-total-count']

  let bundlesWithMetadata = {}
  let generation = {}
  let taxonomy = {}
  for await (const deployment of deployments) {
    const { body: applications } = await getApplications({
      'where.id.eq': deployment.applicationId,
      'where.deleted.eq': 'false'
    })

    bundlesWithMetadata = await getBundlesWithMetadata({ bundleIds: deployment.bundleId })

    const { body: getGenerationBody } = await getGenerationById({ id: deployment.generationId })
    generation = getGenerationBody
    const { body: getTaxonomyByIdBody } = await getTaxonomyById({ id: deployment.taxonomyId })
    taxonomy = getTaxonomyByIdBody

    const bundleWithMetadata = bundlesWithMetadata[0]
    deploymentsReturned.push({
      id: deployment.id,
      taxonomyId: deployment.taxonomyId,
      mainIteration: generation?.mainIteration,
      main: taxonomy?.main ?? false,
      deployedOn: deployment.createdAt,
      applicationName: applications[0]?.name,
      taxonomyName: taxonomy?.name,
      branch: bundleWithMetadata?.metadata?.branch?.name,
      commitMessage: bundleWithMetadata.metadata?.commit?.message,
      commitUserEmail: bundleWithMetadata.metadata?.commit?.userEmail
    })
  }

  return { deployments: deploymentsReturned, totalCount }
}

/* HANDLING STATUS APPLICATIONS */
export const restartApiApplication = async (applicationId) => {
  return await restartDeployment({ id: applicationId })
}

/* GITHUB */
const gitHubUserCache = {}
export const getGithubUserInfo = async (commitUserEmail) => {
  if (!gitHubUserCache[commitUserEmail]) {
    // avoid hitting Github rate limit
    // speed up fetching the same data over and over again
    gitHubUserCache[commitUserEmail] = await fetch(`https://api.github.com/search/users?q=${commitUserEmail} in:email`, {
      method: 'GET'
    })
  }
  return gitHubUserCache[commitUserEmail]
}

let mainTaxonomy = null
/* TAXONOMY */
export const getApiMainTaxonomy = async () => {
  if (mainTaxonomy === null) {
    const { body: taxonomy } = await getTaxonomies({ 'where.main.eq': true })
    mainTaxonomy = taxonomy[0]
  }
  return mainTaxonomy
}

export const getApiTaxonomy = async (id) => {
  const { body: taxononmy } = await getTaxonomies({ 'where.id.eq': id })
  return taxononmy
}

export const getApiMainTaxonomyGraph = async (generationId) => {
  const { body: taxonomy } = await getTaxonomies({ 'where.main.eq': true })

  const { body: graph } = await getMainTaxonomyGraph({
    id: taxonomy[0].id,
    generationId
  })

  const { applications, links } = graph

  return {
    id: taxonomy.id,
    name: taxonomy.main,
    applications,
    links: getLinksForTaxonomyGraph(links, applications, taxonomy.id)
  }
}

export const getApiTaxonomyGenerations = async (options = {}) => {
  const skipFirst = options.skipFirst ?? false
  const includeFailed = options.includeFailed ?? false

  const { body: taxonomy } = await getTaxonomies({ 'where.main.eq': true })
  let { body: generations } = await getGenerationsForTaxonomy({
    id: taxonomy[0].id
  })

  if (skipFirst) {
    generations = generations.filter(
      generation => generation.id !== '00000000-0000-0000-0000-000000000000'
    )
  }

  if (!includeFailed) {
    generations = generations.filter(
      generation => generation.status !== 'failed'
    )
  }

  return sortCollectionByDate(generations, 'createdAt', false)
}

export const callApiSynchronizePreviewTaxonomy = async (previewId) => {
  return await syncPreviewTaxonomy({ id: previewId })
}

export const getApiPreviewTaxonomy = async (taxonomyId) => {
  const { body: taxonomy } = await getTaxonomies({ 'where.id.eq': taxonomyId })
  const { body: graphGeneration } = await getPreviewTaxonomyGraph({ id: taxonomyId })

  const { applications = [], links = [] } = graphGeneration
  const { edited, added, removed } = getServicesAddedEditedRemoved(graphGeneration.applications)

  return {
    taxonomy: {
      id: taxonomy[0].id,
      name: taxonomy[0].name,
      applications,
      links: getLinksForPreviewGraph(links, applications, taxonomyId)
    },
    added,
    removed,
    edited
  }
}

/* ENVIRONMENT VARIABLES / SECRETS */
export const getApiEnvironmentVariables = async (applicationId) => {
  const { statusCode, body } = await getApplicationSecrets({ id: applicationId })
  if (statusCode === 200) {
    return body
  }
  throw new Error(`Cannot get Application Secrets. ${body.message}`)
}
export const saveApiEnvironmentVariables = async (applicationId, payload) => {
  return await saveApplicationSecrets({ id: applicationId, secrets: { ...payload } })
}
export const getApiTaxonomySecrets = async (taxonomyId) => {
  const { body } = await getTaxonomySecrets({ id: taxonomyId })
  return body
}

/* PACKAGE VERSIONS */
export const getPackageVersions = async () => {
  const url = `${baseApiUrl}/package_versions`
  return fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })
}

/* PREVIEWS */
const getPreviewTaxonomies = async (request) => {
  const queryParameters = ['limit', 'offset', 'totalCount', 'fields', 'where.closedAt.eq', 'where.closedAt.neq', 'where.closedAt.gt', 'where.closedAt.gte', 'where.closedAt.lt', 'where.closedAt.lte', 'where.closedAt.like', 'where.closedAt.in', 'where.closedAt.nin', 'where.closedAt.contains', 'where.closedAt.contained', 'where.closedAt.overlaps', 'where.createdAt.eq', 'where.createdAt.neq', 'where.createdAt.gt', 'where.createdAt.gte', 'where.createdAt.lt', 'where.createdAt.lte', 'where.createdAt.like', 'where.createdAt.in', 'where.createdAt.nin', 'where.createdAt.contains', 'where.createdAt.contained', 'where.createdAt.overlaps', 'where.id.eq', 'where.id.neq', 'where.id.gt', 'where.id.gte', 'where.id.lt', 'where.id.lte', 'where.id.like', 'where.id.in', 'where.id.nin', 'where.id.contains', 'where.id.contained', 'where.id.overlaps', 'where.main.eq', 'where.main.neq', 'where.main.gt', 'where.main.gte', 'where.main.lt', 'where.main.lte', 'where.main.like', 'where.main.in', 'where.main.nin', 'where.main.contains', 'where.main.contained', 'where.main.overlaps', 'where.name.eq', 'where.name.neq', 'where.name.gt', 'where.name.gte', 'where.name.lt', 'where.name.lte', 'where.name.like', 'where.name.in', 'where.name.nin', 'where.name.contains', 'where.name.contained', 'where.name.overlaps', 'where.stage.eq', 'where.stage.neq', 'where.stage.gt', 'where.stage.gte', 'where.stage.lt', 'where.stage.lte', 'where.stage.like', 'where.stage.in', 'where.stage.nin', 'where.stage.contains', 'where.stage.contained', 'where.stage.overlaps', 'where.status.eq', 'where.status.neq', 'where.status.gt', 'where.status.gte', 'where.status.lt', 'where.status.lte', 'where.status.like', 'where.status.in', 'where.status.nin', 'where.status.contains', 'where.status.contained', 'where.status.overlaps', 'where.or', 'orderby.closedAt', 'orderby.createdAt', 'orderby.id', 'orderby.main', 'orderby.name', 'orderby.stage', 'orderby.status']
  const searchParams = new URLSearchParams()
  queryParameters.forEach((qp) => {
    if (request[qp]) {
      searchParams.append(qp, request[qp]?.toString() || '')
      delete request[qp]
    }
  })

  const response = await fetch(`${baseUrl}/control-plane/taxonomies/?${searchParams.toString()}`, {
    credentials: 'include'
  })

  if (!response.ok) {
    throw new Error(await response.text())
  }

  const totalCount = response.headers.get('X-Total-Count')

  const taxonomies = await response.json()

  return { taxonomies, totalCount }
}

/* PREVIEWS */
export const getApiPreviewsFiltered = async (filters = { limit: 1, offset: 0 }) => {
  const { taxonomies, totalCount } = await getPreviewTaxonomies({
    'where.main.neq': true,
    totalCount: true,
    ...filters
  })
  const previews = await getPreviews(taxonomies)

  return { previews, totalCount }
}

export const getApiPreviews = async (taxonomyId) => {
  const { body: taxonomies } = taxonomyId ? await getTaxonomies({ 'where.id.eq': taxonomyId }) : await getTaxonomies({ 'where.main.neq': true })
  return await getPreviews(taxonomies)
}

const getPreviews = async (taxonomies) => {
  const changes = []
  for (const taxonomy of taxonomies) {
    const { body: change } = await getTaxonomiesChanges({
      taxonomyIds: taxonomy.id
    })
    changes.push(...change)
  }

  const changesMap = changes.reduce((acc, change) => {
    if (acc[change.taxonomyId]) {
      acc[change.taxonomyId].push(change.bundleId)
    } else {
      acc[change.taxonomyId] = [change.bundleId]
    }
    return acc
  }, {})

  const applicationMap = changes.reduce((acc, change) => {
    if (!acc[change.taxonomyId]) {
      acc[change.taxonomyId] = change.applicationId
    }
    return acc
  }, {})

  const bundleIds = changes.map(change => change.bundleId)
  const bundles = bundleIds.length > 0
    ? await getBundlesWithMetadata([bundleIds])
    : []

  const bundlesMap = bundles.reduce((acc, bundle) => {
    acc[bundle.id] = bundle.metadata
    return acc
  }, {})
  const risks = []
  let risk
  for (const taxonomy of taxonomies) {
    risk = await getRisks({
      'where.branchTaxonomyId.eq': taxonomy.id,
      'orderby.createdAt': DESC,
      limit: 1
    })
    if (risk[0]) {
      risks.push(risk[0])
    }
  }
  const risksMap = risks.reduce((acc, risk) => {
    acc[risk.branchTaxonomyId] = risk
    return acc
  }, [])

  const previews = []
  for (const taxonomy of taxonomies) {
    const { id, name, closedAt } = taxonomy
    const open = taxonomy.stage === 'opened'
    const merged = taxonomy.stage === 'merged'
    const risk = risksMap[id]?.risk
    const openapi = risksMap[id]?.openapi
    const db = risksMap[id]?.db
    const graphql = risksMap[id]?.graphql
    const openapiChanges = openapi?.changes
    const graphqlChanges = graphql?.changes
    const changes = {
      edited: openapiChanges?.edited || 0 + graphqlChanges?.edited || 0,
      added: openapiChanges?.added || 0 + graphqlChanges?.added || 0,
      removed: openapiChanges?.removed || 0 + graphqlChanges?.removed || 0
    }
    const { body: taxonomyGenerations } = await getGenerationsForTaxonomy({ id })

    const taxonomyGeneration = (taxonomyGenerations?.length ?? 0) > 0 ? taxonomyGenerations[0] : null
    const bundleIds = changesMap[id]
    const applicationId = applicationMap[id]

    let previewUrl = { url: '' }
    if (applicationId) {
      const { body } = await getApplicationUrl({ id: applicationId, taxonomyId: id })
      previewUrl = body
    }

    const pullRequests = []
    if (bundleIds) {
      for (const bundleId of bundleIds) {
        const prMetadata = bundlesMap[bundleId]
        const pullRequest = prMetadata?.pullRequest

        if (pullRequest) {
          pullRequests.push({
            number: pullRequest.number,
            title: pullRequest.title,
            commitUserEmail: prMetadata.commit.userEmail,
            repositoryName: prMetadata.repository?.name
          })
        }
      }
    }

    const preview = {
      taxonomyId: id,
      taxonomyName: name,
      open,
      merged,
      taxonomyGeneration: taxonomyGeneration.mainIteration,
      generationId: taxonomyGeneration.id,
      risk,
      changes,
      openapi,
      graphql,
      db,
      pullRequests,
      closedAt,
      applicationId,
      url: previewUrl.url
    }
    previews.push(preview)
  }
  // Needed for debug
  console.log('previews', previews)
  return previews
}

/* CLOSE ENVIRONMENT */
export const callApiClosePreview = async (id) => {
  return await closeTaxonomy({ id })
}

/* INSTANCES */
export const getApiApplicationInstances = async (applicationId) => {
  const { body } = await getApplicationInstances({ id: applicationId })
  return body
}

/* PODS */
export const getApiPods = async (applicationId) => {
  const { body: appInstances } = await getApplicationInstances({ id: applicationId })
  const pods = appInstances?.instances ?? []

  for (const pod of pods) {
    const { id } = pod

    const [dataMem, dataCpu] = await Promise.all([
      getApiMetricsPod(applicationId, id, 'mem'),
      getApiMetricsPod(applicationId, id, 'cpu')
    ])

    const dataValuesMem = await dataMem.json()
    const dataValuesCpu = await dataCpu.json()
    pod.dataValues = { ...dataValuesMem, ...dataValuesCpu }
  }

  return pods
}

export const getApiPod = async (applicationId, podId) => {
  const [dataMem, dataCpu] = await Promise.all([
    getApiMetricsPod(applicationId, podId, 'mem'),
    getApiMetricsPod(applicationId, podId, 'cpu')
  ])

  const dataValuesMem = await dataMem.json()
  const dataValuesCpu = await dataCpu.json()

  return { ...dataValuesMem, ...dataValuesCpu }
}

export const callApiRevokeKey = async (applicationId, id) => {
  const url = `${baseUrl}/user-manager/appApiKeys`

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify({
      applicationId,
      id,
      key: '',
      revoked: true
    })
  })

  const { revoked } = await response.json()

  return {
    id,
    revoked,
    applicationId
  }
}

export const callApiRegenerateKey = async (applicationId, id) => {
  const url = `${baseUrl}/user-manager/appApiKeys/${id}/regenerate`

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify({
      applicationId,
      key: ''
    })
  })

  const { key } = await response.json()

  return {
    key,
    regenerated: true,
    applicationId
  }
}

export const getApiAPIKeys = async (applicationId) => {
  const response = await fetch((`${baseUrl}/user-manager/appApiKeys?` + new URLSearchParams({ 'where.applicationId.eq': applicationId }).toString()), {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })

  const apiKeys = await response.json()

  return apiKeys.map(apikey => ({
    name: apikey.name,
    id: apikey.id,
    value: apikey.suffix,
    createdOn: apikey?.createdAt,
    usedOn: apikey?.usedOn,
    revoked: apikey?.revoked
  }))
}

export const callApiAddKey = async (id, name) => {
  const url = `${baseUrl}/user-manager/appApiKeys`

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify({
      applicationId: id,
      key: '',
      name
    })
  })

  const { key: apiSecretsKey } = await response.json()

  return {
    id,
    name,
    apiSecretsKey
  }
}

/* COMPLIANCY */
export const getApiCompliancy = async (applicationId) => {
  const { body: deployments } = await getDeployments({
    'where.applicationId.eq': applicationId,
    'orderby.createdAt': DESC,
    limit: 1
  })

  return await getReports({
    'where.applicationId.eq': applicationId,
    'where.bundleId.eq': deployments[0].bundleId
  })
}

/* AUTOSCALER */
export const getApiMetricsReplicaSetOverview = async (taxonomyId, applicationId) => {
  const { body: pods } = await getApplicationInstances({ id: applicationId, taxonomyId })
  const { events } = await getScalingEventHistory(taxonomyId, applicationId)
  const eventCounts = events.reduce((counts, ev) => {
    if (ev.scaleType === 'UP') counts.up += 1
    else counts.down += 1
    return counts
  }, { up: 0, down: 0 })
  return {
    pods: (pods?.instances ?? []).length,
    minPods: pods?.minimumInstanceCount ?? 1,
    maxPods: pods?.maximumInstanceCount ?? 10,
    countScaleUp: eventCounts.up,
    countScaleDown: eventCounts.down
  }
}

export const getScalingMarkers = async (taxonomyId, applicationId) => {
  const { body } = await getApplicationsIdScaler({ id: applicationId, taxonomyId })
  return body
}

export const getScalingEventHistory = async (taxonomyId, applicationId) => {
  const { body: deployments } = await getDeployments({
    'where.applicationId.eq': applicationId,
    'where.taxonomyId.eq': taxonomyId,
    'orderby.createdAt': DESC,
    limit: 1
  })
  const [latestDeployment] = deployments

  const labels = new URLSearchParams({
    name: latestDeployment.machineId,
    resource: 'Deployment'
  })

  const response = await fetch(`${baseUrl}/log-proxy/events/history?${labels.toString()}`, {
    method: 'GET',
    credentials: 'include',
    headers: getHeaders()
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`Failed to get scaling history: ${error}`)
    throw new Error(`Failed to get scaling history: ${error}`)
  }

  const { events } = await response.json()
  const scalingHistory = events
    .filter(({ object: ev }) => ev.reason === 'ScalingReplicaSet')
    .map(({ object: ev }) => {
      const scaleType = ev.note.startsWith('Scaled down') ? 'DOWN' : 'UP'
      return {
        datetime: ev.metadata.creationTimestamp,
        activity: scaleType === 'DOWN' ? 'Pod removed' : 'New pod',
        description: ev.note,
        scaleType
      }
    })
    .sort(function (a, b) {
      return new Date(b.datetime) - new Date(a.datetime)
    })

  const chartEvents = extractScalingEvents(scalingHistory)

  return {
    events: scalingHistory,
    chartEvents,
    totalCount: scalingHistory.length
  }
}

// CONFIGURE INGRESS CONTROLLER PATHS
export const getApiEntrypoints = async () => {
  const { body: taxonomies } = await getTaxonomies({ 'where.main.eq': true })
  const taxonomy = taxonomies[0] ?? null

  const ingressPathToReturn = []
  const { body: applications } = await getApplications({
    'where.deleted.eq': 'false'
  })
  const { body: entrypoints } = await getEntrypoints({
    'where.taxonomyId.eq': taxonomy.id
  })
  let entrypoint = {}

  for await (const application of applications) {
    entrypoint = entrypoints.find(entrypoint => entrypoint.applicationId === application.id) || {}
    ingressPathToReturn.push({
      applicationName: application.name,
      applicationId: application.id,
      ...entrypoint
    })
  }

  return ingressPathToReturn
}

export const callApiApplicationHide = async (applicationId) => {
  return await hideApplication({ id: applicationId })
}

export const callApiApplicationExpose = async (applicationId, path) => {
  const { body } = await exposeApplication({ id: applicationId, path })
  return body
}

/* USER AND ROLES */
export const getApiUsers = async () => {
  const response = await fetch(`${baseUrl}/user-manager/users`, {
    method: 'GET',
    credentials: 'include',
    headers: getHeaders()
  })

  const users = await response.json()

  return sortCollection(users, 'username')
}

export const callApiRemoveUser = async (userId) => {
  return await fetch(`${baseUrl}/user-manager/users/${userId}`, {
    method: 'DELETE',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify({})
  })
}

export const callApiChangeRoleUser = async (userId, role) => {
  return await fetch(`${baseUrl}/user-manager/users/${userId}`, {
    method: 'PUT',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify({
      role
    })
  })
}

export const callApiInviteUser = async (emails) => {
  const promises = [emails.map(email => fetch(`${baseUrl}/user-manager/users`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      email
    })
  }))]
  return await Promise.all(promises)
}

export const getApiEnvironments = async () => {
  const activities = []
  let response = await fetch(`${baseApiUrl}/events?limit=100&offset=0&search=IMPORT`, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })
  const totalCountImported = response.headers.get('X-Total-Count')

  const importedActivities = await response.json()

  for (const importedActivity of importedActivities) {
    activities.push({ ...importedActivity, imported: true })
  }

  response = await fetch(`${baseApiUrl}/events?limit=100&offset=0&search=EXPORT`, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })

  const totalCountExported = response.headers.get('X-Total-Count')

  const exportedActivities = await response.json()

  for (const exportedActivity of exportedActivities) {
    activities.push({ ...exportedActivity, imported: false })
  }

  return { activities, totalCount: Number(totalCountImported) + Number(totalCountExported) }
}

export const callApiImportEnvironment = async (formData) => {
  const { body: taxonomy } = await getTaxonomies({ 'where.main.eq': true })
  const url = `${baseUrl}/control-plane/taxonomies/${taxonomy[0].id}/import`

  const response = await fetch(url, {
    method: 'POST',
    headersTimeout: 5 * 60 * 1000,
    body: formData,
    credentials: 'include'
  })

  const { status } = response
  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to upload exportable: ${error}`)
    throw new Error(`Failed to upload exportable: ${error}`)
  }

  return response
}

export const callApiExportEnvironment = async () => {
  const { body: taxonomy } = await getTaxonomies({ 'where.main.eq': true })
  const url = `${baseUrl}/control-plane/taxonomies/${taxonomy[0].id}/export`

  const response = await fetch(url, {
    method: 'POST',
    headersTimeout: 5 * 60 * 1000,
    credentials: 'include'
  })
  const { status } = response

  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to download exportable: ${error}`)
    throw new Error(`Failed to download exportable: ${error}`)
  }

  return response
}

export const callApiGetApplicationHttpCache = async (appId, options) => {
  const { body: taxonomy } = await getTaxonomies({ 'where.main.eq': true })
  const url = `${baseUrl}/cache-manager/taxonomies/${taxonomy[0].id}/applications/${appId}/http-cache?`

  const response = await fetch(url + new URLSearchParams(options).toString(), {
    method: 'GET',
    credentials: 'include'
  })
  const { status } = response
  const json = await response.json()
  if (json.code === 'PLT_CACHE_MANAGER_CACHE_NOT_FOUND') {
    return {
      client: [],
      server: []
    }
  }
  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to get cached entries: ${error}`)
    throw new Error(`Failed to get cached entries: ${error}`)
  }
  return json
}

export const callApiGetApplicationHttpCacheDetail = async (appId, key, kind) => {
  const { body: taxonomy } = await getTaxonomies({ 'where.main.eq': true })
  const url = `${baseUrl}/cache-manager/taxonomies/${taxonomy[0].id}/applications/${appId}/http-cache/${key}?`
  const query = { kind }
  const response = await fetch(url + new URLSearchParams(query).toString(), {
    method: 'GET',
    credentials: 'include'
  })
  const { status } = response
  if (status !== 200) {
    const error = await response.json()
    console.error(`Failed to get cached entry detail: ${error}`)
    throw error
  }
  return await response.text()
}

export const callApiInvalidateApplicationHttpCache = async (appId, entries) => {
  const { body: taxonomy } = await getTaxonomies({ 'where.main.eq': true })
  const url = `${baseUrl}/cache-manager/taxonomies/${taxonomy[0].id}/applications/${appId}/http-cache/invalidate`
  const httpCacheIds = []
  const nextCacheIds = []
  entries.forEach((entry) => {
    switch (entry.kind) {
      case 'NEXT_CACHE_FETCH':
      case 'NEXT_CACHE_PAGE':
        nextCacheIds.push(entry.id)
        break

      case 'HTTP_CACHE':
        httpCacheIds.push(entry.id)
        break
    }
  })
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: getHeaders(),
    body: JSON.stringify({ httpCacheIds, nextCacheIds })
  })
  const { status } = response
  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to invalidate cache: ${error}`)
    throw new Error(`Failed to invalidate cache: ${error}`)
  }
  return true
}

export const callApiGetApplicationSettings = async (appId) => {
  const url = `${baseUrl}/control-plane/applicationSettings?` + new URLSearchParams({
    'where.applicationId.eq': appId
  }).toString()
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: getHeaders()
  })
  const { status } = response
  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to get application settings: ${error}`)
    throw new Error(`Failed to get application settings: ${error}`)
  }
  const json = await response.json()
  if (json.length === 1) {
    // empty services are returned as {} but the value needs to be an array
    // so we convert the empty object to empty array
    const output = json[0]
    if (!output.services || Object.keys(output.services).length === 0) {
      output.services = []
    }
    return output
  }
  return null
}

export const callApiUpdateApplicationSettings = async (appId, settings) => {
  if (!Array.isArray(settings.services)) {
    settings.services = Object.values(settings.services)
  }
  const url = `${baseUrl}/control-plane/applications/${appId}/settings`
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: getHeaders(),
    body: JSON.stringify({ ...settings })
  })
  const { status } = response
  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to set application settings: ${error}`)
    throw new Error(`Failed to set application settings: ${error}`)
  }
  return true
}

export const callApiDeployApplication = async (appId) => {
  const url = `${baseUrl}/control-plane/applications/${appId}/deploy`
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: getHeaders(),
    body: JSON.stringify({})
  })
  const { status } = response
  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to deploy application: ${error}`)
    throw new Error(`Failed to deploy application: ${error}`)
  }
  return true
}

/* CACHE METRICS */
export const getCacheStatsForApplication = async (applicationId) => {
  const { body: taxonomy } = await getTaxonomies({ 'where.main.eq': true })
  const res = await fetch(`${baseUrl}/metrics/cache/taxonomies/${taxonomy[0].id}/apps/${applicationId}`, {
    method: 'GET',
    headers: getHeaders()
  })
  return res.json()
}

export const getCacheStats = async () => {
  const { body: taxonomy } = await getTaxonomies({ 'where.main.eq': true })
  const res = await fetch(`${baseUrl}/metrics/cache/taxonomies/${taxonomy[0].id}`, {
    method: 'GET',
    headers: getHeaders()
  })
  return res.json()
}

export const callApiGetCacheDependents = async (appId, cacheEntryId) => {
  const { body: taxonomy } = await getTaxonomies({ 'where.main.eq': true })
  const url = `${baseUrl}/cache-manager/taxonomies/${taxonomy[0].id}/applications/${appId}/http-cache/${cacheEntryId}/dependents`

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include'
  })
  const { status } = response
  const json = await response.json()
  if (json.code === 'PLT_CACHE_MANAGER_CACHE_NOT_FOUND') {
    return {
      client: [],
      server: []
    }
  }
  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to get http cache dependents: ${error}`)
    throw new Error(`Failed to get http cache dependents : ${error}`)
  }
  return json.dependents
}

export const callApiGetCacheTraces = async (cacheEntryId) => {
  const { body: taxonomy } = await getTaxonomies({ 'where.main.eq': true })
  const taxonomyId = taxonomy[0].id

  const query = { taxonomyId }
  const url = `${baseUrl}/risk-service/http-cache/${cacheEntryId}/traces`
  const response = await fetch(`${url}?${new URLSearchParams(query).toString()}`, {
    method: 'GET',
    credentials: 'include'
  })
  const { status } = response
  const json = await response.json()
  if (json.code === 'PLT_CACHE_MANAGER_CACHE_NOT_FOUND') {
    return {
      client: [],
      server: []
    }
  }
  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to get http cache traces: ${error}`)
    throw new Error(`Failed to get http cache traces : ${error}`)
  }
  return json
}

// SYNCH

export const callApiGetSyncConfig = async () => {
  const response = await fetch(`${baseUrl}/risk-cold-storage/sync/config`, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`Failed to get synch config: ${error}`)
    throw new Error(`Failed to get synch config: ${error}`)
  }

  return await response.json()
}

export const callApiGetSync = async () => {
  const response = await fetch(`${baseUrl}/risk-cold-storage/sync`, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`Failed to get synch config: ${error}`)
    throw new Error(`Failed to get synch config: ${error}`)
  }
}

const toArray = obj => Array.isArray(obj) ? obj : [...Object.values(obj)]

export const callApiGetSyncExports = async (filters = { limit: 10, offset: 0 }) => {
  const whereCond = `&where.isExport.eq=true&orderby.synchedAt=${DESC}`
  const url =
    `${baseUrl}/risk-cold-storage/importsExports?limit=${filters.limit}&offset=${filters.offset}&totalCount=true&${whereCond}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })

  const exports = await response.json()
  const totalCount = response.headers.get('X-Total-Count')

  const data = exports.map((item) => {
    let status = item.success ? 'SUCCESS' : 'ERROR'
    if (item.discarded) {
      status = 'DISCARDED'
    }
    return {
      ...item,
      status,
      logs: toArray(item.logs)
    }
  })
  return { data, totalCount }
}

export const callApiGetSyncImports = async (filters = { limit: 10, offset: 0 }) => {
  const whereCond = `&where.isExport.eq=false&orderby.synchedAt=${DESC}`
  const url =
    `${baseUrl}/risk-cold-storage/importsExports?limit=${filters.limit}&offset=${filters.offset}&totalCount=true&${whereCond}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })

  const imports = await response.json()
  const totalCount = response.headers.get('X-Total-Count')

  const data = imports.map((item) => {
    let status = item.success ? 'SUCCESS' : 'ERROR'
    if (item.discarded) {
      status = 'DISCARDED'
    }
    return {
      ...item,
      status,
      logs: toArray(item.logs)
    }
  })
  return { data, totalCount }
}

export const callApiGetSyncAvailableImports = async () => {
  const url = `${baseUrl}/risk-cold-storage/sync/available?orderBy.fileName=${DESC}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })
  let data = await response.json()
  if (!data || !Array.isArray(data)) {
    data = []
  }
  const imports = data.map((item) => {
    return {
      synchedAt: item.fileName.split('.zip')[0],
      ...item
    }
  })
  return { data: imports }
}

export const downloadSynchZip = async (fileName) => {
  return fetch(`${baseUrl}/risk-cold-storage/download/${fileName}`, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })
}
