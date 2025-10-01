import {
  getGenerations,
  getDeployments,
  getApplicationStates,
  getApplications,
  setBaseUrl as setBaseUrlControlPlane,
  getApplicationById,
  getApplicationStatesForApplication,
  getApplicationResources,
  getGenerationGraph
} from '../clients/control-plane/control-plane.mjs'

import {
  setBaseUrl as setBaseUrlCompendium
} from '../clients/compendium/compendium.mjs'

import {
  setBaseUrl as setBaseURiskManager
} from '../clients/risk-manager/risk-manager.mjs'

import {
  getReports,
  setBaseUrl as setBaseURLCompliance
} from '../clients/compliance/compliance.mjs'

import { getLinksForTaxonomyGraph } from './utilities/taxonomy'

import extractScalingEvents from './utilities/extract-scaling-events'

import { sortCollection, sortCollectionByDate } from './utilitySorting'

import callApi from './api/common'
import { getScalingHistorySummary } from './api/autoscaler'
const baseUrl = `${import.meta.env.VITE_API_BASE_URL}`
const baseApiUrl = `${baseUrl}/api`
setBaseUrlControlPlane(`${baseUrl}/control-plane`)
setBaseUrlCompendium(`${baseUrl}/compendium`)
setBaseURiskManager(`${baseUrl}/risk-manager`)
setBaseURLCompliance(`${baseUrl}/compliance`)

// TODO: remove these mocks
// These are function that have been removed from the control-plane client

async function getApplicationsIdScaler () {}

const getHeaders = () => {
  const headers = {
    'content-type': 'application/json'
  }
  return headers
}

const DESC = 'desc'

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
  const { body: applications } = await getApplications({})
  if (applications.length === 0) return []
  const applicationsWithMetadata = applications.map(
    application => ({
      ...application,
      state: {},
      url: null,
      isDeployed: true
    })
  )
  for (let i = 0; i < applications.length; i++) {
    const currentApplication = applications[i]
    const { body: applicationState } = await getApplicationStatesForApplication({
      id: currentApplication.id
    })
    if (applicationState.length > 0) {
      applicationsWithMetadata[i].state = applicationState[0].state
      applicationsWithMetadata[i].pltVersion = applicationState[0].pltVersion
    }
  }
  return applicationsWithMetadata
}

export const getApiApplication = async (id) => {
  let lastUpdated = null
  let lastStarted = null
  let pltVersion = null
  let latestDeployment = {}
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
    'orderby.createdAt': DESC,
    limit: 1
  })

  if (deployments.length > 0) {
    lastStarted = deployments[0].createdAt
    latestDeployment = deployments[0]
  }

  const { body: deploymentsOnMainTaxonomy } = await getDeployments({
    'where.applicationId.eq': id,
    'where.status.neq': 'failed',
    'orderby.createdAt': DESC,
    limit: 1
  })

  const response = await fetch((`${baseApiUrl}/events?` + new URLSearchParams({
    applicationId: id,
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

export const getApiMetricsPod = async (applicationId, podId, radix) => {
  let url = `${baseUrl}/metrics/apps/${applicationId}/pods/${podId}`
  if (radix) {
    url += `/${radix}`
  }
  return fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })
}

export const getApiMetricsPodPerService = async (applicationId, podId, serviceId, radix) => {
  let url = `${baseUrl}/metrics/apps/${applicationId}/pods/${podId}/services/${serviceId}`
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
  const { pods } = await getApiApplicationK8sState(applicationId)
  const scaleConfig = await getApiApplicationScaleConfig(applicationId)

  const url = `${baseUrl}/metrics/kubernetes/apps/${applicationId}`
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders()
  })

  if (!response.ok) {
    throw new Error('Unable to get kubernetes metrics')
  }

  const k8sMetrics = await response.json()
  return {
    ...k8sMetrics,
    pods: {
      current: pods.length,
      max: scaleConfig.maxPods
    }
  }
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
export const getApiActivities = async (applicationId, filters = { limit: 10, offset: 0, search: '', userId: '', event: '' }) => {
  let url = `${baseApiUrl}/events?limit=${filters.limit}&offset=${filters.offset}`
  if (applicationId) {
    url += `&applicationId=${applicationId}`
  }
  if ((filters?.search ?? '') !== '') url += `&search=${filters.search}`
  if ((filters?.userId ?? '') !== '') url += `&userId=${filters.userId}`
  if ((filters?.event ?? '') !== '') url += `&event=${filters.event}`
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })
  const totalCount = response.headers.get('X-Total-Count')

  const activities = await response.json()
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

  const { headers, body: deployments } = await getDeployments(queryObject)

  return { deployments, totalCount: headers['x-total-count'] }
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

/* TAXONOMY */

export const getApiMainTaxonomyGraph = async (generationId) => {
  const { body: graph } = await getGenerationGraph({ generationId })

  const { applications, links } = graph

  return {
    applications,
    links: getLinksForTaxonomyGraph(links, applications)
  }
}

export const getApiTaxonomyGenerations = async (options = {}) => {
  const { body: generations } = await getGenerations()
  return sortCollectionByDate(generations, 'createdAt', false)
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

/* INSTANCES */
export const getApiApplicationK8sState = async (applicationId) => {
  return callApi('control-plane', `/applications/${applicationId}/k8s/state`, 'GET')
}

export const getApiApplicationScaleConfig = async (applicationId) => {
  return callApi('scaler', `/applications/${applicationId}/scale-configs`, 'GET')
}

/* PODS */
export const getApiPods = async (applicationId) => {
  const { pods } = await callApi('control-plane', `/applications/${applicationId}/k8s/state`, 'GET')
  const output = await Promise.all(pods.map(async (pod) => {
    const [dataMem, dataCpu] = await Promise.all([
      getApiMetricsPod(applicationId, pod.id, 'mem'),
      getApiMetricsPod(applicationId, pod.id, 'cpu')
    ])

    const dataValuesMem = await dataMem.json()
    const dataValuesCpu = await dataCpu.json()
    return {
      id: pod.id,
      dataValues: { ...dataValuesMem, ...dataValuesCpu },
      status: pod.status.toLowerCase()
    }
  }))
  return output
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
  return await getReports({
    'where.applicationId.eq': applicationId,
    'orderby.createdAt': DESC,
    limit: 1
  })
}

/* AUTOSCALER */
export const getApiMetricsReplicaSetOverview = async (applicationId) => {
  const { pods } = await getApiApplicationK8sState(applicationId)
  const scaleConfig = await getApiApplicationScaleConfig(applicationId)
  const scalingSummary = await getScalingHistorySummary(applicationId)

  return {
    pods: pods.length,
    minPods: scaleConfig.minPods,
    maxPods: scaleConfig.maxPods,
    countScaleUp: scalingSummary.up,
    countScaleDown: scalingSummary.down,
    latestScaleUp: scalingSummary.latestUp,
    latestScaleDown: scalingSummary.latestDown
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

export const callApiGetApplicationHttpCache = async (appId, options) => {
  const url = `${baseUrl}/cache-manager/applications/${appId}/http-cache?`

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
  const url = `${baseUrl}/cache-manager/applications/${appId}/http-cache/${key}?`
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
  const url = `${baseUrl}/cache-manager/applications/${appId}/http-cache/invalidate`
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

export const callApiGetApplicationsConfigs = async (appId) => {
  const { body: applicationResources, statusCode } = await getApplicationResources({ id: appId })
  if (statusCode !== 200) {
    const error = await applicationResources
    console.error(`Failed to get applications configs: ${error}`)
    throw new Error(`Failed to get applications configs: ${error}`)
  }
  const output = applicationResources
  if (!output.services || Object.keys(output.services).length === 0) {
    output.services = []
  }
  return output
}

export const callApiUpdateApplicationConfigs = async (appId, configs) => {
  if (!Array.isArray(configs.services)) {
    configs.services = Object.values(configs.services)
  }
  const url = `${baseUrl}/control-plane/applications/${appId}/resources`
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: getHeaders(),
    body: JSON.stringify({
      ...configs
    })
  })
  const { status } = response
  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to set application configs: ${error}`)
    throw new Error(`Failed to set application configs: ${error}`)
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
  const res = await fetch(`${baseUrl}/metrics/cache/apps/${applicationId}`, {
    method: 'GET',
    headers: getHeaders()
  })
  return res.json()
}

export const getCacheStats = async () => {
  const res = await fetch(`${baseUrl}/metrics/cache`, {
    method: 'GET',
    headers: getHeaders()
  })
  return res.json()
}

export const callApiGetCacheDependents = async (appId, cacheEntryId) => {
  const url = `${baseUrl}/cache-manager/applications/${appId}/http-cache/${cacheEntryId}/dependents`

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
  const url = `${baseUrl}/risk-service/http-cache/${cacheEntryId}/traces`
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
  const url = `${baseUrl}/risk-cold-storage/sync/available?orderby.fileName=${DESC}`

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
